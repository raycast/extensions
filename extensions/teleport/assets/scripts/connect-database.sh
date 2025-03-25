#!/bin/bash

PORT=10000

for ((port=10000; port<=65535; port++)); do
  (echo >/dev/tcp/localhost/$port) &>/dev/null && continue || { echo "$port is available"; PORT=$port; break; }
done

tsh proxy db --port ${PORT} --tunnel $1 --db-user=$2 --db-name=$4 &
sleep 5
open "$3://$2@127.0.0.1:${PORT}/$4?environment=production&name=$1&statusColor=6D0000&safeModeLevel=2&advancedSafeModeLevel=1"
