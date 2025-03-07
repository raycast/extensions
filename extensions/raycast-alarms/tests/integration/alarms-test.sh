#!/bin/bash

# Integration Tests for Raycast Alarms Extension
# These tests verify the core functionality of the alarm system

# Load test utilities
source "$(dirname "$(dirname "$0")")/test-utils.sh"

# Set up a patched version of the manage-crontab.sh script for testing
setup_patched_script() {
  # Make a copy of the original script
  cp "$TEST_CONFIG_DIR/scripts/manage-crontab.sh" "$TEST_CONFIG_DIR/scripts/manage-crontab.sh.orig"
  
  # Patch the script to use our mock crontab
  sed "s|crontab -l|\"$(dirname "$(dirname "$0")")/mock-crontab.sh\" -l|g" \
      "$TEST_CONFIG_DIR/scripts/manage-crontab.sh.orig" > "$TEST_CONFIG_DIR/scripts/manage-crontab.sh.tmp"
      
  sed "s|crontab \"|\"$(dirname "$(dirname "$0")")/mock-crontab.sh\" \"|g" \
      "$TEST_CONFIG_DIR/scripts/manage-crontab.sh.tmp" > "$TEST_CONFIG_DIR/scripts/manage-crontab.sh"
      
  # Make it executable
  chmod +x "$TEST_CONFIG_DIR/scripts/manage-crontab.sh"
  
  rm -f "$TEST_CONFIG_DIR/scripts/manage-crontab.sh.tmp"
}

# Test: Adding an alarm
test_add_alarm() {
  local test_id="test_alarm_$(date +%s)"
  local test_title="Test Alarm"
  local test_hours="10"
  local test_minutes="30"
  local test_seconds="0"
  local test_sound="/System/Library/Sounds/Submarine.aiff"
  
  # Add the alarm
  run_manage_crontab add "$test_id" "$test_title" "$test_hours" "$test_minutes" "$test_seconds" "$test_sound"
  
  # Check if the alarm was added to the data file
  if file_contains "$TEST_CONFIG_DIR/alarms.data" "$test_id"; then
    log_success "Alarm was added to data file"
  else
    log_failure "Alarm was not added to data file"
    return 1
  fi
  
  # Check the format of the entry (should be pipe-delimited)
  local pattern="$test_id|$test_title|10:30|$test_sound"
  if file_contains "$TEST_CONFIG_DIR/alarms.data" "$test_id"; then
    log_success "Alarm entry has correct format"
  else
    log_failure "Alarm entry format is incorrect"
    return 1
  fi
  
  return 0
}

# Test: Listing alarms
test_list_alarms() {
  # List alarms and capture output
  local list_output=$(run_manage_crontab list)
  
  # Check if the output is valid JSON
  echo "$list_output" | jq '.' > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    log_success "List output is valid JSON"
  else
    log_failure "List output is not valid JSON"
    echo "Output was: $list_output"
    return 1
  fi
  
  # Check if our test alarm is in the list
  if echo "$list_output" | grep -q "test_alarm"; then
    log_success "Test alarm found in alarm list"
  else
    log_failure "Test alarm not found in alarm list"
    echo "Output was: $list_output"
    return 1
  fi
  
  return 0
}

# Test: Removing an alarm
test_remove_alarm() {
  # Get the ID of our test alarm
  local test_id=$(grep "test_alarm" "$TEST_CONFIG_DIR/alarms.data" | cut -d'|' -f1)
  
  if [ -z "$test_id" ]; then
    log_failure "Could not find test alarm to remove"
    return 1
  fi
  
  # Count alarms before removal
  local before_count=$(count_lines "$TEST_CONFIG_DIR/alarms.data")
  
  # Remove the alarm
  run_manage_crontab remove "$test_id"
  
  # Count alarms after removal
  local after_count=$(count_lines "$TEST_CONFIG_DIR/alarms.data")
  
  # Check if the count decreased
  if [ "$after_count" -lt "$before_count" ]; then
    log_success "Alarm count decreased after removal"
  else
    log_failure "Alarm count did not decrease after removal"
    return 1
  fi
  
  # Check that the alarm ID is no longer in the file
  if ! file_contains "$TEST_CONFIG_DIR/alarms.data" "$test_id"; then
    log_success "Alarm was removed from data file"
  else
    log_failure "Alarm still exists in data file after removal"
    return 1
  fi
  
  return 0
}

