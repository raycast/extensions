#!/bin/bash

# play-rtsp.sh - A script to play RTSP streams from Nest cameras using FFplay
# This script is designed to be called from the Nest Camera Raycast extension

# Enable debug output
set -x

# Check if URL is provided
if [ -z "$1" ]; then
  echo "Error: No RTSP URL provided"
  echo "Usage: $0 <rtsp_url> [camera_name]"
  exit 1
fi

# Store URL in a file to avoid command line length issues
RTSP_URL="$1"
URL_FILE=$(mktemp)
echo "$RTSP_URL" > "$URL_FILE"

CAMERA_NAME="${2:-Nest Camera}"
WINDOW_TITLE="Nest Camera: $CAMERA_NAME"

# Common paths for FFplay on macOS
FFPLAY_PATHS=(
  "/opt/homebrew/bin/ffplay"
  "/usr/local/bin/ffplay"
  "/usr/bin/ffplay"
  "$(which ffplay 2>/dev/null)"
)

# Find FFplay
FFPLAY_PATH=""
for path in "${FFPLAY_PATHS[@]}"; do
  if [ -x "$path" ]; then
    FFPLAY_PATH="$path"
    break
  fi
done

# Check if ffplay is found
if [ -z "$FFPLAY_PATH" ]; then
  echo "Error: ffplay not found. Please install FFmpeg."
  osascript -e "display notification \"FFplay not found. Please install FFmpeg using 'brew install ffmpeg'.\" with title \"Nest Camera Error\""
  rm -f "$URL_FILE"
  exit 1
fi

echo "Using FFplay at: $FFPLAY_PATH"
echo "Starting FFplay with RTSP URL: $RTSP_URL"
echo "Camera: $CAMERA_NAME"

# Set window size and position
# Using more conservative values that should work on most displays
WINDOW_WIDTH=640
WINDOW_HEIGHT=480

# Position in the top-right corner but with safer values
# Get screen dimensions using AppleScript
SCREEN_INFO=$(osascript -e 'tell application "Finder" to get bounds of window of desktop')
SCREEN_WIDTH=$(echo $SCREEN_INFO | awk '{print $3}')
SCREEN_HEIGHT=$(echo $SCREEN_INFO | awk '{print $4}')

# Calculate position to be visible on most screens
# Position window in the top-right corner with a 20px margin
if [ -n "$SCREEN_WIDTH" ] && [ -n "$SCREEN_HEIGHT" ]; then
  X_POSITION=$((SCREEN_WIDTH - WINDOW_WIDTH - 20))
  Y_POSITION=40
else
  # Fallback to safe values if screen dimensions can't be determined
  X_POSITION=800
  Y_POSITION=40
fi

echo "Screen dimensions: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}"
echo "Window position: ${X_POSITION},${Y_POSITION}"

# Create a temporary AppleScript to set the process name
APPLESCRIPT_FILE=$(mktemp)
cat > "$APPLESCRIPT_FILE" << EOF
tell application "System Events"
  tell process "ffplay"
    set frontmost to true
    set name to "Nest Camera"
    delay 0.5
    set position of window 1 to {$X_POSITION, $Y_POSITION}
    set frontmost to true
  end tell
end tell
EOF

# Launch FFplay with optimal parameters
"$FFPLAY_PATH" \
  -fflags nobuffer \
  -flags low_delay \
  -rtsp_transport tcp \
  -vf "setpts=PTS-STARTPTS" \
  -af "aresample=async=1" \
  -window_title "$WINDOW_TITLE" \
  -loglevel warning \
  -x $WINDOW_WIDTH -y $WINDOW_HEIGHT \
  -volume 100 \
  -stats \
  -ast 0 \
  -i "$(cat "$URL_FILE")" \
  2>&1 | grep -v "deprecated" &

# Get the PID of the FFplay process
FFPLAY_PID=$!

# Wait a moment for FFplay to start
sleep 2

# Run the AppleScript to set the process name and position
osascript "$APPLESCRIPT_FILE"

# Wait for FFplay to exit
wait $FFPLAY_PID

# Get the exit code
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "Error: FFplay exited with code $EXIT_CODE"
  osascript -e "display notification \"FFplay failed to play the stream. Exit code: $EXIT_CODE\" with title \"Nest Camera Error\""
  rm -f "$URL_FILE" "$APPLESCRIPT_FILE"
  exit $EXIT_CODE
fi

# Clean up
rm -f "$URL_FILE" "$APPLESCRIPT_FILE"
exit 0 