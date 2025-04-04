#!/bin/bash

# Install ImageMagick if not already installed
if ! command -v convert &> /dev/null
then
    brew install imagemagick
fi

# Resize all PNG files in assets directory to 512x512
for file in assets/*.png; do
    if [ -f "$file" ]; then
        convert "$file" -resize 512x512! "$file"
        echo "Resized $file to 512x512"
    fi
done

echo "All icons resized successfully!"