#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Homebrew if not installed
if ! command_exists brew; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install VLC if not installed
if ! [ -e "/Applications/VLC.app" ]; then
    echo "Installing VLC..."
    brew install --cask vlc
fi

# Install MediaMTX (formerly rtsp-simple-server) if not installed
if ! command_exists mediamtx; then
    echo "Installing MediaMTX..."
    brew install mediamtx
fi

echo "Dependencies installed successfully!"
echo "You can now stream from your Nest cameras using either WebRTC (Safari) or RTSP (VLC)." 