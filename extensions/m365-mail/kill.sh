#!/bin/zsh
if [ -f .dev.pid ]; then
  kill $(cat .dev.pid) 2>/dev/null && echo "Dev server stopped" || echo "Process not running"
  rm .dev.pid
else
  echo "No PID file found"
fi
