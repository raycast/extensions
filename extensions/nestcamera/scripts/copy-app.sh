#!/bin/bash

# copy-app.sh - Script to copy the Nest Camera Viewer app to the assets directory

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Source and destination paths
SOURCE_APP="$PROJECT_DIR/dist/Nest Camera Viewer.app"
DEST_DIR="$PROJECT_DIR/assets/app"

# Check if the app exists
if [ ! -d "$SOURCE_APP" ]; then
  echo "Error: App not found at $SOURCE_APP"
  echo "Please create the app using Platypus first."
  exit 1
fi

# Create the destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy the app to the assets directory
echo "Copying app to assets directory..."
cp -R "$SOURCE_APP" "$DEST_DIR/"

echo "App copied successfully to $DEST_DIR"
exit 0 