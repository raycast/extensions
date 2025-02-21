#!/bin/bash

# This is the legacy installation script for VLC-based streaming.
# It is preserved for reference but should not be used in the new WebRTC implementation.

echo "WARNING: This script installs dependencies for the legacy VLC-based streaming implementation."
echo "The current version uses WebRTC and does not require these dependencies."
echo "Press Ctrl+C to cancel or any other key to continue..."
read -n 1 -s

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Homebrew if not installed
if ! command_exists brew; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install ffmpeg if not installed
if ! command_exists ffmpeg; then
    echo "Installing ffmpeg..."
    brew install ffmpeg
fi

# Install rtsp-simple-server if not installed
if ! command_exists rtsp-simple-server; then
    echo "Installing rtsp-simple-server..."
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Download the latest release
    curl -L -o rtsp-simple-server.tar.gz https://github.com/aler9/mediamtx/releases/download/v1.4.1/mediamtx_v1.4.1_darwin_amd64.tar.gz
    
    # Extract and install
    tar -xzf rtsp-simple-server.tar.gz
    sudo mv mediamtx /usr/local/bin/rtsp-simple-server
    
    # Cleanup
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    
    echo "rtsp-simple-server installed successfully!"
fi

echo "Legacy dependencies installed successfully!"
echo "Note: These dependencies are only needed for the VLC-based implementation."
echo "The current WebRTC implementation does not require these dependencies." 