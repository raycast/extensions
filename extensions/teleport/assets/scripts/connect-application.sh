#!/bin/bash

PORT=10000

for ((port=10000; port<=65535; port++)); do
  (echo >/dev/tcp/localhost/$port) &>/dev/null && continue || { echo "$port is available"; PORT=$port; break; }
done

tsh proxy app --port ${PORT} $1 &
sleep 5
open "http://127.0.0.1:${PORT}"