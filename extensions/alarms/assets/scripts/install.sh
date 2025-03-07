#!/bin/sh

# Raycast Alarms Extension - Installation Script
# Crafted with ♥ for developers who value precision and reliability

# ANSI color codes for better visual hierarchy
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Helper function for printing beautifully formatted messages
print_step() {
  echo "${BOLD}${BLUE}[⚙️ Setup]${NC} $1"
}

print_success() {
  echo "${GREEN}[✓ Success]${NC} $1"
}

print_info() {
  echo "${BLUE}[ℹ️ Info]${NC} $1"
}

print_warning() {
  echo "${YELLOW}[⚠️ Warning]${NC} $1"
}

print_error() {
  echo "${RED}[❌ Error]${NC} $1"
}

# Print welcome banner
echo "\n${BOLD}${BLUE}===============================================${NC}"
echo "${BOLD}${BLUE}       Raycast Alarms Extension Installer      ${NC}"
echo "${BOLD}${BLUE}===============================================${NC}"
echo "${BLUE}Building your perfect alarm system, one script at a time${NC}\n"

# Find script directory
SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
print_info "Installation source: ${BOLD}$SCRIPT_DIR${NC}"

# Setup the config directory
CONFIG_DIR="$HOME/.raycast-alarms"
print_step "Creating workspace at ${BOLD}$CONFIG_DIR${NC}"

# Create required directories
mkdir -p "$CONFIG_DIR/scripts"
mkdir -p "$CONFIG_DIR/logs"
mkdir -p "$CONFIG_DIR/active"
print_success "Directory structure prepared"

# Verify source files exist
TRIGGER_SCRIPT="$SCRIPT_DIR/trigger-alarm.sh"
CRONTAB_SCRIPT="$SCRIPT_DIR/manage-crontab.sh"
APPLESCRIPT="$SCRIPT_DIR/show-alarm-popup.applescript"

print_step "Verifying source files..."

missing_files=0
if [ ! -f "$TRIGGER_SCRIPT" ]; then
  print_error "Missing trigger script: $TRIGGER_SCRIPT"
  missing_files=$((missing_files + 1))
fi

if [ ! -f "$CRONTAB_SCRIPT" ]; then
  print_error "Missing crontab management script: $CRONTAB_SCRIPT"
  missing_files=$((missing_files + 1))
fi

if [ ! -f "$APPLESCRIPT" ]; then
  print_error "Missing notification dialog script: $APPLESCRIPT"
  missing_files=$((missing_files + 1))
fi

if [ $missing_files -gt 0 ]; then
  print_error "Installation aborted due to missing source files"
  exit 1
fi

print_success "All source files verified"

# Copy scripts to config directory and make them executable
print_step "Deploying scripts to your system..."

cp "$TRIGGER_SCRIPT" "$CONFIG_DIR/scripts/"
cp "$CRONTAB_SCRIPT" "$CONFIG_DIR/scripts/"
cp "$APPLESCRIPT" "$CONFIG_DIR/scripts/"
print_success "Scripts copied to destination"

chmod +x "$CONFIG_DIR/scripts/trigger-alarm.sh"
chmod +x "$CONFIG_DIR/scripts/manage-crontab.sh"
print_success "Scripts are now executable"

# Create alarms data file if it doesn't exist
if [ ! -f "$CONFIG_DIR/alarms.json" ]; then
  print_step "Initializing alarms database"
  echo "[]" > "$CONFIG_DIR/alarms.json"
  print_success "Empty alarms database created"
else
  print_info "Using existing alarms database"
fi

# Ensure crontab marker exists
print_step "Setting up crontab integration..."
if crontab -l 2>/dev/null | grep "RAYCAST ALARMS" >/dev/null; then
  print_info "Crontab marker already exists - preserving your existing configuration"
else
  print_info "Adding crontab marker for alarm management"
  (crontab -l 2>/dev/null; echo "#--- RAYCAST ALARMS ---#"; echo "#--- DO NOT EDIT THIS SECTION MANUALLY ---#") | crontab -
  print_success "Crontab configured for alarm management"
fi

# Compile AppleScript if needed
COMPILED_SCRIPT="$CONFIG_DIR/scripts/show-alarm-popup.scpt"
print_step "Setting up notification system..."
if [ ! -f "$COMPILED_SCRIPT" ]; then
  osacompile -o "$COMPILED_SCRIPT" "$CONFIG_DIR/scripts/show-alarm-popup.applescript"
  print_success "Notification dialog compiled successfully"
else
  print_info "Using existing notification dialog script"
fi

echo "\n${BOLD}${GREEN}✨ Installation completed successfully! ✨${NC}"
echo "${BLUE}Your Raycast Alarms system is now ready for action.${NC}"
echo "${BLUE}Configuration path: ${BOLD}$CONFIG_DIR${NC}"
echo "${BLUE}Logs directory: ${BOLD}$CONFIG_DIR/logs${NC}"
echo "\n${YELLOW}Need help? Check out our documentation or ask the Raycast community.${NC}"
echo "${GREEN}Enjoy your perfectly timed alarms!${NC}\n"

exit 0 