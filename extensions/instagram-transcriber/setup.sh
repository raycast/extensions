#!/bin/bash

echo "🚀 Instagram Transcriber - Raycast Extension Setup"
echo "=================================================="
echo ""

# Check for required dependencies
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed"
        return 1
    else
        echo "✅ $1 is installed"
        return 0
    fi
}

echo "Checking dependencies..."
echo ""

MISSING_DEPS=0

if ! check_dependency "yt-dlp"; then
    MISSING_DEPS=1
    echo "   To install: brew install yt-dlp"
fi

if ! check_dependency "ffmpeg"; then
    MISSING_DEPS=1
    echo "   To install: brew install ffmpeg"
fi

if ! check_dependency "node"; then
    MISSING_DEPS=1
    echo "   To install: brew install node"
fi

if ! check_dependency "ray"; then
    echo "   Raycast CLI not found. Opening installation page..."
    open "https://developers.raycast.com/cli"
    MISSING_DEPS=1
fi

echo ""

if [ $MISSING_DEPS -eq 1 ]; then
    echo "⚠️  Please install missing dependencies before continuing."
    echo ""
    read -p "Would you like to install missing Homebrew packages now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if ! command -v brew &> /dev/null; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        if ! command -v yt-dlp &> /dev/null; then
            brew install yt-dlp
        fi
        
        if ! command -v ffmpeg &> /dev/null; then
            brew install ffmpeg
        fi
        
        if ! command -v node &> /dev/null; then
            brew install node
        fi
    else
        echo "Please install the missing dependencies manually and run this script again."
        exit 1
    fi
fi

echo ""
echo "Installing npm dependencies..."
npm install

echo ""
echo "Building extension..."
npm run build

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to test the extension in development mode"
echo "2. Or run 'ray import' to add it to Raycast"
echo "3. Configure your preferences in Raycast (optional Whisper API key)"
echo ""
echo "Note: The extension will request Speech Recognition permission on first use."
