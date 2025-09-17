#!/bin/bash

# Clipaste Raycast Extension - Automated Installation Script
# This script will install all dependencies and set up the extension

set -e  # Exit on any error

echo "🚀 Clipaste Raycast Extension Installation"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS only."
    exit 1
fi

# Check if Raycast is installed
if ! command -v ray &> /dev/null; then
    print_error "Raycast CLI not found. Please install Raycast first from https://raycast.com"
    print_status "After installing Raycast, run: npm install -g @raycast/api"
    exit 1
fi

print_success "Raycast CLI found"

# Check and install Homebrew if needed
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add brew to PATH for current session
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f "/usr/local/bin/brew" ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    print_success "Homebrew found"
fi

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing Node.js..."
    brew install node
else
    print_success "Node.js found: $(node --version)"
fi

# Install pngpaste for image clipboard support
if ! command -v pngpaste &> /dev/null; then
    print_status "Installing pngpaste for image clipboard support..."
    brew install pngpaste
else
    print_success "pngpaste found: $(which pngpaste)"
fi

# Install or update clipaste
CLIPASTE_INSTALL_DIR="$HOME/bin"
CLIPASTE_PATH="$CLIPASTE_INSTALL_DIR/clipaste"

print_status "Setting up clipaste..."

# Create bin directory if it doesn't exist
mkdir -p "$CLIPASTE_INSTALL_DIR"

# Check if clipaste is already installed and get version
if command -v clipaste &> /dev/null || [[ -f "$CLIPASTE_PATH" ]]; then
    print_success "clipaste found"
else
    print_warning "clipaste not found. Please install clipaste first."
    print_status "You can install it from: https://github.com/markomanninen/clipaste"
    print_status "Or if you have the binary, copy it to: $CLIPASTE_PATH"
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install extension dependencies
print_status "Installing extension dependencies..."
npm install

# Build the extension
print_status "Building extension..."
npm run build

# Create/update configuration with detected paths
PNGPASTE_PATH=$(which pngpaste 2>/dev/null || echo "/opt/homebrew/bin/pngpaste")

print_status "Configuring extension preferences..."

# Create a setup helper script
cat > setup-preferences.js << 'EOF'
const fs = require('fs');
const os = require('os');
const path = require('path');

// Detect clipaste path
let clipastePath = 'clipaste';
const potentialPaths = [
    '/usr/local/bin/clipaste',
    '/opt/homebrew/bin/clipaste',
    path.join(os.homedir(), 'bin/clipaste'),
    path.join(os.homedir(), '.local/bin/clipaste')
];

for (const testPath of potentialPaths) {
    if (fs.existsSync(testPath)) {
        clipastePath = testPath;
        break;
    }
}

// Detect pngpaste path
let pngpastePath = 'pngpaste';
const pngpastePotentialPaths = [
    '/opt/homebrew/bin/pngpaste',
    '/usr/local/bin/pngpaste'
];

for (const testPath of pngpastePotentialPaths) {
    if (fs.existsSync(testPath)) {
        pngpastePath = testPath;
        break;
    }
}

console.log(`Detected clipaste path: ${clipastePath}`);
console.log(`Detected pngpaste path: ${pngpastePath}`);
console.log('');
console.log('📋 Extension Configuration:');
console.log('==========================');
console.log(`clipaste binary: ${clipastePath}`);
console.log(`pngpaste binary: ${pngpastePath}`);
console.log(`Default Output Directory: ${os.homedir()}/Desktop`);
console.log('Enable pngpaste fallback: false (you can enable in Raycast preferences)');
console.log('');
console.log('🎉 Installation complete!');
console.log('');
console.log('Next steps:');
console.log('1. Open Raycast (Cmd+Space)');
console.log('2. Type "Clipaste Launcher" to run the extension');
console.log('3. Configure paths in Raycast preferences if needed');
console.log('4. Try pasting some content!');
EOF

node setup-preferences.js
rm setup-preferences.js

print_success "Installation completed!"

echo ""
echo "🎉 Clipaste Raycast Extension is ready!"
echo "======================================"
echo ""
echo "📖 Quick Start:"
echo "1. Open Raycast (⌘+Space)"
echo "2. Type 'Clipaste Launcher'"
echo "3. Choose your mode (paste, copy, ai, random)"
echo "4. Fill in options and hit Enter"
echo ""
echo "⚙️  If you need to adjust paths:"
echo "• Open Raycast → Extensions → Clipaste Launcher → Preferences"
echo "• Update the binary paths if they're incorrect"
echo ""
echo "🔧 Troubleshooting:"
echo "• If clipaste command fails, check the binary path in preferences"
echo "• For image support, enable 'pngpaste fallback' in preferences"
echo "• Default output directory is ~/Desktop (configurable)"
echo ""
print_success "Happy clipboard management! 📋✨"