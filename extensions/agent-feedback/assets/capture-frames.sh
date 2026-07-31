#!/bin/sh

recorder_pid="$1"
destination="$2"
display="$3"
elapsed_ms=1000

sleep 1
while kill -0 "$recorder_pid" 2>/dev/null; do
  /usr/sbin/screencapture -x -C "-D${display}" "${destination}/frame-${elapsed_ms}.png"
  sleep 5
  elapsed_ms=$((elapsed_ms + 5000))
done
