#!/bin/bash

# Test version of the install script - shows what it would do without making changes
# Run this first to verify the logic before running the real install script

echo "🧪 Clipaste Raycast Extension Installation - TEST MODE"
echo "====================================================="
echo "This will show what the installer would do without making changes"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}ℹ️  [TEST] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ [TEST] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  [TEST] $1${NC}"
}

print_error() {
    echo -e "${RED}❌ [TEST] $1${NC}"
}

print_would_do() {
    echo -e "${YELLOW}📝 [WOULD DO] $1${NC}"
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS only."
    echo "Current OS type: $OSTYPE"
    exit 1
fi

print_success "Running on macOS: $OSTYPE"

# Check if Raycast is installed
if ! command -v ray &> /dev/null; then
    print_error "Raycast CLI not found."
    print_would_do "Would exit with error and ask user to install Raycast"
    echo "To fix: Install Raycast from https://raycast.com"
    echo "Then run: npm install -g @raycast/api"
else
    print_success "Raycast CLI found: $(which ray)"
fi

# Check Homebrew
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found."
    print_would_do "Would install Homebrew with:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
else
    print_success "Homebrew found: $(which brew)"
    print_status "Homebrew version: $(brew --version | head -n1)"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found."
    print_would_do "Would run: brew install node"
else
    print_success "Node.js found: $(node --version) at $(which node)"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_warning "npm not found."
else
    print_success "npm found: $(npm --version)"
fi

# Check pngpaste
if ! command -v pngpaste &> /dev/null; then
    print_warning "pngpaste not found."
    print_would_do "Would run: brew install pngpaste"
else
    print_success "pngpaste found: $(which pngpaste)"
fi

# Check clipaste
CLIPASTE_INSTALL_DIR="$HOME/bin"
CLIPASTE_PATH="$CLIPASTE_INSTALL_DIR/clipaste"

print_status "Checking clipaste installation..."

if command -v clipaste &> /dev/null; then
    print_success "clipaste found on PATH: $(which clipaste)"
    print_status "clipaste version: $(clipaste --version 2>/dev/null || echo 'Version check failed')"
elif [[ -f "$CLIPASTE_PATH" ]]; then
    print_success "clipaste found at: $CLIPASTE_PATH"
else
    print_warning "clipaste not found."
    print_would_do "Would prompt user to install clipaste or continue anyway"
    echo "  Install from: https://github.com/markomanninen/clipaste"
    echo "  Or copy binary to: $CLIPASTE_PATH"
fi

# Check if we're in the right directory
if [[ -f "package.json" ]]; then
    print_success "Found package.json in current directory"
    if grep -q '"name": "clipaste-launcher"' package.json; then
        print_success "Confirmed this is the clipaste-launcher project"
    else
        print_warning "package.json found but doesn't appear to be clipaste-launcher"
    fi
else
    print_error "No package.json found in current directory"
    print_status "Current directory: $(pwd)"
    print_would_do "Script would fail - needs to be run from extension directory"
fi

# Check extension dependencies
if [[ -f "package.json" ]]; then
    print_would_do "Would run: npm install"
    if [[ -d "node_modules" ]]; then
        print_status "node_modules directory already exists"
    else
        print_status "node_modules directory would be created"
    fi
fi

print_would_do "Would run: npm run build"

# Path detection test
print_status "Testing path detection logic..."

echo ""
echo "🔍 Path Detection Results:"
echo "=========================="

# Test clipaste paths
POTENTIAL_CLIPASTE_PATHS=(
    "/usr/local/bin/clipaste"
    "/opt/homebrew/bin/clipaste"
    "$HOME/bin/clipaste"
    "$HOME/.local/bin/clipaste"
)

DETECTED_CLIPASTE="clipaste"
for testPath in "${POTENTIAL_CLIPASTE_PATHS[@]}"; do
    if [[ -f "$testPath" ]]; then
        echo "✅ Found clipaste at: $testPath"
        DETECTED_CLIPASTE="$testPath"
        break
    else
        echo "❌ Not found: $testPath"
    fi
done

# Test pngpaste paths
POTENTIAL_PNGPASTE_PATHS=(
    "/opt/homebrew/bin/pngpaste"
    "/usr/local/bin/pngpaste"
)

DETECTED_PNGPASTE="pngpaste"
for testPath in "${POTENTIAL_PNGPASTE_PATHS[@]}"; do
    if [[ -f "$testPath" ]]; then
        echo "✅ Found pngpaste at: $testPath"
        DETECTED_PNGPASTE="$testPath"
        break
    else
        echo "❌ Not found: $testPath"
    fi
done

echo ""
echo "📋 Would Configure Extension With:"
echo "=================================="
echo "clipaste binary: $DETECTED_CLIPASTE"
echo "pngpaste binary: $DETECTED_PNGPASTE"
echo "Default Output Directory: $HOME/Desktop"
echo "Enable pngpaste fallback: false"

echo ""
echo "🎯 Test Summary:"
echo "==============="

ISSUES=0

if ! command -v ray &> /dev/null; then
    echo "❌ Raycast CLI missing - installation would fail"
    ((ISSUES++))
fi

if ! command -v brew &> /dev/null; then
    echo "⚠️  Homebrew missing - would be installed automatically"
fi

if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js missing - would be installed via Homebrew"
fi

if ! command -v clipaste &> /dev/null && ! [[ -f "$CLIPASTE_PATH" ]]; then
    echo "⚠️  clipaste missing - would prompt user"
fi

if [[ ! -f "package.json" ]]; then
    echo "❌ Not in correct directory - installation would fail"
    ((ISSUES++))
fi

if [[ $ISSUES -eq 0 ]]; then
    echo "✅ All checks passed - installation should work!"
    echo ""
    echo "🚀 Ready to run the real installer:"
    echo "   ./install.sh"
else
    echo "❌ Found $ISSUES issue(s) - fix these before running installer"
fi

echo ""
echo "📖 Next Steps:"
echo "1. Fix any issues shown above"
echo "2. Run the real installer: ./install.sh"
echo "3. Or continue with manual installation if needed"