#!/bin/bash

echo "🚀 Installing Cheatsheets Remastered..."

# Check if Raycast is installed
if ! command -v ray &> /dev/null; then
    echo "❌ Raycast CLI not found. Please install Raycast first:"
    echo "   https://raycast.com/"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the extension
echo "🔨 Building extension..."
npm run build

echo "✅ Installation complete!"
echo ""
echo "To start developing:"
echo "  npm run dev"
echo ""
echo "To build for production:"
echo "  npm run build"
echo ""
echo "The extension should now appear in your Raycast extensions list."
