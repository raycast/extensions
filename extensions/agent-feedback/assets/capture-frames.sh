#!/bin/sh

recorder_pid="$1"
destination="$2"
display="$3"
elapsed_ms=1000

recorder_is_running() {
  status=$(/bin/ps -p "$recorder_pid" -o stat= 2>/dev/null)
  [ -n "$status" ] && [ "${status#Z}" = "$status" ]
}

sleep 1
while recorder_is_running; do
  /usr/sbin/screencapture -x -C "-D${display}" "${destination}/frame-${elapsed_ms}.png"
  sleep 5
  elapsed_ms=$((elapsed_ms + 5000))
done
