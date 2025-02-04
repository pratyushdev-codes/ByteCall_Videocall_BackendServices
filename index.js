import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userName }) => {
    // Leave previous room if any
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join new room
    socket.join(roomId);
    
    // Store user info
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(socket.id, { userName });

    // Notify other users in the room
    socket.to(roomId).emit('user-connected', {
      userId: socket.id,
      userName
    });

    console.log(`${userName} joined room ${roomId}`);
  });

  socket.on('offer', ({ offer, roomId, userName }) => {
    console.log(`Offer from ${userName} in room ${roomId}`);
    socket.to(roomId).emit('offer', {
      offer,
      from: socket.id,
      userName
    });
  });

  socket.on('answer', ({ answer, roomId, userName, to }) => {
    console.log(`Answer from ${userName} to ${to} in room ${roomId}`);
    socket.to(roomId).emit('answer', {
      answer,
      from: socket.id,
      userName
    });
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    console.log(`ICE candidate in room ${roomId}`);
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  socket.on('disconnect', () => {
    // Remove user from all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});