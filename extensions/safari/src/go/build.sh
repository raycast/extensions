#!/bin/bash
# Build script for Safari Bookmarks Parser
# Designed specifically for macOS and Raycast

echo "Building Safari Bookmarks Parser for macOS..."

# Build for macOS
go build -o ../tools/bookmarks-parser bookmarks-parser.go

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build successful! Executable created in ../tools/"
  # Make the executable file executable
  chmod +x ../tools/bookmarks-parser
else
  echo "Build failed!"
  exit 1
fi

echo "Done!" 