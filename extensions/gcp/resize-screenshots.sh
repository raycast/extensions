#!/bin/bash

echo "🖼️ Resizing screenshots to Raycast requirements (2000x1250)..."

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install imagemagick
    else
        echo "❌ Homebrew not found. Please install ImageMagick manually:"
        echo "   brew install imagemagick"
        exit 1
    fi
fi

# Check if metadata directory exists
if [ ! -d "metadata" ]; then
    echo "❌ metadata directory not found"
    exit 1
fi

# Create backup directory if it doesn't exist
if [ ! -d "metadata/originals" ]; then
    mkdir -p "metadata/originals"
    echo "📁 Created backup directory: metadata/originals"
fi

# Counter for processed files
processed_count=0

# Resize screenshots in metadata folder
for file in metadata/*.{png,jpg,jpeg}; do
    # Skip if file doesn't exist (glob didn't match)
    [ ! -f "$file" ] && continue
    
    filename=$(basename "$file")
    backup_file="metadata/originals/$filename"
    
    # Skip if it's already a backup file
    [[ "$file" == *"/originals/"* ]] && continue
    
    echo "Processing $filename..."
    
    # Create backup if it doesn't exist
    if [ ! -f "$backup_file" ]; then
        cp "$file" "$backup_file"
        echo "📋 Backed up original to originals/$filename"
    fi
    
    # Get original dimensions
    original_size=$(magick identify -format "%wx%h" "$file" 2>/dev/null)
    if [ $? -ne 0 ]; then
        echo "⚠️  Failed to read $filename, skipping..."
        continue
    fi
    
    # Resize maintaining aspect ratio, then center on canvas
    # -resize 2000x1250> only resizes if larger, maintaining aspect ratio
    # -extent creates the exact canvas size with centering
    if magick "$file" \
        -resize "2000x1250>" \
        -background "#1a1a1a" \
        -gravity center \
        -extent "2000x1250" \
        "$file" 2>/dev/null; then
        
        echo "✅ Resized $filename (was $original_size)"
        ((processed_count++))
    else
        echo "❌ Failed to resize $filename"
    fi
done

if [ $processed_count -eq 0 ]; then
    echo "⚠️  No image files found to process"
    echo "   Looking for: metadata/*.{png,jpg,jpeg}"
else
    echo ""
    echo "✅ Successfully processed $processed_count screenshot(s)!"
    echo "📁 Original files backed up to metadata/originals/"
fi

echo ""
echo "📝 Notes:"
echo "   • Images are resized maintaining aspect ratio (no stretching)"
echo "   • Final canvas size: 2000x1250 with dark background"
echo "   • Original files are preserved in metadata/originals/"
echo "   • If results look poor, retake using Raycast's Window Capture feature"
