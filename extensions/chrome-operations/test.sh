#!/bin/bash

# Manual Test Script for Open in Chrome Extension
# This script helps you test all functionality before submitting to the Store

echo "=================================="
echo "Open in Chrome Extension Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
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

# Check prerequisites
echo "Checking prerequisites..."

if [ ! -d "node_modules" ]; then
    print_fail "node_modules not found. Run 'npm install' first."
    exit 1
fi
print_pass "Dependencies installed"

if [ ! -f "package.json" ]; then
    print_fail "package.json not found"
    exit 1
fi
print_pass "package.json found"

echo ""

# TypeScript compilation check
print_test "TypeScript compilation"
if ./node_modules/.bin/tsc --noEmit > /dev/null 2>&1; then
    print_pass "TypeScript compilation successful"
else
    print_fail "TypeScript compilation failed"
fi

echo ""

# Package.json validation
print_test "Package.json validation"

# Check license
if grep -q '"license": "MIT"' package.json; then
    print_pass "License is MIT"
else
    print_fail "License is not MIT"
fi

# Check author
if grep -q '"author":' package.json; then
    print_pass "Author field present"
else
    print_fail "Author field missing"
fi

# Check platforms
if grep -A 1 '"platforms"' package.json | grep -q '"macOS"'; then
    print_pass "Platforms set to macOS"
else
    print_fail "Platforms not set correctly"
fi

# Check for Windows (should not be present)
if grep -q '"Windows"' package.json; then
    print_fail "Windows platform found (should be macOS only)"
else
    print_pass "Windows platform not found"
fi

echo ""

# File structure check
print_test "File structure"

if [ -f "src/open-in-chrome.ts" ]; then
    print_pass "open-in-chrome.ts found"
else
    print_fail "open-in-chrome.ts not found"
fi

if [ -f "src/open-chrome-incognito.ts" ]; then
    print_pass "open-chrome-incognito.ts found"
else
    print_fail "open-chrome-incognito.ts not found"
fi

if [ -f "src/utils/browser-helpers.ts" ]; then
    print_pass "browser-helpers.ts found"
else
    print_fail "browser-helpers.ts not found"
fi

if [ -f "CHANGELOG.md" ]; then
    print_pass "CHANGELOG.md found"
else
    print_fail "CHANGELOG.md not found"
fi

if [ -f "README.md" ]; then
    print_pass "README.md found"
else
    print_fail "README.md not found"
fi

if [ -d "metadata" ]; then
    print_pass "metadata directory found"
else
    print_fail "metadata directory not found"
fi

echo ""

# Icon check
print_test "Icon file"

if [ -f "assets/extension-icon.png" ]; then
    ICON_INFO=$(file assets/extension-icon.png)
    if echo "$ICON_INFO" | grep -q "512 x 512"; then
        print_pass "Icon is 512x512px PNG"
    else
        print_fail "Icon is not 512x512px: $ICON_INFO"
    fi
else
    print_fail "Icon file not found"
fi

echo ""

# Screenshots check
print_test "Screenshots"

SCREENSHOT_COUNT=$(find metadata -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SCREENSHOT_COUNT" -ge 3 ]; then
    print_pass "Found $SCREENSHOT_COUNT screenshots (minimum 3 required)"
elif [ "$SCREENSHOT_COUNT" -gt 0 ]; then
    print_fail "Found $SCREENSHOT_COUNT screenshots (need at least 3)"
else
    print_fail "No screenshots found (minimum 3 required)"
fi

echo ""

# Documentation check
print_test "Documentation"

if [ -f "metadata/SCREENSHOTS.md" ]; then
    print_pass "Screenshots guide found"
else
    print_fail "Screenshots guide not found"
fi

if [ -f "docs/SUBMISSION_CHECKLIST.md" ]; then
    print_pass "Submission checklist found"
else
    print_fail "Submission checklist not found"
fi

echo ""

# Code quality checks
print_test "Code quality"

# Check for any
if grep -r "any" src/ --include="*.ts" | grep -v "Binary file" | grep -v "node_modules" > /dev/null 2>&1; then
    print_fail "Found 'any' type in code (use specific types)"
else
    print_pass "No 'any' types found"
fi

# Check for console.log
if grep -r "console\.log" src/ --include="*.ts" | grep -v "Binary file" > /dev/null 2>&1; then
    print_fail "Found console.log in code"
else
    print_pass "No console.log statements"
fi

echo ""

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All automated tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm run dev' to start development mode"
    echo "2. Test both commands manually in Raycast"
    echo "3. Create screenshots following metadata/SCREENSHOTS.md"
    echo "4. Run 'npm run build' (requires Raycast CLI)"
    echo "5. Run 'npm run lint' (requires Raycast CLI)"
    echo "6. Complete items in docs/SUBMISSION_CHECKLIST.md"
else
    echo -e "${RED}Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
