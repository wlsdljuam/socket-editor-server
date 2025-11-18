const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS 설정
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 방별 사용자 관리
const rooms = {};

io.on('connection', (socket) => {
    console.log('새로운 사용자 연결:', socket.id);

    // 방 참여
    socket.on('join-room', (data) => {
        const { room, user } = data;

        socket.join(room);
        socket.room = room;
        socket.username = user;

        // 방에 사용자 추가
        if (!rooms[room]) {
            rooms[room] = [];
        }
        rooms[room].push(user);

        console.log(`${user}님이 ${room} 방에 입장`);

        // 방의 모든 사용자에게 업데이트된 사용자 목록 전송
        io.to(room).emit('users-update', rooms[room]);
    });

    // 에디터 내용 변경
    socket.on('content-change', (data) => {
        const { room, html, user } = data;

        // 같은 방의 다른 사용자들에게 전송
        socket.to(room).emit('content-change', {
            html: html,
            user: user
        });
    });

    // 연결 해제
    socket.on('disconnect', () => {
        console.log('사용자 연결 해제:', socket.id);

        const room = socket.room;
        const username = socket.username;

        if (room && rooms[room]) {
            // 방에서 사용자 제거
            rooms[room] = rooms[room].filter(u => u !== username);

            // 방이 비었으면 삭제
            if (rooms[room].length === 0) {
                delete rooms[room];
            } else {
                // 남은 사용자들에게 업데이트 전송
                io.to(room).emit('users-update', rooms[room]);
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Socket.io 서버가 ${PORT} 포트에서 실행 중입니다.`);
});