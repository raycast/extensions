#!/bin/bash

# GPT Rewriter Raycast Extension Setup Script

echo "🚀 Setting up GPT Rewriter Raycast Extension"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cat > .env << EOF
# GPT Rewriter Environment Variables
# Copy your API keys here for development

OPENAI_API_KEY=your_openai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
USE_OPENROUTER=true
DEFAULT_MODEL=gpt-4o-mini
TEMPERATURE=0.7
MAX_TOKENS=1024
EOF
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file with your actual API keys"
else
    echo "✅ .env file already exists"
fi

# Check if Raycast CLI is installed
if ! command -v ray &> /dev/null; then
    echo "⚠️  Raycast CLI not found. Installing..."
    npm install -g @raycast/api
    if [ $? -eq 0 ]; then
        echo "✅ Raycast CLI installed"
    else
        echo "❌ Failed to install Raycast CLI"
        echo "Please install manually: npm install -g @raycast/api"
    fi
else
    echo "✅ Raycast CLI detected"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Run 'npm run dev' to start development"
echo "3. Import the extension in Raycast"
echo "4. Test the commands"
echo ""
echo "🔧 Development commands:"
echo "  npm run dev     - Start development server"
echo "  npm run build   - Build for production"
echo "  npm run lint    - Run linter"
echo "  npm run publish - Publish to Raycast store"
echo ""
echo "📖 See EXTENSION_README.md for detailed documentation"
