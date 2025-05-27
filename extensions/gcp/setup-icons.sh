#!/bin/bash

echo "🎨 Setting up Google Cloud icons for Raycast extension..."

# Ensure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the extension root directory"
    exit 1
fi

# Ensure assets directory exists
mkdir -p assets

# Function to resize icon to 512x512 with padding
resize_icon() {
    local input=$1
    local output=$2
    
    if command -v convert &> /dev/null; then
        # Using ImageMagick - resize to fit within 400x400 then pad to 512x512
        convert "$input" -resize 400x400 -gravity center -background transparent -extent 512x512 "$output"
        echo "✅ Created $output"
    elif command -v sips &> /dev/null; then
        # Using macOS sips (basic resize, no padding)
        cp "$input" "$output"
        sips -z 512 512 "$output" --out "$output" >/dev/null 2>&1
        echo "✅ Created $output (using sips)"
    else
        # Just copy as-is
        cp "$input" "$output"
        echo "⚠️  Copied $output (no resize tool found)"
    fi
}

# 1. Main extension icon - use cloud_generic
echo "📦 Setting up main extension icon..."
if [ -f "google-cloud-icons/cloud_generic/cloud_generic.png" ]; then
    resize_icon "google-cloud-icons/cloud_generic/cloud_generic.png" "assets/extension-icon.png"
else
    echo "❌ cloud_generic.png not found"
fi

# 2. Command icons - create a subdirectory for command icons
mkdir -p assets/command-icons

# Compute Engine icon
echo "🖥️  Setting up Compute Engine icon..."
if [ -f "google-cloud-icons/compute_engine/compute_engine.png" ]; then
    resize_icon "google-cloud-icons/compute_engine/compute_engine.png" "assets/command-icons/compute-engine.png"
fi

# Cloud Storage icon
echo "💾 Setting up Cloud Storage icon..."
if [ -f "google-cloud-icons/cloud_storage/cloud_storage.png" ]; then
    resize_icon "google-cloud-icons/cloud_storage/cloud_storage.png" "assets/command-icons/cloud-storage.png"
fi

# Cloud Run icon
echo "🏃 Setting up Cloud Run icon..."
if [ -f "google-cloud-icons/cloud_run/cloud_run.png" ]; then
    resize_icon "google-cloud-icons/cloud_run/cloud_run.png" "assets/command-icons/cloud-run.png"
fi

# Cloud Functions icon
echo "⚡ Setting up Cloud Functions icon..."
if [ -f "google-cloud-icons/cloud_functions/cloud_functions.png" ]; then
    resize_icon "google-cloud-icons/cloud_functions/cloud_functions.png" "assets/command-icons/cloud-functions.png"
fi

# Copy SVG versions as well (for potential future use)
echo ""
echo "📄 Copying SVG versions..."
cp "google-cloud-icons/cloud_generic/cloud_generic.svg" "assets/cloud-generic.svg" 2>/dev/null
cp "google-cloud-icons/compute_engine/compute_engine.svg" "assets/command-icons/compute-engine.svg" 2>/dev/null
cp "google-cloud-icons/cloud_storage/cloud_storage.svg" "assets/command-icons/cloud-storage.svg" 2>/dev/null
cp "google-cloud-icons/cloud_run/cloud_run.svg" "assets/command-icons/cloud-run.svg" 2>/dev/null
cp "google-cloud-icons/cloud_functions/cloud_functions.svg" "assets/command-icons/cloud-functions.svg" 2>/dev/null

echo ""
echo "✅ Icon setup complete!"
echo ""
echo "📁 Icon locations:"
echo "   Main extension icon: assets/extension-icon.png"
echo "   Command icons: assets/command-icons/"
echo ""
echo "Note: If icons need resizing, install ImageMagick:"
echo "   brew install imagemagick"
echo ""
echo "Next step: Update package.json to use command-specific icons"
