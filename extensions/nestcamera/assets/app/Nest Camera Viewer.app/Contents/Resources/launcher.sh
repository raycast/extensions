#!/bin/bash

# This script ensures FFplay doesn't show in the dock
# It's called by the Platypus app

# Set environment variables to help hide FFplay
export DISPLAY_IN_DOCK=0
export LSUIElement=1
export LSBackgroundOnly=1

# Get the path to the original script
SCRIPT_PATH="$0"
if [ "$SCRIPT_PATH" == "launcher.sh" ]; then
    SCRIPT_PATH="$(dirname "$0")/script"
fi

# Execute the original script with all arguments
exec "$SCRIPT_PATH" "$@"
