#!/bin/bash

# Integration Tests for Raycast Alarms Trigger Functionality
# These tests verify the alarm triggering mechanism

# Load test utilities
source "$(dirname "$(dirname "$0")")/test-utils.sh"

# Test: Simulation of alarm triggering
test_alarm_trigger() {
  local test_id="trigger_test_alarm_$(date +%s)"
  local test_title="Trigger Test Alarm"
  local test_sound="/System/Library/Sounds/Submarine.aiff"
  
  # Create an active directory
  mkdir -p "$TEST_CONFIG_DIR/active"
  
  # Run the trigger script with nohup to avoid actual sound playing and dialogs
  # Just test that the script executes without errors
  nohup "$TEST_CONFIG_DIR/scripts/trigger-alarm.sh" "$test_id" "$test_title" "$test_sound" "0" > "$TEST_CONFIG_DIR/nohup.out" 2>&1 &
  
  # Store process ID
  local pid=$!
  
  # Wait a moment for it to initialize
  sleep 1
  
  # Check if the active file was created
  if [ -f "$TEST_CONFIG_DIR/active/$test_id" ]; then
    log_success "Active alarm file was created"
  else
    log_failure "Active alarm file was not created"
    return 1
  fi
  
  # Check if the loop control file exists
  if [ -f "$TEST_CONFIG_DIR/active/${test_id}_loop" ]; then
    log_success "Loop control file was created"
  else
    log_failure "Loop control file was not created"
    return 1
  fi
  
  # Kill the test process
  if kill -0 $pid > /dev/null 2>&1; then
    kill $pid
    log_success "Successfully terminated test alarm process"
  fi
  
  # Clean up
  rm -f "$TEST_CONFIG_DIR/active/$test_id"
  rm -f "$TEST_CONFIG_DIR/active/${test_id}_loop"
  
  return 0
}

# Test: Verify automatic cleanup when alarm stopped
test_alarm_cleanup() {
  local test_id="cleanup_test_alarm_$(date +%s)"
  
  # Create mock active files
  mkdir -p "$TEST_CONFIG_DIR/active"
  echo "12345" > "$TEST_CONFIG_DIR/active/$test_id"
  echo "1" > "$TEST_CONFIG_DIR/active/${test_id}_loop"
  
  # Create a mock crontab entry
  echo "30 10 * * * $TEST_CONFIG_DIR/scripts/trigger-alarm.sh $test_id \"Test Title\" /path/to/sound.aiff 0" > "/tmp/raycast-alarms-test/mock-crontab"
  
  # Run the cleanup part of the trigger script (simulated)
  # We'll create a temporary script to simulate the cleanup
  cat << 'EOF' > "$TEST_CONFIG_DIR/temp_cleanup.sh"
#!/bin/bash
alarm_id="$1"
active_file="$TEST_CONFIG_DIR/active/$alarm_id"
loop_control_file="$TEST_CONFIG_DIR/active/${alarm_id}_loop"

# Remove the loop control file
rm -f "$loop_control_file"

# Remove the active file
rm -f "$active_file"

# Remove from crontab
"$TEST_CONFIG_DIR/scripts/manage-crontab.sh" remove "$alarm_id"
EOF
  
  chmod +x "$TEST_CONFIG_DIR/temp_cleanup.sh"
  
  # Run the cleanup script
  "$TEST_CONFIG_DIR/temp_cleanup.sh" "$test_id"
  
  # Check if files were removed
  if [ ! -f "$TEST_CONFIG_DIR/active/$test_id" ] && [ ! -f "$TEST_CONFIG_DIR/active/${test_id}_loop" ]; then
    log_success "Alarm files were properly cleaned up"
  else
    log_failure "Alarm files were not cleaned up"
    return 1
  fi
  
  # Check if crontab entry was removed
  if ! grep -q "$test_id" "/tmp/raycast-alarms-test/mock-crontab"; then
    log_success "Crontab entry was removed"
  else
    log_failure "Crontab entry was not removed"
    return 1
  fi
  
  return 0
}

# Main test runner
run_trigger_tests() {
  echo -e "\n${BOLD}${BLUE}========================================${NC}"
  echo -e "${BOLD}${BLUE} Raycast Alarms Trigger Function Tests ${NC}"
  echo -e "${BOLD}${BLUE}========================================${NC}\n"
  
  local tests_passed=0
  local tests_failed=0
  
  # Setup test environment
  setup_test_env
  
  # Patch the manage-crontab script
  setup_patched_script
  
  # Run tests
  log_test "Running trigger tests..."
  
  run_test "Alarm triggering" "test_alarm_trigger"
  if [ $? -eq 0 ]; then
    tests_passed=$((tests_passed + 1))
  else
    tests_failed=$((tests_failed + 1))
  fi
  
  run_test "Alarm cleanup" "test_alarm_cleanup"
  if [ $? -eq 0 ]; then
    tests_passed=$((tests_passed + 1))
  else
    tests_failed=$((tests_failed + 1))
  fi
  
  # Print test summary
  echo -e "\n${BOLD}${BLUE}=================${NC}"
  echo -e "${BOLD}${BLUE} Test Summary ${NC}"
  echo -e "${BOLD}${BLUE}=================${NC}"
  echo -e "${GREEN}Tests passed: $tests_passed${NC}"
  echo -e "${RED}Tests failed: $tests_failed${NC}"
  
  # Clean up
  cleanup_test_env
  
  # Return error if any tests failed
  if [ $tests_failed -gt 0 ]; then
    return 1
  else
    return 0
  fi
}

# Run the trigger tests
run_trigger_tests 