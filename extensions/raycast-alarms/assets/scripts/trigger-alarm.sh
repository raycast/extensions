#!/bin/bash

# Script to trigger an alarm sound and popup
# Usage: trigger-alarm.sh <alarm_id> <alarm_title> <sound_path> <seconds>

# Set the alarm ID
alarm_id="$1"
alarm_title="$2"
sound_path="$3"
seconds="$4"  # Parameter for seconds delay

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$HOME/.raycast-alarms/logs/trigger-alarm.log"
}

cleanup() {
  # Remove the active alarm file
  if [ -f "$active_alarm_file" ]; then
    log "Cleaning up active alarm file: $active_alarm_file"
    rm -f "$active_alarm_file"
  fi
  
  # Stop the loop by removing the loop control file
  if [ -f "$loop_control_file" ]; then
    log "Removing loop control file: $loop_control_file"
    rm -f "$loop_control_file"
  fi
  
  # Kill any running afplay processes for this alarm
  pkill -f "afplay $sound_path" 2>/dev/null
}

# Set trap for normal exit and interrupts
trap cleanup EXIT INT TERM

# Ensure the alarm title is not empty
if [ -z "$alarm_title" ]; then
  alarm_title="Raycast Alarm"
fi

log "Triggering alarm: ID=$alarm_id, Title=$alarm_title, Sound=$sound_path, Seconds=$seconds"

# Create the active alarms directory if it doesn't exist
mkdir -p "$HOME/.raycast-alarms/active"

# Create a file to mark this alarm as active
active_alarm_file="$HOME/.raycast-alarms/active/$alarm_id"
loop_control_file="$HOME/.raycast-alarms/active/${alarm_id}_loop"

# If seconds parameter is provided, wait that number of seconds
if [ -n "$seconds" ] && [ "$seconds" -gt 0 ]; then
  log "Waiting $seconds seconds before triggering alarm"
  sleep "$seconds"
fi

# Create a loop control file to keep the sound playing
echo "1" > "$loop_control_file"

# Start playing sound in a loop in the background
if [ -f "$sound_path" ]; then
  log "Playing sound in loop: $sound_path"
  
  # Start a background process that keeps playing the sound until the loop control file is removed
  (
    while [ -f "$loop_control_file" ]; do
      afplay "$sound_path"
      # Short pause between loops to avoid CPU hammering
      sleep 0.5
    done
  ) &
  sound_loop_pid=$!
  log "Sound loop process PID: $sound_loop_pid"
  # Save the PID to the active alarm file
  echo "$sound_loop_pid" > "$active_alarm_file"
else
  log "Error: Sound file not found: $sound_path"
  exit 1
fi

# Show AppleScript popup dialog
log "Showing popup dialog for: $alarm_title"
POPUP_SCRIPT="$HOME/.raycast-alarms/scripts/show-alarm-popup.scpt"

if [ -f "$POPUP_SCRIPT" ]; then
  dialog_result=$(osascript "$POPUP_SCRIPT" "$alarm_title")
  log "Dialog result: $dialog_result"
  
  if [ "$dialog_result" = "stop" ]; then
    log "Stop button clicked, killing sound process"
    # Remove the loop control file to stop the sound loop
    rm -f "$loop_control_file"
    # Kill any currently playing sound
    pkill -f "afplay $sound_path" 2>/dev/null
    cleanup
    
    # Also remove the crontab entry to make this a one-time alarm
    log "Removing crontab entry for alarm $alarm_id"
    MANAGE_SCRIPT="$HOME/.raycast-alarms/scripts/manage-crontab.sh"
    if [ -f "$MANAGE_SCRIPT" ] && [ -x "$MANAGE_SCRIPT" ]; then
      "$MANAGE_SCRIPT" remove "$alarm_id"
      log "Crontab entry removed for alarm $alarm_id"
    else
      log "Error: manage-crontab.sh script not found or not executable"
    fi
    
    exit 0
  elif [ "$dialog_result" = "snooze" ]; then
    log "Snooze button clicked"
    # Implement snooze functionality if needed
  fi
else
  log "Error: AppleScript not found: $POPUP_SCRIPT"
fi

# Auto-stop sound after 10 minutes if not manually stopped
log "Setting auto-stop timer for 10 minutes"
(
  sleep 600
  if [ -f "$active_alarm_file" ]; then
    log "Auto-stopping alarm ID=$alarm_id after 10 minutes"
    # Remove the loop control file to stop the sound loop
    rm -f "$loop_control_file"
    # Kill any currently playing sound
    pkill -f "afplay $sound_path" 2>/dev/null
    cleanup
    
    # Also remove the crontab entry when auto-stopped
    log "Removing crontab entry for alarm $alarm_id after auto-stop"
    MANAGE_SCRIPT="$HOME/.raycast-alarms/scripts/manage-crontab.sh"
    if [ -f "$MANAGE_SCRIPT" ] && [ -x "$MANAGE_SCRIPT" ]; then
      "$MANAGE_SCRIPT" remove "$alarm_id"
      log "Crontab entry removed for alarm $alarm_id"
    else
      log "Error: manage-crontab.sh script not found or not executable"
    fi
  fi
) &

log "Alarm trigger completed"
exit 0 