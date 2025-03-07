#!/bin/bash

# nest-player.sh - A script to play RTSP streams from Nest cameras using FFplay
# This script is designed to be called directly from the Raycast extension

# Enable debug output
set -x

# Create a log file for debugging
LOG_DIR="$HOME/Library/Logs/NestCameraViewer"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/nest-player-$(date +%Y%m%d-%H%M%S).log"
echo "Nest Camera Viewer log started at $(date)" > "$LOG_FILE"

# Function to log messages
function log_message() {
  echo "[$(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

# Function to log errors
function log_error() {
  echo "[$(date +%H:%M:%S)] ERROR: $1" | tee -a "$LOG_FILE"
  # Also show a notification for critical errors
  osascript -e "display notification \"$1\" with title \"Nest Camera Error\"" &
}

log_message "Starting Nest Camera Viewer"

# Check if URL is provided as the first argument
if [ -z "$1" ]; then
  log_error "No RTSP URL provided"
  exit 1
fi

# Store URL in a variable
RTSP_URL="$1"
log_message "RTSP URL: $RTSP_URL"

CAMERA_NAME="${2:-Nest Camera}"
WINDOW_TITLE="Nest Camera: $CAMERA_NAME"
log_message "Camera name: $CAMERA_NAME"

# Show a loading dialog that will stay on screen
# Run it in the background so it doesn't block the script
LOADING_SCRIPT=$(mktemp)
cat > "$LOADING_SCRIPT" << EOF
#!/usr/bin/osascript

on run
  tell application "System Events"
    display dialog "Loading video stream for $CAMERA_NAME...\n\nThis may take up to 20 seconds depending on your network connection." with title "Nest Camera Viewer" buttons {"Close"} default button "Close" giving up after 30 with icon caution
  end tell
end run
EOF

chmod +x "$LOADING_SCRIPT"
log_message "Created loading dialog script at $LOADING_SCRIPT"

# Run the loading dialog in the background and capture its PID
osascript "$LOADING_SCRIPT" &
LOADING_DIALOG_PID=$!
log_message "Loading dialog started with PID $LOADING_DIALOG_PID"

# Function to close the loading dialog
function close_loading_dialog() {
  if [ -n "$LOADING_DIALOG_PID" ]; then
    log_message "Closing loading dialog (PID: $LOADING_DIALOG_PID)"
    # Try to kill the dialog process
    kill -9 $LOADING_DIALOG_PID 2>/dev/null || log_message "Failed to kill dialog process"
    
    # Also try to close any open dialogs using AppleScript
    osascript -e 'tell application "System Events" to if exists (processes where name is "System Events") then tell process "System Events" to if exists (windows where name is "Nest Camera Viewer") then click button "Close" of window "Nest Camera Viewer"' &
  else
    log_message "No loading dialog PID found to close"
  fi
}

# Common paths for FFplay on macOS
FFPLAY_PATHS=(
  "/opt/homebrew/bin/ffplay"
  "/usr/local/bin/ffplay"
  "/usr/bin/ffplay"
  "$(which ffplay 2>/dev/null)"
)

# Parse command line arguments
RTSP_URL=""
CAMERA_NAME="Nest Camera"
CUSTOM_FFPLAY_PATH=""

for arg in "$@"; do
  if [[ $arg == --ffplay-path=* ]]; then
    CUSTOM_FFPLAY_PATH="${arg#*=}"
    log_message "Using provided FFplay path: $CUSTOM_FFPLAY_PATH"
  elif [[ $arg == --check-ffplay ]]; then
    RTSP_URL="--check-ffplay"
  elif [[ -z "$RTSP_URL" ]]; then
    RTSP_URL="$arg"
  elif [[ -z "$CAMERA_NAME" || "$CAMERA_NAME" == "Nest Camera" ]]; then
    CAMERA_NAME="$arg"
  fi
done

# Find FFplay
FFPLAY_PATH=""

# First check the custom path if provided
if [[ -n "$CUSTOM_FFPLAY_PATH" && -x "$CUSTOM_FFPLAY_PATH" ]]; then
  FFPLAY_PATH="$CUSTOM_FFPLAY_PATH"
  log_message "Using provided FFplay at: $FFPLAY_PATH"
else
  # Otherwise check common paths
  for path in "${FFPLAY_PATHS[@]}"; do
    if [ -x "$path" ]; then
      FFPLAY_PATH="$path"
      log_message "Found FFplay at: $FFPLAY_PATH"
      break
    fi
  done
fi

# Check if ffplay is found
if [ -z "$FFPLAY_PATH" ]; then
  log_error "FFplay not found. Please install FFmpeg using 'brew install ffmpeg'"
  close_loading_dialog
  osascript -e "display notification \"FFplay not found. Please install FFmpeg using 'brew install ffmpeg'.\" with title \"Nest Camera Error\""
  rm -f "$LOADING_SCRIPT"
  exit 1
fi

log_message "Using FFplay at: $FFPLAY_PATH"
log_message "Starting FFplay with RTSP URL: $RTSP_URL"
log_message "Camera: $CAMERA_NAME"

# Set window size and position
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
  log_message "Screen dimensions: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}"
else
  # Fallback to safe values if screen dimensions can't be determined
  X_POSITION=800
  Y_POSITION=40
  log_message "Could not determine screen dimensions, using default position"
fi

log_message "Window position: ${X_POSITION},${Y_POSITION}"

# Launch FFplay with optimized parameters for RTSP streaming
log_message "Launching FFplay..."

# Launch FFplay with the noborder flag and other optimizations
"$FFPLAY_PATH" \
  -fflags nobuffer \
  -flags low_delay \
  -rtsp_transport tcp \
  -vf "setpts=PTS-STARTPTS" \
  -af "aresample=async=1" \
  -window_title "$WINDOW_TITLE" \
  -loglevel warning \
  -x $WINDOW_WIDTH -y $WINDOW_HEIGHT \
  -noborder \
  -volume 100 \
  -stats \
  -ast 0 \
  -i "$RTSP_URL" \
  2>&1 | tee -a "$LOG_FILE" | grep -v "deprecated" &

FFPLAY_PID=$!
log_message "FFplay launched with PID $FFPLAY_PID"

# Wait for FFplay to start and become visible (give it a few seconds)
log_message "Waiting for FFplay to initialize (5 seconds)..."
sleep 5

# Position the FFplay window using AppleScript
osascript -e "
tell application \"System Events\"
  if exists (processes where name contains \"ffplay\") then
    tell process \"ffplay\"
      try
        set position of window 1 to {$X_POSITION, $Y_POSITION}
        log \"Positioned FFplay window at $X_POSITION, $Y_POSITION\"
      on error errorMessage
        log \"Failed to position window: \" & errorMessage
      end try
    end tell
  end if
end tell
" >> "$LOG_FILE" 2>&1

# Close the loading dialog once FFplay is running
close_loading_dialog

# Wait for FFplay to exit
log_message "Waiting for FFplay to exit..."
wait $FFPLAY_PID

# Get the exit code
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  log_error "FFplay exited with error code $EXIT_CODE"
  osascript -e "display notification \"FFplay may have failed to play the stream (exit code: $EXIT_CODE).\" with title \"Nest Camera Error\""
  rm -f "$LOADING_SCRIPT"
  exit $EXIT_CODE
fi

log_message "FFplay exited normally"

# Clean up
log_message "Cleaning up temporary files"
rm -f "$LOADING_SCRIPT"

log_message "Stream ended successfully"
exit 0 