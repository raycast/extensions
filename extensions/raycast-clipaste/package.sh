#!/bin/bash

# Clipaste Raycast Extension - Packaging Script
# Creates a distribution-ready package

set -e

echo "📦 Creating distribution package..."

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
PACKAGE_NAME="clipaste-raycast-full-v${VERSION}"

echo "Version: ${VERSION}"

# Clean and build
echo "🧹 Cleaning previous builds..."
rm -rf node_modules dist build *.zip

echo "📥 Installing dependencies..."
npm install

echo "🔨 Building extension..."
npm run build

echo "🗜️  Creating package..."
zip -r "${PACKAGE_NAME}.zip" \
  src/ \
  assets/ \
  package.json \
  README.md \
  DISTRIBUTION.md \
  install.sh \
  LICENSE \
  .gitignore \
  -x "*.DS_Store" "node_modules/*" "dist/*"

echo "✅ Package created: ${PACKAGE_NAME}.zip"

# Calculate file size
SIZE=$(ls -lh "${PACKAGE_NAME}.zip" | awk '{print $5}')
echo "📊 Package size: ${SIZE}"

echo ""
echo "🎉 Distribution package ready!"
echo "📁 File: ${PACKAGE_NAME}.zip"
echo ""
echo "Next steps:"
echo "1. Test the package on a clean system"
echo "2. Create a GitHub release"
echo "3. Upload the zip file"
echo "4. Add release notes"