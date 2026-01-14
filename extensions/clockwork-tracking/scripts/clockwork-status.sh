#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Clockwork Status
# @raycast.mode inline
# @raycast.refreshTime 30s

# Optional parameters:
# @raycast.icon clock

# Documentation:
# @raycast.description Shows current Clockwork time tracking status
# @raycast.author HouseinIsProgramming
# @raycast.authorURL https://raycast.com/gogoisprograming

STATE_FILE="$HOME/.clockwork-tracking/state.json"

if [ ! -f "$STATE_FILE" ]; then
  echo "No tracking data"
  exit 0
fi

# Read state file
IS_TRACKING=$(cat "$STATE_FILE" | grep -o '"isTracking":[^,}]*' | cut -d':' -f2)
ISSUE_KEY=$(cat "$STATE_FILE" | grep -o '"issueKey":"[^"]*"' | cut -d'"' -f4)
STARTED_AT=$(cat "$STATE_FILE" | grep -o '"startedAt":"[^"]*"' | cut -d'"' -f4)

if [ "$IS_TRACKING" = "true" ] && [ -n "$ISSUE_KEY" ] && [ "$ISSUE_KEY" != "null" ]; then
  # Calculate elapsed time
  if [ -n "$STARTED_AT" ] && [ "$STARTED_AT" != "null" ]; then
    START_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${STARTED_AT:0:19}" "+%s" 2>/dev/null)
    NOW_EPOCH=$(date "+%s")

    if [ -n "$START_EPOCH" ]; then
      ELAPSED=$((NOW_EPOCH - START_EPOCH))
      HOURS=$((ELAPSED / 3600))
      MINUTES=$(((ELAPSED % 3600) / 60))

      if [ $HOURS -gt 0 ]; then
        TIME="${HOURS}h ${MINUTES}m"
      else
        TIME="${MINUTES}m"
      fi
    else
      TIME="..."
    fi
  else
    TIME="..."
  fi

  # Green text for active
  echo -e "\033[1;32m$ISSUE_KEY - $TIME\033[0m"
else
  # Gray text for inactive
  echo -e "\033[1;90mNo active timer\033[0m"
fi
