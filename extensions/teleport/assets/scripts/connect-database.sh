#!/bin/bash

PORT=10000

for ((port=10000; port<=65535; port++)); do
  (echo >/dev/tcp/localhost/$port) &>/dev/null && continue || { echo "$port is available"; PORT=$port; break; }
done

WINDOW_MODE="${5:-isolated}"
ENVIRONMENT="$6"
# Default to a red status bar when no environment is set, so an untagged
# connection is visually flagged rather than showing the client's default color.
STATUS_COLOR="${7:-660000}"

QUERY="name=$1&safeModeLevel=2&advancedSafeModeLevel=1&windowMode=${WINDOW_MODE}&statusColor=${STATUS_COLOR}"
# `env` is the documented TablePlus URL parameter for the environment tag; only
# added when the connection is tagged (no tag label by default).
if [ -n "$ENVIRONMENT" ]; then
  QUERY="${QUERY}&env=${ENVIRONMENT}"
fi

tsh proxy db --port ${PORT} --tunnel $1 --db-user=$2 --db-name=$4 &
sleep 5
open "$3://$2@127.0.0.1:${PORT}/$4?${QUERY}"
