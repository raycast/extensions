#!/bin/bash

# One-line web installer for Ahotu Event Search Raycast Extension
# Usage: curl -fsSL <URL_TO_THIS_SCRIPT> | bash
# Or: bash <(curl -fsSL <URL_TO_THIS_SCRIPT>)

set -e

DOWNLOAD_URL="${DOWNLOAD_URL:-}"  # Set this to your distribution URL
INSTALL_DIR="${HOME}/.raycast-extensions/ahotu-event-search"

echo "🚀 Ahotu Event Search - Web Installer"
echo "====================================="
echo ""

# Check if DOWNLOAD_URL is set
if [ -z "$DOWNLOAD_URL" ]; then
    echo "⚠️  DOWNLOAD_URL not set."
    echo ""
    echo "Please download manually:"
    echo "  1. Get the latest release from your team"
    echo "  2. Extract: tar -xzf raycast-ahotu-search-*.tar.gz"
    echo "  3. Install: cd raycast-ahotu-search && ./install.sh"
    echo ""
    exit 1
fi

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v raycast &> /dev/null; then
    echo "❌ Raycast not installed. Get it from: https://raycast.com/"
    exit 1
fi
echo "✅ Raycast"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Get it from: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js $(node --version)"

REQUIRED_PNPM_VERSION="10.29.3"

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing pnpm@${REQUIRED_PNPM_VERSION}..."
    npm install -g pnpm@${REQUIRED_PNPM_VERSION}
else
    PNPM_VERSION=$(pnpm --version)
    PNPM_MAJOR=$(echo $PNPM_VERSION | cut -d'.' -f1)
    if [ "$PNPM_MAJOR" -lt 9 ]; then
        echo "⚠️  pnpm $PNPM_VERSION is too old. Upgrading to ${REQUIRED_PNPM_VERSION}..."
        npm install -g pnpm@${REQUIRED_PNPM_VERSION}
    fi
fi
echo "✅ pnpm $(pnpm --version)"

echo ""
echo "📥 Downloading extension..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download and extract
curl -fsSL "$DOWNLOAD_URL" -o raycast-ahotu-search.tar.gz
tar -xzf raycast-ahotu-search.tar.gz
cd raycast-ahotu-search

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🔧 Importing to Raycast..."
pnpm dev

# Optional: Copy to permanent location
if [ ! -d "$INSTALL_DIR" ]; then
    echo ""
    echo "💾 Saving to $INSTALL_DIR..."
    mkdir -p "$(dirname "$INSTALL_DIR")"
    cp -r . "$INSTALL_DIR"
fi

# Cleanup
cd ~
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Open Raycast (⌘ + Space)"
echo "   2. Type 'Search Events'"
echo "   3. Press ⌘ + , to configure"
echo "   4. Configure your credentials (ask your team lead):"
echo "      - API URL: https://core.ahotu.com"
echo "      - User Email: Your Ahotu account email"
echo "      - User Token: Your authentication token"
echo "      - API Key: Your API key"
echo ""
echo "💡 Try: marathon country:USA @2024"
echo ""
