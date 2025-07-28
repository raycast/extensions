#!/bin/bash

echo "🚀 GitLab MR Manager - Raycast Extension"
echo "========================================"
echo ""

# Check if Raycast is installed
if ! command -v ray &> /dev/null; then
    echo "❌ Raycast CLI not found. Please install Raycast CLI first:"
    echo "   npm install -g @raycast/api"
    exit 1
fi

echo "✅ Raycast CLI found"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies installed"

# Build the extension
echo "🔨 Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Extension built successfully"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Open Raycast"
    echo "2. Go to Extensions preferences"
    echo "3. Add this extension by importing the built files"
    echo "4. Configure your GitLab URL and Personal Access Token"
    echo "5. Use the 'List Merge Requests' command"
    echo ""
    echo "💡 Development mode:"
    echo "   Run 'npm run dev' to start development mode"
else
    echo "❌ Build failed"
    exit 1
fi
