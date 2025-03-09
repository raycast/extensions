#!/bin/sh

# manage-crontab.sh - Script to manage crontab entries for Raycast Alarms

# Add common paths for Homebrew binaries
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"

# Script directory (for finding resources)
SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
BASE_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Configuration directory
CONFIG_DIR="$HOME/.raycast-alarms"
ALARMS_FILE="$CONFIG_DIR/alarms.data"
CRONTAB_MARKER="#--- RAYCAST ALARMS ---#"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR/active"
mkdir -p "$CONFIG_DIR/logs"

# Log function
log() {
  LOG_FILE="$CONFIG_DIR/logs/crontab-$(date +%Y%m%d).log"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Initialize alarms file if it doesn't exist
if [ ! -f "$ALARMS_FILE" ]; then
  touch "$ALARMS_FILE"
fi

# Function to add an alarm to crontab
add_alarm() {
  alarm_id="$1"
  title="$2"
  hours="$3"
  minutes="$4"
  seconds="$5"
  sound_path="$6"
  
  log "Adding alarm: ID=$alarm_id, Title=$title, Time=$hours:$minutes:$seconds, Sound=$sound_path"
  
  # Validate parameters
  if [ -z "$alarm_id" ] || [ -z "$title" ] || [ -z "$hours" ] || [ -z "$minutes" ] || [ -z "$seconds" ] || [ -z "$sound_path" ]; then
    log "Error: Missing required parameters"
    echo "Usage: $0 add alarm_id title hours minutes seconds sound_path"
    exit 1
  fi
  
  # Validate time format
  if ! [[ "$hours" =~ ^[0-9]+$ ]] || [ "$hours" -lt 0 ] || [ "$hours" -gt 23 ]; then
    log "Error: Hours must be between 0-23"
    echo "Error: Hours must be between 0-23"
    exit 1
  fi
  
  if ! [[ "$minutes" =~ ^[0-9]+$ ]] || [ "$minutes" -lt 0 ] || [ "$minutes" -gt 59 ]; then
    log "Error: Minutes must be between 0-59"
    echo "Error: Minutes must be between 0-59"
    exit 1
  fi
  
  if ! [[ "$seconds" =~ ^[0-9]+$ ]] || [ "$seconds" -lt 0 ] || [ "$seconds" -gt 59 ]; then
    log "Error: Seconds must be between 0-59"
    echo "Error: Seconds must be between 0-59"
    exit 1
  fi
  
  # Check that trigger script exists
  TRIGGER_SCRIPT="$HOME/.raycast-alarms/scripts/trigger-alarm.sh"
  if [ ! -f "$TRIGGER_SCRIPT" ]; then
    log "ERROR: Trigger script not found at: $TRIGGER_SCRIPT"
    echo "ERROR: Trigger script not found at: $TRIGGER_SCRIPT"
    # Try to find it elsewhere
    log "Searching for trigger script in current directory..."
    CURRENT_DIR="$(pwd)"
    log "Current directory: $CURRENT_DIR"
    FOUND_SCRIPT=$(find "$CURRENT_DIR" -name "trigger-alarm.sh" 2>/dev/null | head -n 1)
    log "Found script (if any): $FOUND_SCRIPT"
  else
    log "Trigger script found at: $TRIGGER_SCRIPT"
  fi
  
  # Create the crontab entry
  # Format: minute hour day month weekday command
  # Escape spaces in paths with backslashes
  escaped_sound_path=$(echo "$sound_path" | sed 's/ /\\ /g')
  escaped_script_path=$(echo "$HOME/.raycast-alarms/scripts/trigger-alarm.sh" | sed 's/ /\\ /g')
  
  # Create a crontab entry with proper parameter order, pass seconds as a parameter
  cron_entry="$minutes $hours * * * $escaped_script_path $alarm_id \"$title\" $escaped_sound_path $seconds"
  
  log "Generated crontab entry: $cron_entry"
  
  # Get current crontab
  crontab -l > "$CONFIG_DIR/temp_crontab" 2>/dev/null || echo "" > "$CONFIG_DIR/temp_crontab"
  log "Retrieved current crontab content"
  
  # Check if marker exists
  if ! grep -q "$CRONTAB_MARKER" "$CONFIG_DIR/temp_crontab"; then
    # Add marker section if it doesn't exist
    echo "" >> "$CONFIG_DIR/temp_crontab"
    echo "$CRONTAB_MARKER" >> "$CONFIG_DIR/temp_crontab"
    echo "#--- DO NOT EDIT THIS SECTION MANUALLY ---#" >> "$CONFIG_DIR/temp_crontab"
    echo "" >> "$CONFIG_DIR/temp_crontab"
    log "Added marker section to crontab"
  else
    log "Marker already exists in crontab"
  fi

  # For debugging, show the marker section in the crontab
  log "Current crontab marker section:"
  grep -A 5 -B 5 "$CRONTAB_MARKER" "$CONFIG_DIR/temp_crontab" | while read line; do log "CRONTAB: $line"; done
  
  # Add new entry
  sed -i '' "/$CRONTAB_MARKER/a\\
$cron_entry
" "$CONFIG_DIR/temp_crontab"
  log "Added entry to temp crontab file"
  
  # For debugging, check if the entry was added correctly
  log "Checking if entry was added correctly:"
  grep "$alarm_id" "$CONFIG_DIR/temp_crontab" | while read line; do log "ENTRY: $line"; done
  
  # Install updated crontab
  crontab "$CONFIG_DIR/temp_crontab"
  CRONTAB_RESULT=$?
  log "Installed updated crontab, exit code: $CRONTAB_RESULT"
  
  # Debug: Check crontab content after installation
  log "Checking crontab content after installation:"
  crontab -l | grep -A 5 -B 5 "$CRONTAB_MARKER" | while read line; do log "INSTALLED: $line"; done
  
  rm -f "$CONFIG_DIR/temp_crontab"
  
  log "Added alarm: $alarm_id at $hours:$minutes:$seconds - '$title'"
  
  # Add to our tracking file using a simple pipe-delimited format
  # Format: id|title|time|sound_path
  
  # Format time with leading zeros
  formatted_hours=$(printf "%02d" $hours)
  formatted_minutes=$(printf "%02d" $minutes)
  formatted_time="$formatted_hours:$formatted_minutes"
  
  # Escape pipes in title and sound path
  safe_title=$(echo "$title" | sed 's/|/_/g') 
  safe_sound_path=$(echo "$sound_path" | sed 's/|/_/g')
  
  # Add to the data file
  echo "$alarm_id|$safe_title|$formatted_time|$safe_sound_path" >> "$ALARMS_FILE"
  DATA_RESULT=$?
  log "Added alarm to data file, exit code: $DATA_RESULT"
  
  if [ $DATA_RESULT -ne 0 ]; then
    log "ERROR: Failed to add alarm to data file"
    echo "ERROR: Failed to add alarm to data file"
  fi
  
  # Debug: Show the data file content
  log "Data file content after update:"
  cat "$ALARMS_FILE" | while read line; do log "DATA: $line"; done
  
  echo "Alarm added successfully: $title at $hours:$minutes:$seconds"
}

# Function to remove an alarm from crontab
remove_alarm() {
  alarm_id="$1"
  
  log "Removing alarm with ID: $alarm_id"
  
  # Get current crontab
  crontab -l > "$CONFIG_DIR/temp_crontab" 2>/dev/null || echo "" > "$CONFIG_DIR/temp_crontab"
  
  # Debug: Check if the alarm exists in crontab before removal
  if grep -q "$alarm_id" "$CONFIG_DIR/temp_crontab"; then
    log "Found alarm $alarm_id in crontab, proceeding with removal"
  else
    log "Warning: Alarm $alarm_id not found in crontab"
  fi
  
  # Remove the specific alarm entry
  # The alarm ID is always the first parameter to the trigger script
  sed -i '' "/$alarm_id /d" "$CONFIG_DIR/temp_crontab"
  
  # Debug: Verify the alarm is gone
  if grep -q "$alarm_id" "$CONFIG_DIR/temp_crontab"; then
    log "ERROR: Failed to remove alarm $alarm_id from crontab"
  else
    log "Successfully removed alarm $alarm_id from crontab"
  fi
  
  # Install updated crontab
  crontab "$CONFIG_DIR/temp_crontab"
  CRONTAB_RESULT=$?
  log "Installed updated crontab, exit code: $CRONTAB_RESULT"
  
  # Debug: Check crontab content after installation
  log "Checking crontab content after removal:"
  crontab -l | grep -A 5 -B 5 "$CRONTAB_MARKER" | while read line; do log "CRONTAB: $line"; done
  
  rm -f "$CONFIG_DIR/temp_crontab"
  
  # Remove from tracking file - simply grep for lines not containing the alarm ID
  if [ -f "$ALARMS_FILE" ]; then
    # Create a temp file with all lines except the one with alarm_id
    grep -v "^$alarm_id|" "$ALARMS_FILE" > "$CONFIG_DIR/temp_alarms.data"
    mv "$CONFIG_DIR/temp_alarms.data" "$ALARMS_FILE"
    
    DATA_RESULT=$?
    log "Removed alarm from data file, exit code: $DATA_RESULT"
    
    if [ $DATA_RESULT -ne 0 ]; then
      log "ERROR: Failed to remove alarm from data file"
      echo "ERROR: Failed to remove alarm from data file"
    fi
    
    # Debug: Check data file content after removal
    log "Data file content after removal:"
    cat "$ALARMS_FILE" | while read line; do log "DATA: $line"; done
  else
    log "Warning: alarms data file not found, nothing to remove"
  fi
  
  echo "Alarm removed successfully: $alarm_id"
}

# Function to list all alarms
list_alarms() {
  if [ ! -f "$ALARMS_FILE" ] || [ ! -s "$ALARMS_FILE" ]; then
    # Return empty JSON array since that's what the TypeScript code expects
    echo "[]"
    return 0
  fi
  
  # Convert our pipe-delimited format to JSON format
  echo "["
  first=true
  while IFS="|" read -r id title time sound; do
    if [ "$first" = true ]; then
      first=false
    else
      echo ","
    fi
    echo "  {\"id\": \"$id\", \"title\": \"$title\", \"time\": \"$time\", \"sound\": \"$sound\"}"
  done < "$ALARMS_FILE"
  echo "]"
}

# Function to get all active alarm IDs
get_active_alarm_ids() {
  ls -1 "$CONFIG_DIR/active/" 2>/dev/null | grep -v "_loop$" || echo ""
}

# Function to check if an alarm is active
is_alarm_active() {
  local alarm_id="$1"
  [ -f "$CONFIG_DIR/active/$alarm_id" ]
}

# Function to kill an active alarm
kill_alarm() {
  local alarm_id="$1"
  local active_file="$CONFIG_DIR/active/$alarm_id"
  local control_file="$CONFIG_DIR/active/${alarm_id}_loop"
  
  if [ -f "$active_file" ]; then
    pid=$(cat "$active_file")
    log "Killing alarm $alarm_id (PID: $pid)"
    
    # Remove the loop control file to stop any sound loops
    rm -f "$control_file"
    
    # Kill the sound process
    kill -TERM "$pid" 2>/dev/null || true
    
    # Kill any afplay processes related to this alarm
    pkill -f "afplay.*$alarm_id" 2>/dev/null || true
    
    # Remove the active file
    rm -f "$active_file"
    
    echo "Alarm stopped: $alarm_id"
  else
    echo "Alarm not active: $alarm_id"
  fi
}

# Function to get a list of currently active alarms (those that are ringing)
list_active_alarms() {
  active_ids=$(get_active_alarm_ids)
  
  if [ -z "$active_ids" ]; then
    echo "No alarms are currently active (ringing)."
    return 0
  fi
  
  echo "Active Alarms (currently ringing):"
  echo "--------------------------------"
  
  alarm_number=1
  for id in $active_ids; do
    # Try to find alarm info in the JSON file
    if [ -f "$ALARMS_FILE" ]; then
      name=$(grep -o "\"name\":\"[^\"]*\"" "$ALARMS_FILE" | grep -A1 "\"id\":\"$id\"" | sed 's/.*"name":"\([^"]*\)".*/\1/' | head -n 1)
      
      if [ -n "$name" ]; then
        echo "$alarm_number) $name (ID: $id)"
      else
        echo "$alarm_number) Unknown alarm (ID: $id)"
      fi
    else
      echo "$alarm_number) Alarm ID: $id"
    fi
    
    alarm_number=$((alarm_number + 1))
  done
}

# Function to kill all active alarms
kill_all_alarms() {
  active_ids=$(get_active_alarm_ids)
  
  if [ -z "$active_ids" ]; then
    echo "No active alarms to stop."
    return 0
  fi
  
  for id in $active_ids; do
    kill_alarm "$id"
  done
  
  echo "All alarms stopped successfully."
}

# Main script logic
command="$1"
shift

case "$command" in
  "add")
    add_alarm "$@"
    ;;
  "remove")
    remove_alarm "$1"
    ;;
  "list")
    list_alarms
    ;;
  "active")
    list_active_alarms
    ;;
  "kill")
    kill_alarm "$1"
    ;;
  "killall")
    kill_all_alarms
    ;;
  *)
    echo "Usage: $0 command [arguments]"
    echo ""
    echo "Commands:"
    echo "  add <alarm_id> <title> <hours> <minutes> <seconds> <sound_path> - Create a new alarm"
    echo "  remove <alarm_id> - Remove an existing alarm"
    echo "  list - List all scheduled alarms"
    echo "  active - List currently active (ringing) alarms"
    echo "  kill <alarm_id> - Stop an active alarm"
    echo "  killall - Stop all active alarms"
    exit 1
    ;;
esac

exit 0 