#!/bin/bash
# Build script for Safari Bookmarks Parser
# Designed specifically for macOS and Raycast

echo "Building Safari Bookmarks Parser for macOS..."

# Build for macOS
go build -o ../../assets/bookmarks-parser bookmarks-parser.go

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build successful! Executable created in ../../assets/"
  # Make the executable file executable
  chmod +x ../../assets/bookmarks-parser
else
  echo "Build failed!"
  exit 1
fi

echo "Done!" 