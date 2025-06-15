#!/bin/bash

# Capture Thought - Quick Start Script
echo "🧠 Starting Capture Thought Extension..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if dependencies are installed for the extension
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Raycast extension dependencies..."
    npm install
fi

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server
    npm install
    cd ..
fi

# Check if .env file exists in server directory
if [ ! -f "server/.env" ]; then
    echo "⚠️  Creating server/.env from config.example..."
    cp config.example server/.env
    echo "✏️  Please edit server/.env with your API keys:"
    echo "   - OPENAI_API_KEY"
    echo "   - NOTION_TOKEN"
    echo "   - NOTION_DATABASE_ID"
    echo ""
    echo "Press any key to continue after updating the .env file..."
    read -n 1 -s
fi

# Start the server in the background
echo "🚀 Starting the backend server..."
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 3

# Start Raycast extension development
echo "⚡ Starting Raycast extension development..."
echo "🎯 Extension commands available:"
echo "   - Capture Thought (Clipboard/Selection)"
echo "   - Capture Thought (Dictate)"
echo "   - Top Work Priorities"
echo "   - Top Life Priorities"
echo "   - Top Priorities (All)"
echo ""
echo "🌐 Server running at: http://localhost:3000"
echo "📊 Health check: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop both server and extension"

# Start Raycast development
npm run dev

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $SERVER_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait 