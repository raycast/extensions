#!/bin/bash

# nest-player.sh - A script to play RTSP streams from Nest cameras using FFplay
# This script is designed to be wrapped by Platypus to create a native macOS app

# Enable debug output
set -x

# Create a log file for debugging
LOG_FILE=$(mktemp)
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

# Store URL in a file to avoid command line length issues
RTSP_URL="$1"
URL_FILE=$(mktemp)
echo "$RTSP_URL" > "$URL_FILE"
log_message "RTSP URL stored in $URL_FILE"

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

# Find FFplay
FFPLAY_PATH=""
for path in "${FFPLAY_PATHS[@]}"; do
  if [ -x "$path" ]; then
    FFPLAY_PATH="$path"
    log_message "Found FFplay at: $FFPLAY_PATH"
    break
  fi
done

# Check if ffplay is found
if [ -z "$FFPLAY_PATH" ]; then
  log_error "FFplay not found. Please install FFmpeg using 'brew install ffmpeg'"
  close_loading_dialog
  osascript -e "display notification \"FFplay not found. Please install FFmpeg using 'brew install ffmpeg'.\" with title \"Nest Camera Error\""
  rm -f "$URL_FILE" "$LOADING_SCRIPT"
  exit 1
fi

log_message "Using FFplay at: $FFPLAY_PATH"
log_message "Starting FFplay with RTSP URL: $RTSP_URL"
log_message "Camera: $CAMERA_NAME"

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
  log_message "Screen dimensions: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}"
else
  # Fallback to safe values if screen dimensions can't be determined
  X_POSITION=800
  Y_POSITION=40
  log_message "Could not determine screen dimensions, using default position"
fi

log_message "Window position: ${X_POSITION},${Y_POSITION}"

# Try to find the bundle identifier for FFplay
FFPLAY_BUNDLE_ID=$(osascript -e 'id of app "ffplay"' 2>/dev/null || echo "org.ffmpeg.ffplay")
log_message "FFplay bundle ID: $FFPLAY_BUNDLE_ID"

# Set FFplay as a background-only application
defaults write "$FFPLAY_BUNDLE_ID" LSUIElement -bool true
defaults write "$FFPLAY_BUNDLE_ID" LSBackgroundOnly -bool true
log_message "Set FFplay as background-only application"

# Create a wrapper script that will launch FFplay through nohup
WRAPPER_SCRIPT=$(mktemp)
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash

# Set environment variables to help hide FFplay from dock
export DISPLAY_IN_DOCK=0
export LSUIElement=1
export LSBackgroundOnly=1

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
  -i "$(cat "$URL_FILE")" \
  2>&1 | grep -v "deprecated"
EOF

chmod +x "$WRAPPER_SCRIPT"
log_message "Created FFplay wrapper script at $WRAPPER_SCRIPT"

# Create a more robust AppleScript to hide FFplay from dock
APPLESCRIPT_FILE=$(mktemp)
cat > "$APPLESCRIPT_FILE" << EOF
#!/usr/bin/osascript

on run
  -- Use polling instead of fixed delay
  set maxAttempts to 20
  set attemptCount to 0
  set ffplayFound to false
  
  log "Starting to look for FFplay process"
  
  repeat until ffplayFound or attemptCount > maxAttempts
    set attemptCount to attemptCount + 1
    log "Attempt " & attemptCount & " to find FFplay process"
    
    try
      tell application "System Events"
        if exists (processes where name contains "ffplay" or name contains "FFplay") then
          set ffplayFound to true
          set ffplayProcess to first process where name contains "ffplay" or name contains "FFplay"
          
          log "Found FFplay process on attempt " & attemptCount
          
          tell ffplayProcess
            -- Try different properties to hide from dock
            try
              set background only to true
              log "Set FFplay process to background only"
            on error errorMessage
              log "Failed to set background only: " & errorMessage
            end try
            
            try
              set visible to false
              delay 0.1
              set visible to true
              log "Toggled FFplay visibility"
            on error errorMessage
              log "Failed to toggle visibility: " & errorMessage
            end try
            
            -- Position the window
            try
              set position of window 1 to {$X_POSITION, $Y_POSITION}
              log "Positioned FFplay window at $X_POSITION, $Y_POSITION"
            on error errorMessage
              log "Failed to position window: " & errorMessage
            end try
            
            -- Set up a handler for when FFplay quits
            try
              tell application "Nest Camera Viewer" to set has quit handler to true
              log "Set quit handler for Nest Camera Viewer"
            on error errorMessage
              log "Failed to set quit handler: " & errorMessage
            end try
          end tell
        else
          log "FFplay process not found on attempt " & attemptCount
          delay 0.5
        end if
      end tell
    on error errorMessage
      log "Error checking for FFplay: " & errorMessage
      delay 0.5
    end try
  end repeat
  
  if not ffplayFound then
    log "Failed to find FFplay process after " & maxAttempts & " attempts"
    return
  end if
  
  -- Try to hide FFplay icon from Dock
  try
    tell application "Dock"
      quit
      delay 0.5
      activate
      log "Restarted Dock to refresh icons"
    end tell
  on error errorMessage
    log "Failed to restart Dock: " & errorMessage
  end try
end run
EOF

chmod +x "$APPLESCRIPT_FILE"
log_message "Created AppleScript file at $APPLESCRIPT_FILE"

# Launch FFplay using nohup to detach it from the terminal and prevent it from showing in the dock
# The /dev/null redirection helps prevent it from creating a dock icon
log_message "Launching FFplay..."
FFPLAY_PID=$(nohup "$WRAPPER_SCRIPT" </dev/null >/dev/null 2>&1 & echo $!)
log_message "FFplay launched with PID $FFPLAY_PID"

# Run the AppleScript to set the process properties
osascript "$APPLESCRIPT_FILE" > /tmp/ffplay_applescript.log 2>&1 &
log_message "Running AppleScript to configure FFplay window"

# Create a monitor script to quit the app when FFplay exits
MONITOR_SCRIPT=$(mktemp)
cat > "$MONITOR_SCRIPT" << EOF
#!/bin/bash

# Monitor FFplay process and quit the app when it exits
while kill -0 $FFPLAY_PID 2>/dev/null; do
  sleep 1
done

# FFplay has exited, quit the app
echo "[$(date +%H:%M:%S)] FFplay process $FFPLAY_PID has exited, quitting Nest Camera Viewer" >> "$LOG_FILE"
osascript -e 'tell application "Nest Camera Viewer" to quit'
EOF

chmod +x "$MONITOR_SCRIPT"
log_message "Created monitor script at $MONITOR_SCRIPT"
"$MONITOR_SCRIPT" &
log_message "Started monitor script"

# Wait for FFplay to start and become visible (give it a few seconds)
log_message "Waiting for FFplay to initialize (5 seconds)..."
sleep 5

# Close the loading dialog once FFplay is running
close_loading_dialog

# Wait for FFplay to exit
log_message "Waiting for FFplay to exit..."
while kill -0 $FFPLAY_PID 2>/dev/null; do
  sleep 1
done

# Get the exit code (this will be approximate since we're using nohup)
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  log_error "FFplay exited with error code $EXIT_CODE"
  close_loading_dialog
  osascript -e "display notification \"FFplay may have failed to play the stream (exit code: $EXIT_CODE).\" with title \"Nest Camera Error\""
  rm -f "$URL_FILE" "$APPLESCRIPT_FILE" "$MONITOR_SCRIPT" "$WRAPPER_SCRIPT" "$LOADING_SCRIPT"
  exit $EXIT_CODE
fi

log_message "FFplay exited normally"

# Clean up
log_message "Cleaning up temporary files"
rm -f "$URL_FILE" "$APPLESCRIPT_FILE" "$MONITOR_SCRIPT" "$WRAPPER_SCRIPT" "$LOADING_SCRIPT"

# Quit the app
log_message "Quitting Nest Camera Viewer"
osascript -e 'tell application "Nest Camera Viewer" to quit'

# Copy the log file to a more permanent location for debugging
LOG_DIR="$HOME/Library/Logs/NestCameraViewer"
mkdir -p "$LOG_DIR"
cp "$LOG_FILE" "$LOG_DIR/nest-player-$(date +%Y%m%d-%H%M%S).log"
log_message "Log saved to $LOG_DIR/nest-player-$(date +%Y%m%d-%H%M%S).log"
rm -f "$LOG_FILE"

exit 0 