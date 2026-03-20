#!/bin/bash

# Ahotu Event Search - Raycast Extension Installer
# This script automates the installation process for team members

set -e  # Exit on any error

echo "🚀 Ahotu Event Search - Raycast Extension Installer"
echo "=================================================="
echo ""

# Check if Raycast is installed (check for the macOS app)
if [ ! -d "/Applications/Raycast.app" ]; then
    echo "❌ Raycast is not installed."
    echo "   Please install Raycast from https://raycast.com/"
    echo "   Looking for: /Applications/Raycast.app"
    exit 1
fi
echo "✅ Raycast found"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js found ($NODE_VERSION)"

# Check Node.js version (should be 18+)
NODE_MAJOR_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    echo "⚠️  Warning: Node.js version should be 18 or higher"
    echo "   Current version: $NODE_VERSION"
    echo "   The extension may not work correctly"
    read -p "   Continue anyway? (y/N): " continue
    if [[ ! $continue =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if npm is available (needed to install pnpm)
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

# Check/install pnpm with correct version
REQUIRED_PNPM_VERSION="10.29.3"

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing pnpm@${REQUIRED_PNPM_VERSION}..."
    npm install -g pnpm@${REQUIRED_PNPM_VERSION}
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install pnpm"
        echo "   Please install manually: npm install -g pnpm@${REQUIRED_PNPM_VERSION}"
        exit 1
    fi
else
    PNPM_VERSION=$(pnpm --version)
    PNPM_MAJOR=$(echo $PNPM_VERSION | cut -d'.' -f1)
    if [ "$PNPM_MAJOR" -lt 9 ]; then
        echo "⚠️  pnpm version too old: $PNPM_VERSION (need 9.0.0+)"
        echo "   Upgrading to pnpm@${REQUIRED_PNPM_VERSION}..."
        npm install -g pnpm@${REQUIRED_PNPM_VERSION}
    fi
fi
echo "✅ pnpm $(pnpm --version)"

echo ""
echo "📦 Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check if icon exists (optional check - icon should be included)
if [ ! -f "command-icon.png" ]; then
    echo "⚠️  Warning: Icon file (command-icon.png) not found"
    echo "   The extension will use a default icon"
    echo "   See ICON-INFO.md for instructions"
    echo ""
fi

echo "🔧 Starting development server to register extension with Raycast..."
echo ""

# Run dev server, wait for it to build, then continue
pnpm dev > /tmp/raycast-ahotu-install.log 2>&1 &
DEV_PID=$!

# Wait for build to complete
echo "   ⏳ Building extension..."
sleep 3

# Check if "ready" appears in the log
for i in {1..10}; do
    if grep -q "ready.*built extension successfully" /tmp/raycast-ahotu-install.log; then
        echo "   ✅ Extension built and registered with Raycast!"
        break
    fi
    sleep 1
done

# Stop the dev server since we only needed it to register
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null || true

echo ""
echo "🎉 Extension is now available in Raycast!"
echo "   (The extension persists even after stopping the dev server)"
echo ""

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Open Raycast (⌘ + Space)"
echo "   2. Type 'Search Events'"
echo "   3. Press ⌘ + , to open preferences"
echo "   4. Configure your credentials:"
echo "      - API Base URL: https://core.ahotu.com"
echo "      - User Email: Your Ahotu account email"
echo "      - User Token: Your authentication token"
echo "      - API Key: Your API key"
echo ""
echo "💡 Usage examples:"
echo "   - Search: marathon country:USA @2024"
echo "   - Search: triathlon month:jun reg:California"
echo "   - Search: running -virtual @client"
echo ""
echo "🔄 Development tips:"
echo "   • To modify the extension and see live changes:"
echo "     cd $(pwd) && pnpm dev"
echo "   • To rebuild: pnpm run build"
echo ""
echo "📖 For more info:"
echo "   • INSTALL-FOR-TEAM.md - Installation guide"
echo "   • BETTER-DISTRIBUTION.md - Easier distribution options (recommended!)"
echo "   • README.md - Full documentation"
echo ""
