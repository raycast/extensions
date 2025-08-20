#!/bin/bash

echo "🚀 Installing Comet Browser Raycast Extension..."

# Build the extension
echo "📦 Building extension..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📝 To install the extension permanently:"
echo ""
echo "1. Open Raycast (⌘+Space)"
echo "2. Type 'Import Extension' and press Enter"
echo "3. Select this folder:"
echo "   $(pwd)"
echo ""
echo "4. Click 'Import Extension'"
echo ""
echo "Once imported, you can:"
echo "- Use 'Search Comet' to search tabs and history"
echo "- Use 'Search Tabs' to search only open tabs"
echo "- Use 'Search History' to search only browser history"
echo ""
echo "The extension will work without needing to run 'npm run dev'!"