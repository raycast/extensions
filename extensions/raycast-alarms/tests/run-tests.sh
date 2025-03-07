#!/bin/bash

# Raycast Alarms Extension Test Runner
# Run all test suites and report overall status

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Track test results
TOTAL_PASSED=0
TOTAL_FAILED=0

# Print banner
echo -e "\n${BOLD}${BLUE}====================================${NC}"
echo -e "${BOLD}${BLUE} Raycast Alarms Extension Test Suite ${NC}"
echo -e "${BOLD}${BLUE}====================================${NC}\n"

# Function to run a test file and update counts
run_test_file() {
  local test_file="$1"
  local test_name="$2"
  
  echo -e "${BOLD}${BLUE}Running $test_name...${NC}"
  
  # Make it executable
  chmod +x "$test_file"
  
  # Run the test
  "$test_file"
  local result=$?
  
  # Check result
  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✓ $test_name passed${NC}"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
  else
    echo -e "${RED}✗ $test_name failed${NC}"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
  fi
  
  echo -e "\n${BOLD}${BLUE}-----------------------------------${NC}\n"
}

# Check that jq is installed for JSON validation
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq is not installed. Some tests may fail.${NC}"
  echo -e "${YELLOW}To install jq: brew install jq${NC}"
fi

# Run each test suite
run_test_file "$(dirname "$0")/integration/alarms-test.sh" "Alarm Management Tests"
run_test_file "$(dirname "$0")/integration/trigger-test.sh" "Alarm Trigger Tests"

# Print final summary
echo -e "\n${BOLD}${BLUE}====================${NC}"
echo -e "${BOLD}${BLUE} Test Suite Summary ${NC}"
echo -e "${BOLD}${BLUE}====================${NC}"
echo -e "${GREEN}Total tests passed: $TOTAL_PASSED${NC}"
echo -e "${RED}Total tests failed: $TOTAL_FAILED${NC}"

# Set exit code based on overall result
if [ $TOTAL_FAILED -gt 0 ]; then
  echo -e "\n${RED}${BOLD}Test suite failed!${NC}"
  exit 1
else
  echo -e "\n${GREEN}${BOLD}All tests passed!${NC}"
  exit 0
fi 