# Test: Adding and removing multiple alarms
test_multiple_alarms() {
  # Add several test alarms
  for i in {1..5}; do
    local test_id="multi_test_alarm_$i"
    local test_title="Test Alarm $i"
    local test_hours=$((10 + i))
    local test_minutes=$((i * 10))
    
    run_manage_crontab add "$test_id" "$test_title" "$test_hours" "$test_minutes" "0" "/System/Library/Sounds/Submarine.aiff" > /dev/null
  done
  
  # List alarms
  local list_output=$(run_manage_crontab list)
  
  # Check if we have all 5 alarms
  local alarm_count=$(echo "$list_output" | grep -o "multi_test_alarm" | wc -l)
  if [ "$alarm_count" -eq 5 ]; then
    log_success "All 5 test alarms were added successfully"
  else
    log_failure "Expected 5 test alarms, but found $alarm_count"
    return 1
  fi
  
  # Remove the alarms one by one
  for i in {1..5}; do
    local test_id="multi_test_alarm_$i"
    run_manage_crontab remove "$test_id" > /dev/null
    
    # Check if it was removed
    if ! file_contains "$TEST_CONFIG_DIR/alarms.data" "$test_id"; then
      log_success "Alarm $test_id was removed successfully"
    else
      log_failure "Alarm $test_id was not removed"
      return 1
    fi
  done
  
  return 0
}

# Test: Scheduled time formatting
test_time_formatting() {
  # Test single-digit hours and minutes
  local test_id="format_test_alarm"
  
  # Test with hour=9, minute=5
  run_manage_crontab add "$test_id" "Format Test" "9" "5" "0" "/System/Library/Sounds/Submarine.aiff" > /dev/null
  
  # Check if the formatted time has leading zeros (should be 09:05)
  if file_contains "$TEST_CONFIG_DIR/alarms.data" "$test_id|Format Test|09:05"; then
    log_success "Time was correctly formatted with leading zeros"
  else
    log_failure "Time formatting failed for single-digit values"
    cat "$TEST_CONFIG_DIR/alarms.data"
    return 1
  fi
  
  # Clean up
  run_manage_crontab remove "$test_id" > /dev/null
  
  return 0
}

# Main test runner
run_tests() {
  echo -e "\n${BOLD}${BLUE}===================================${NC}"
  echo -e "${BOLD}${BLUE} Raycast Alarms Integration Tests ${NC}"
  echo -e "${BOLD}${BLUE}===================================${NC}\n"
  
  local tests_passed=0
  local tests_failed=0
  
  # Setup test environment
  setup_test_env
  setup_patched_script
  
  # Run tests
  log_test "Running alarm tests..."
  
  run_test "Adding an alarm" "test_add_alarm"
  if [ $? -eq 0 ]; then
    tests_passed=$((tests_passed + 1))
  else
    tests_failed=$((tests_failed + 1))
  fi
  
  run_test "Listing alarms" "test_list_alarms"
  if [ $? -eq 0 ]; then
    tests_passed=$((tests_passed + 1))
  else
    tests_failed=$((tests_failed + 1))
  fi
  
  run_test "Removing an alarm" "test_remove_alarm"
  if [ $? -eq 0 ]; then
    tests_passed=$((tests_passed + 1))
  else
    tests_failed=$((tests_failed + 1))
  fi
  
  run_test "Multiple alarms management" "test_multiple_alarms"
  if [ $? -eq 0 ]; then
    tests_passed=$((tests_passed + 1))
  else
    tests_failed=$((tests_failed + 1))
  fi
  
  run_test "Time formatting" "test_time_formatting"
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

# Run all tests
run_tests 