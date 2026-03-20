#!/bin/zsh
nohup npm run dev > dev.log 2>&1 &
echo "Dev server started (PID $!)"
echo $! > .dev.pid
