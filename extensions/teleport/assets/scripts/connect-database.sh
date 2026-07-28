#!/bin/bash

PORT=10000

for ((port=10000; port<=65535; port++)); do
  (echo >/dev/tcp/localhost/$port) &>/dev/null && continue || { echo "$port is available"; PORT=$port; break; }
done

WINDOW_MODE="${5:-isolated}"
ENVIRONMENT="$6"
STATUS_COLOR="$7"

# The environment tag and its color are only added when set; by default a
# connection opens with no environment tag.
QUERY="name=$1&safeModeLevel=2&advancedSafeModeLevel=1&windowMode=${WINDOW_MODE}"
if [ -n "$ENVIRONMENT" ]; then
  QUERY="${QUERY}&environment=${ENVIRONMENT}"
fi
if [ -n "$STATUS_COLOR" ]; then
  QUERY="${QUERY}&statusColor=${STATUS_COLOR}"
fi

tsh proxy db --port ${PORT} --tunnel $1 --db-user=$2 --db-name=$4 &
sleep 5
open "$3://$2@127.0.0.1:${PORT}/$4?${QUERY}"
