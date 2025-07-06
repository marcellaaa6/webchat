const express = require('express');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfigurasi session
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

let usersOnline = {};

// Endpoint login
app.post('/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send("Username diperlukan");

  req.session.username = username;
  res.redirect('/');
});

// Endpoint logout
app.get('/logout', (req, res) => {
  const username = req.session.username;
  if (username) {
    delete usersOnline[username];
    io.emit("chat message", `${username} telah keluar`);
    io.emit("user list", Object.keys(usersOnline));
  }
  req.session.destroy();
  res.redirect('/');
});

// Middleware untuk menyimpan session di socket
io.use((socket, next) => {
  let username = socket.handshake.auth.username;
  if (!username) return next(new Error("Username tidak ada"));
  socket.username = username;
  next();
});

// Koneksi socket
io.on('connection', (socket) => {
  const username = socket.username;
  usersOnline[username] = socket.id;

  console.log(`${username} connected`);
  io.emit("chat message", `${username} telah bergabung`);
  io.emit("user list", Object.keys(usersOnline));

  socket.on("chat message", (msg) => {
    io.emit("chat message", `${username}: ${msg}`);
  });

  socket.on("disconnect", () => {
    delete usersOnline[username];
    console.log(`${username} disconnected`);
    io.emit("chat message", `${username} telah keluar`);
    io.emit("user list", Object.keys(usersOnline));
  });
});

server.listen(3000, () => {
  console.log('Server berjalan di http://localhost:3000');
});
