#!/bin/bash

# This script resizes the Anki icon to 512x512 pixels for use as a Raycast extension icon
# It uses ImageMagick's convert tool to resize the image

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Please install it using 'brew install imagemagick'"
    exit 1
fi

# Path to the source icon
SOURCE_ICON="./anki-icon.png"

# Path to the output icon
OUTPUT_ICON="./anki-icon-512.png"

# Resize the icon to 512x512 pixels
convert "$SOURCE_ICON" -resize 512x512 "$OUTPUT_ICON"

# Replace the extension icon with the resized Anki icon
cp "$OUTPUT_ICON" "./extension-icon.png"

echo "Icon resized and replaced successfully!"
