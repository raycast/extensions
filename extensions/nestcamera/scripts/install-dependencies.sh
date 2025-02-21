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

echo "All dependencies installed successfully!" 