#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Pre Publish Check
# @raycast.mode fullOutput

# Optional parameters:
# @raycast.icon 🤖
# @raycast.packageName dev

# Documentation:
# @raycast.description €B Critical Checks before "run publish"
# @raycast.author wdeu
# @raycast.authorURL https://raycast.com/wdeu

#!/bin/bash

# Raycast Extension Pre-Publish Check Script
# Version: 1.0
# Usage: ./pre-publish-check.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Symbols
CHECKMARK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"

echo ""
echo "🚀 Raycast Extension Pre-Publish Check"
echo "========================================"
echo ""

# Counter for issues
ISSUES=0
WARNINGS=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}${CHECKMARK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
    ((ISSUES++))
}

print_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

# Check 1: Node modules installed
echo "📦 Checking Dependencies..."
if [ ! -d "node_modules" ]; then
    print_error "node_modules not found. Run: npm install"
else
    print_success "Dependencies installed"
fi
echo ""

# Check 2: TypeScript Build
echo "🔨 Running TypeScript Build..."
if npm run build > /dev/null 2>&1; then
    print_success "Build passed"
else
    print_error "Build failed! Run: npm run build"
    echo "   Fix TypeScript errors before publishing"
fi
echo ""

# Check 3: Linting
echo "🔍 Running Linter..."
if npm run lint > /dev/null 2>&1; then
    print_success "Lint passed"
else
    print_error "Lint failed! Run: npm run lint"
    echo "   Fix linting errors or run: npm run fix-lint"
fi
echo ""

# Check 4: REMOVED (npm run build is sufficient)

# Check 5: Tests (if configured)
echo "🧪 Checking Tests..."
if grep -q "\"test\":" package.json; then
    if npm test > /dev/null 2>&1; then
        print_success "Tests passed"
    else
        print_error "Tests failed! Run: npm test"
    fi
else
    print_warning "No tests configured (optional)"
fi
echo ""

# Check 6: Invalid Icons
echo "🎨 Checking for Invalid Icons..."
INVALID_ICONS=$(grep -rn "Icon\.\(Truck\|Euro\|Barcode\)" src/ 2>/dev/null || true)
if [ -z "$INVALID_ICONS" ]; then
    print_success "No invalid icons found"
else
    print_error "Invalid icons detected:"
    echo "$INVALID_ICONS" | sed 's/^/   /'
    echo "   Fix: Truck→Box, Euro→Coins, Barcode→Hashtag"
fi
echo ""

# Check 7: Browser Storage APIs
echo "💾 Checking for Browser Storage..."
STORAGE_USAGE=$(grep -rn "localStorage\|sessionStorage" src/ 2>/dev/null || true)
if [ -z "$STORAGE_USAGE" ]; then
    print_success "No browser storage APIs found"
else
    print_error "Browser storage detected (not allowed in Raycast):"
    echo "$STORAGE_USAGE" | sed 's/^/   /'
    echo "   Use React state instead (useState, useReducer)"
fi
echo ""

# Check 8: REMOVED (too imprecise)

# Check 9: Extension Icon
echo "🖼️  Checking Extension Icon..."
if [ -f "assets/extension-icon.png" ]; then
    ICON_SIZE=$(sips -g pixelWidth -g pixelHeight assets/extension-icon.png 2>/dev/null | grep "pixel" | awk '{print $2}')
    if echo "$ICON_SIZE" | grep -q "512"; then
        print_success "Extension icon size correct (512x512)"
    else
        print_error "Icon size incorrect. Must be 512x512, found: $ICON_SIZE"
        echo "   Generate new icon at: https://ray.so/icon"
    fi
else
    print_error "Extension icon not found: assets/extension-icon.png"
fi
echo ""

# Check 10: Screenshots
echo "📸 Checking Screenshots..."
if [ -d "metadata" ] && [ -n "$(ls -A metadata/*.png 2>/dev/null)" ]; then
    SCREENSHOT_COUNT=$(ls metadata/*.png 2>/dev/null | wc -l)
    print_info "Found $SCREENSHOT_COUNT screenshot(s)"
    
    for screenshot in metadata/*.png; do
        HEIGHT=$(sips -g pixelHeight "$screenshot" 2>/dev/null | grep "pixelHeight" | awk '{print $2}')
        WIDTH=$(sips -g pixelWidth "$screenshot" 2>/dev/null | grep "pixelWidth" | awk '{print $2}')
        
        if [ "$HEIGHT" = "1250" ] && [ "$WIDTH" = "2000" ]; then
            print_success "$(basename "$screenshot"): ${WIDTH}x${HEIGHT} ✓"
        else
            print_error "$(basename "$screenshot"): ${WIDTH}x${HEIGHT} (must be 2000x1250)"
            echo "   Fix: sips --padToHeightWidth 1250 2000 --padColor 1C1C1E $screenshot"
        fi
    done
else
    print_warning "No screenshots found in metadata/"
    echo "   Create at least 1 screenshot (2000x1250px)"
fi
echo ""

# Check 11: Git Status
echo "📋 Checking Git Status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Uncommitted changes detected"
    echo "   Commit all changes before publishing"
    git status --short | sed 's/^/   /'
else
    print_success "Working tree clean"
fi
echo ""

# Check 12: README.md
echo "📖 Checking Documentation..."
if [ -f "README.md" ]; then
    README_LENGTH=$(wc -l < README.md)
    if [ "$README_LENGTH" -gt 50 ]; then
        print_success "README.md exists ($README_LENGTH lines)"
    else
        print_warning "README.md is short ($README_LENGTH lines)"
        echo "   Add comprehensive documentation"
    fi
else
    print_error "README.md not found"
fi
echo ""

# Check 13: CHANGELOG.md
echo "📝 Checking Changelog..."
if [ -f "CHANGELOG.md" ]; then
    print_success "CHANGELOG.md exists"
else
    print_warning "CHANGELOG.md not found (recommended)"
fi
echo ""

# Check 14: package.json validation
echo "📦 Checking package.json..."
REQUIRED_FIELDS=("name" "title" "description" "author" "license")
for field in "${REQUIRED_FIELDS[@]}"; do
    if grep -q "\"$field\":" package.json; then
        print_success "package.json has '$field'"
    else
        print_error "package.json missing '$field'"
    fi
done
echo ""

# Check 15: Default Credentials (if preferences exist)
echo "🔐 Checking Preferences..."
if grep -q "\"preferences\":" package.json; then
    if grep -q "\"default\":" package.json; then
        print_success "Default values provided for preferences"
    else
        print_warning "Consider adding default values for preferences"
        echo "   Example: \"default\": \"test\""
    fi
else
    print_info "No preferences configured"
fi
echo ""

# Summary
echo "========================================"
echo "📊 Summary"
echo "========================================"
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}${CHECKMARK} Perfect! Ready to publish!${NC}"
    echo ""
    echo "Run: npm run publish"
    echo ""
    exit 0
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}${WARNING} $WARNINGS warning(s) found${NC}"
    echo ""
    echo "You can publish, but consider fixing warnings first."
    echo ""
    read -p "Proceed with publish? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Run: npm run publish"
        exit 0
    else
        echo "Fix warnings and run this script again."
        exit 1
    fi
else
    echo -e "${RED}${CROSS} $ISSUES error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}${WARNING} $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Fix all errors before publishing!"
    echo ""
    echo "Quick fixes:"
    echo "  npm run build     # See TypeScript errors"
    echo "  npm run lint      # See linting errors"
    echo "  npm run fix-lint  # Auto-fix linting"
    echo ""
    exit 1
fi

