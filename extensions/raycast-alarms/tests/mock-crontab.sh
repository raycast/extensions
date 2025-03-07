#!/bin/bash

# Mock implementation of crontab for testing
# This script intercepts crontab calls and simulates them without affecting the real crontab

# Mock crontab file
MOCK_CRONTAB_FILE="/tmp/raycast-alarms-test/mock-crontab"

# Initialize mock crontab if it doesn't exist
if [ ! -f "$MOCK_CRONTAB_FILE" ]; then
  touch "$MOCK_CRONTAB_FILE"
fi

# Function to extract crontab command from arguments
extract_crontab_command() {
  local args="$@"
  
  if [[ "$args" == *"-l"* ]]; then
    echo "list"
  elif [[ "$args" == *"-r"* ]]; then
    echo "remove"
  else
    echo "install"
  fi
}

# Get command from arguments
command=$(extract_crontab_command "$@")

case "$command" in
  "list")
    # List mock crontab
    cat "$MOCK_CRONTAB_FILE"
    ;;
  "remove")
    # Remove mock crontab
    rm -f "$MOCK_CRONTAB_FILE"
    touch "$MOCK_CRONTAB_FILE"
    ;;
  "install")
    # Install from stdin to mock crontab
    cat > "$MOCK_CRONTAB_FILE"
    ;;
  *)
    echo "Unknown crontab command"
    exit 1
    ;;
esac

exit 0 