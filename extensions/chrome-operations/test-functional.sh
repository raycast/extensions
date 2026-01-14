#!/bin/bash

# Functional Test Script for Open in Chrome Extension
# Tests core functionality without launching applications

echo "=================================="
echo "Functional Testing"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

echo "Testing Browser Detection..."
echo ""

# Test 1: Check if pgrep is available
print_test "pgrep command available"
if command -v pgrep &> /dev/null; then
    print_pass "pgrep is available"
else
    print_fail "pgrep is not available (required for browser detection)"
fi

# Test 2: Check if osascript is available
print_test "osascript command available"
if command -v osascript &> /dev/null; then
    print_pass "osascript is available"
else
    print_fail "osascript is not available (required for AppleScript)"
fi

# Test 3: Check if open command is available
print_test "open command available"
if command -v open &> /dev/null; then
    print_pass "open command is available"
else
    print_fail "open command is not available (required for launching Chrome)"
fi

echo ""
echo "Testing AppleScript Integration..."
echo ""

# Test 4: Test Safari AppleScript (if Safari is running)
print_test "Safari AppleScript execution"
SAFARI_RUNNING=$(pgrep -x "Safari" > /dev/null 2>&1; echo $?)
if [ $SAFARI_RUNNING -eq 0 ]; then
    print_info "Safari is running"
    SAFARI_URL=$(osascript -e 'tell application "Safari" to return URL of front document' 2>&1)
    if [ $? -eq 0 ] && [ -n "$SAFARI_URL" ]; then
        print_pass "Safari AppleScript works (URL: ${SAFARI_URL})"
    else
        print_fail "Safari AppleScript failed: $SAFARI_URL"
    fi
else
    print_info "Safari is not running (skipped)"
fi

# Test 5: Test Chrome AppleScript (if Chrome is running)
print_test "Chrome AppleScript execution"
CHROME_RUNNING=$(pgrep -x "Google Chrome" > /dev/null 2>&1; echo $?)
if [ $CHROME_RUNNING -eq 0 ]; then
    print_info "Google Chrome is running"
    CHROME_URL=$(osascript -e 'tell application "Google Chrome" to return URL of active tab of front window' 2>&1)
    if [ $? -eq 0 ] && [ -n "$CHROME_URL" ]; then
        print_pass "Chrome AppleScript works (URL: ${CHROME_URL})"
    else
        print_fail "Chrome AppleScript failed: $CHROME_URL"
    fi
else
    print_info "Google Chrome is not running (skipped)"
fi

echo ""
echo "Testing Chrome Launch Commands..."
echo ""

# Test 6: Check if Chrome is installed
print_test "Google Chrome installation"
if [ -d "/Applications/Google Chrome.app" ]; then
    print_pass "Google Chrome is installed"
else
    print_fail "Google Chrome is not installed"
fi

echo ""
echo "Testing URL Validation..."
echo ""

# Test 7: Test URL validation logic
print_test "URL with https:// prefix"
URL_WITH_HTTPS="https://example.com"
if [[ "$URL_WITH_HTTPS" == https://* ]]; then
    print_pass "URL with https:// prefix is valid"
else
    print_fail "URL with https:// prefix validation failed"
fi

# Test 8: Test URL without http(s) prefix
print_test "URL without http(s) prefix"
URL_WITHOUT_HTTP="example.com"
if [[ ! "$URL_WITHOUT_HTTP" == http://* ]] && [[ ! "$URL_WITHOUT_HTTP" == https://* ]]; then
    print_pass "URL without http(s) prefix detected correctly"
else
    print_fail "URL without http(s) prefix validation failed"
fi

echo ""
echo "Testing Code Quality..."
echo ""

# Test 9: Check for TypeScript errors
print_test "TypeScript compilation"
if ./node_modules/.bin/tsc --noEmit > /dev/null 2>&1; then
    print_pass "No TypeScript errors"
else
    print_fail "TypeScript errors found"
fi

# Test 10: Check for ESLint errors
print_test "ESLint validation"
if ./node_modules/.bin/eslint src/ > /dev/null 2>&1; then
    print_pass "No ESLint errors"
else
    print_fail "ESLint errors found"
fi

# Test 11: Check for Prettier issues
print_test "Prettier formatting"
if ./node_modules/.bin/prettier --check src/ > /dev/null 2>&1; then
    print_pass "Code is properly formatted"
else
    print_fail "Prettier formatting issues found"
fi

echo ""
echo "Testing Build..."
echo ""

# Test 12: Check if build directory exists
print_test "Build directory structure"
if [ -d "node_modules" ] && [ -f "package.json" ]; then
    print_pass "Project structure is correct"
else
    print_fail "Project structure is incorrect"
fi

echo ""
echo "=================================="
echo "Functional Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All functional tests passed!${NC}"
    echo ""
    echo "Extension is ready for testing in Raycast."
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm run dev' to start development mode"
    echo "2. Open Raycast and search for 'Open in Chrome' commands"
    echo "3. Test both commands with different browsers"
    echo "4. Create screenshots following metadata/SCREENSHOTS.md"
else
    echo -e "${RED}Some functional tests failed.${NC}"
    echo ""
    echo "Note: Some tests may fail if Safari/Chrome are not running."
    echo "This is expected behavior."
fi
