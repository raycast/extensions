#!/bin/sh

# Raycast Alarms Extension - Installation Script

print_step() {
  echo "[⚙️ Setup] $1"
}

print_success() {
  echo "[✓ Success] $1"
}

print_info() {
  echo "[ℹ️ Info] $1"
}

print_warning() {
  echo "[⚠️ Warning] $1"
}

print_error() {
  echo "[❌ Error] $1"
}

echo "\n==============================================="
echo "       Raycast Alarms Extension Installer      "
echo "==============================================="
echo "Building your perfect alarm system, one script at a time\n"

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
print_info "Installation source: $SCRIPT_DIR"

CONFIG_DIR="$HOME/.raycast-alarms"
print_step "Creating workspace at $CONFIG_DIR"

mkdir -p "$CONFIG_DIR/scripts" || { print_error "Failed to create scripts directory"; exit 1; }
mkdir -p "$CONFIG_DIR/logs" || { print_error "Failed to create logs directory"; exit 1; }
mkdir -p "$CONFIG_DIR/active" || { print_error "Failed to create active directory"; exit 1; }
print_success "Directory structure prepared"

TRIGGER_SCRIPT="$SCRIPT_DIR/trigger-alarm.sh"
CRONTAB_SCRIPT="$SCRIPT_DIR/manage-crontab.sh"
APPLESCRIPT="$SCRIPT_DIR/show-alarm-popup.applescript"

print_step "Verifying source files..."

missing_files=0
[ ! -f "$TRIGGER_SCRIPT" ] && { print_error "Missing trigger script: $TRIGGER_SCRIPT"; missing_files=$((missing_files + 1)); }
[ ! -f "$CRONTAB_SCRIPT" ] && { print_error "Missing crontab management script: $CRONTAB_SCRIPT"; missing_files=$((missing_files + 1)); }
[ ! -f "$APPLESCRIPT" ] && { print_error "Missing notification dialog script: $APPLESCRIPT"; missing_files=$((missing_files + 1)); }

[ $missing_files -gt 0 ] && { print_error "Installation aborted due to missing source files"; exit 1; }

print_success "All source files verified"

print_step "Deploying scripts to your system..."

cp "$TRIGGER_SCRIPT" "$CONFIG_DIR/scripts/" || { print_error "Failed to copy trigger script"; exit 1; }
cp "$CRONTAB_SCRIPT" "$CONFIG_DIR/scripts/" || { print_error "Failed to copy crontab script"; exit 1; }
cp "$APPLESCRIPT" "$CONFIG_DIR/scripts/" || { print_error "Failed to copy AppleScript"; exit 1; }
print_success "Scripts copied to destination"

chmod +x "$CONFIG_DIR/scripts/trigger-alarm.sh"
chmod +x "$CONFIG_DIR/scripts/manage-crontab.sh"
print_success "Scripts are now executable"

if [ ! -f "$CONFIG_DIR/alarms.json" ]; then
  print_step "Initializing alarms database"
  echo "[]" > "$CONFIG_DIR/alarms.json"
  chmod 600 "$CONFIG_DIR/alarms.json"
  print_success "Empty alarms database created"
else
  print_info "Using existing alarms database"
fi

print_step "Setting up crontab integration..."
if crontab -l 2>/dev/null | grep "RAYCAST ALARMS" >/dev/null; then
  print_info "Crontab marker already exists - preserving your existing configuration"
else
  print_info "Adding crontab marker for alarm management"
  (crontab -l 2>/dev/null; echo "#--- RAYCAST ALARMS ---#"; echo "#--- DO NOT EDIT THIS SECTION MANUALLY ---#") | crontab -
  print_success "Crontab configured for alarm management"
fi

COMPILED_SCRIPT="$CONFIG_DIR/scripts/show-alarm-popup.scpt"
print_step "Setting up notification system..."
if [ ! -f "$COMPILED_SCRIPT" ]; then
  osacompile -o "$COMPILED_SCRIPT" "$CONFIG_DIR/scripts/show-alarm-popup.applescript" || { print_error "Failed to compile notification dialog"; exit 1; }
  print_success "Notification dialog compiled successfully"
else
  print_info "Using existing notification dialog script"
fi

echo "\n✨ Installation completed successfully! ✨"
echo "Your Raycast Alarms system is now ready for action."
echo "Configuration path: $CONFIG_DIR"
echo "Logs directory: $CONFIG_DIR/logs"

exit 0 