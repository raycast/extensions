#!/bin/bash

echo "🖼️ Resizing screenshots to Raycast requirements (2000x1250)..."

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    brew install imagemagick
fi

# Check if metadata directory exists
if [ ! -d "metadata" ]; then
    echo "❌ metadata directory not found"
    exit 1
fi

# Resize screenshots in metadata folder
for file in metadata/*.png; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "Resizing $filename..."
        
        # Create a 2000x1250 canvas and place the image centered
        magick "$file" -resize 2000x1250 -background "#1a1a1a" -gravity center -extent 2000x1250 "$file"
        
        echo "✅ Resized $filename"
    fi
done

echo "✅ All screenshots resized to 2000x1250!"
echo ""
echo "Note: If the screenshots look stretched, it's better to retake them using Raycast's Window Capture feature."
