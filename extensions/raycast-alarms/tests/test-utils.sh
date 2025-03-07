#!/bin/bash

# Test utilities for Raycast Alarms Extension

# Create a test environment with isolated configuration
TEST_CONFIG_DIR="/tmp/raycast-alarms-test"
ORIGINAL_CONFIG_DIR="$HOME/.raycast-alarms"
SCRIPTS_DIR="$(pwd)/assets/scripts"

# Colors for test output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Log a message to console with timestamp
log_test() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Log a success message
log_success() {
  echo -e "${GREEN}[✓ PASS]${NC} $1"
}

# Log a failure message
log_failure() {
  echo -e "${RED}[✗ FAIL]${NC} $1"
}

# Log a warning message
log_warning() {
  echo -e "${YELLOW}[⚠️ WARNING]${NC} $1"
}

# Setup test environment
setup_test_env() {
  log_test "Setting up test environment..."
  
  # Create test directories
  mkdir -p "$TEST_CONFIG_DIR/scripts"
  mkdir -p "$TEST_CONFIG_DIR/logs"
  mkdir -p "$TEST_CONFIG_DIR/active"
  
  # Copy scripts to test directory
  cp "$SCRIPTS_DIR/manage-crontab.sh" "$TEST_CONFIG_DIR/scripts/"
  cp "$SCRIPTS_DIR/trigger-alarm.sh" "$TEST_CONFIG_DIR/scripts/"
  cp "$SCRIPTS_DIR/show-alarm-popup.applescript" "$TEST_CONFIG_DIR/scripts/"
  
  # Make scripts executable
  chmod +x "$TEST_CONFIG_DIR/scripts/manage-crontab.sh"
  chmod +x "$TEST_CONFIG_DIR/scripts/trigger-alarm.sh"
  
  # Compile AppleScript for testing
  osacompile -o "$TEST_CONFIG_DIR/scripts/show-alarm-popup.scpt" "$TEST_CONFIG_DIR/scripts/show-alarm-popup.applescript"
  
  # Create empty alarms data file
  touch "$TEST_CONFIG_DIR/alarms.data"
  
  # Patch the script to use the test directory
  sed -i '' "s|CONFIG_DIR=\"\$HOME/.raycast-alarms\"|CONFIG_DIR=\"$TEST_CONFIG_DIR\"|g" "$TEST_CONFIG_DIR/scripts/manage-crontab.sh"
  sed -i '' "s|TRIGGER_SCRIPT=\"\$HOME/.raycast-alarms/scripts/trigger-alarm.sh\"|TRIGGER_SCRIPT=\"$TEST_CONFIG_DIR/scripts/trigger-alarm.sh\"|g" "$TEST_CONFIG_DIR/scripts/manage-crontab.sh"
  
  log_success "Test environment created at $TEST_CONFIG_DIR"
}

# Cleanup test environment
cleanup_test_env() {
  log_test "Cleaning up test environment..."
  rm -rf "$TEST_CONFIG_DIR"
  log_success "Test environment removed"
}

# Run the manage-crontab.sh script with test configuration
run_manage_crontab() {
  # Run the command
  "$TEST_CONFIG_DIR/scripts/manage-crontab.sh" "$@"
  return $?
}

# Check if a string exists in a file
file_contains() {
  local file="$1"
  local search_string="$2"
  
  if grep -q "$search_string" "$file"; then
    return 0
  else
    return 1
  fi
}

# Count lines in a file
count_lines() {
  local file="$1"
  wc -l < "$file" | tr -d ' '
}

# Run a test and check result
run_test() {
  local test_name="$1"
  local test_command="$2"
  
  log_test "Running test: $test_name"
  
  # Execute the test command
  eval "$test_command"
  local result=$?
  
  if [ $result -eq 0 ]; then
    log_success "$test_name"
    return 0
  else
    log_failure "$test_name"
    return 1
  fi
}

# Simple assertion function
assert() {
  local condition="$1"
  local message="$2"
  
  if eval "$condition"; then
    log_success "$message"
    return 0
  else
    log_failure "$message"
    return 1
  fi
} 