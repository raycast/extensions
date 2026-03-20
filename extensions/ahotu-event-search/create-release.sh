#!/bin/bash

# Create a standalone release package for distribution
# This allows team members to install without git or the monorepo

set -e

echo "📦 Creating Raycast Ahotu Search release package..."
echo ""

# Get version from package.json or use default
VERSION=${1:-"latest"}
PACKAGE_NAME="raycast-ahotu-search-${VERSION}.tar.gz"
RELEASE_DIR="release"

# Clean up old releases
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

# Create temporary build directory
TEMP_DIR=$(mktemp -d)
BUILD_DIR="${TEMP_DIR}/raycast-ahotu-search"

echo "📋 Copying files..."
mkdir -p "${BUILD_DIR}"

# Copy necessary files
cp -r src "${BUILD_DIR}/"
cp package.json "${BUILD_DIR}/"
cp tsconfig.json "${BUILD_DIR}/"
cp .eslintrc.json "${BUILD_DIR}/"
cp .prettierrc.json "${BUILD_DIR}/"
cp .gitignore "${BUILD_DIR}/"
cp README.md "${BUILD_DIR}/"
cp ICON-INFO.md "${BUILD_DIR}/"
cp command-icon.png "${BUILD_DIR}/"

# Create a standalone install script
cat > "${BUILD_DIR}/install.sh" << 'EOF'
#!/bin/bash

# Standalone installer for Ahotu Event Search Raycast Extension
set -e

echo "🚀 Installing Ahotu Event Search for Raycast"
echo "============================================"
echo ""

# Check prerequisites
if ! command -v raycast &> /dev/null; then
    echo "❌ Raycast is not installed."
    echo "   Download from: https://raycast.com/"
    exit 1
fi
echo "✅ Raycast found"

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

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "⚠️  Node.js 18+ required. Current: $NODE_VERSION"
    read -p "   Continue anyway? (y/N): " continue
    if [[ ! $continue =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo "✅ Node.js $NODE_VERSION"

echo ""
echo "📦 Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🔧 Importing to Raycast..."
pnpm dev

if [ $? -ne 0 ]; then
    echo "❌ Failed to import extension"
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Open Raycast (⌘ + Space)"
echo "   2. Type 'Search Events'"
echo "   3. Press ⌘ + , to configure"
echo "   4. Configure your credentials:"
echo "      - API URL: https://core.ahotu.com"
echo "      - User Email: Your Ahotu account email"
echo "      - User Token: Your authentication token"
echo "      - API Key: Your API key"
echo ""
echo "💡 Quick search examples:"
echo "   marathon country:USA @2024"
echo "   triathlon month:jun"
echo "   running -virtual @client"
echo ""
EOF

chmod +x "${BUILD_DIR}/install.sh"

# Create README for standalone install
cat > "${BUILD_DIR}/STANDALONE-INSTALL.md" << 'EOF'
# Standalone Installation

This is a standalone distribution of the Ahotu Event Search Raycast extension.

## Quick Install

1. Extract this archive
2. Open Terminal and navigate to this folder
3. Run the installer:
   ```bash
   ./install.sh
   ```

## Manual Installation

If the installer doesn't work:

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Import to Raycast
pnpm dev
```

## Configuration

After installation:

1. Open Raycast (⌘ + Space)
2. Search for "Search Events"
3. Press ⌘ + , to open preferences
4. Configure:
   - **API Base URL**: `https://core.ahotu.com`
   - **API Token**: Get from your team lead

## Usage

Search for events with powerful filters:

- `marathon country:USA @2024`
- `triathlon month:jun reg:California`
- `running -virtual @client`

See README.md for full documentation.

## Troubleshooting

**"pnpm: command not found"**
```bash
npm install -g pnpm
```

**"API request failed: 401"**
- Check your API token in Raycast preferences

**Need help?**
- Check README.md
- Ask in your team Slack channel
EOF

# Create the tarball
echo "📦 Creating tarball..."
cd "${TEMP_DIR}"
tar -czf "${PACKAGE_NAME}" raycast-ahotu-search

# Move to release directory
mv "${PACKAGE_NAME}" "${OLDPWD}/${RELEASE_DIR}/"

# Cleanup
rm -rf "${TEMP_DIR}"

echo ""
echo "✅ Release package created!"
echo "   📁 Location: ${RELEASE_DIR}/${PACKAGE_NAME}"
echo ""
echo "📤 Distribution options:"
echo ""
echo "1. Upload to internal file server:"
echo "   scp ${RELEASE_DIR}/${PACKAGE_NAME} your-server:/path/to/downloads/"
echo ""
echo "2. Upload to GitHub releases:"
echo "   gh release create v${VERSION} ${RELEASE_DIR}/${PACKAGE_NAME}"
echo ""
echo "3. Share via Google Drive/Dropbox:"
echo "   Upload ${RELEASE_DIR}/${PACKAGE_NAME} and share the link"
echo ""
echo "📋 Installation instructions for team:"
echo "   1. Download ${PACKAGE_NAME}"
echo "   2. tar -xzf ${PACKAGE_NAME}"
echo "   3. cd raycast-ahotu-search"
echo "   4. ./install.sh"
echo ""
