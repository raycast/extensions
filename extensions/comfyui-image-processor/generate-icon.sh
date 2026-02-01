#!/bin/bash

# Script to create a proper Raycast icon
# Raycast needs a 512x512 PNG with transparency

echo "🎨 Creating Raycast icon..."

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "✓ Using ImageMagick..."
    
    # Create a simple icon with ImageMagick
    convert -size 512x512 xc:none \
        -fill "#6366F1" \
        -draw "roundrectangle 50,50 462,462 80,80" \
        -fill "#E0E7FF" \
        -draw "roundrectangle 100,100 412,412 40,40" \
        -fill "#FCD34D" \
        -draw "circle 380,380 400,400" \
        -draw "circle 390,360 395,365" \
        -draw "circle 360,390 365,395" \
        command-icon.png
    
    echo "✅ Icon created with ImageMagick!"
    exit 0
fi

# Check if sips is available (macOS built-in)
if command -v sips &> /dev/null; then
    if [ -f "icon-template.svg" ]; then
        echo "✓ Using sips (macOS)..."
        
        # Convert SVG to PNG using sips
        # First we need to convert SVG to a temporary PNG
        qlmanage -t -s 512 -o . icon-template.svg 2>/dev/null
        
        # Rename the output
        if [ -f "icon-template.svg.png" ]; then
            mv icon-template.svg.png command-icon.png
            echo "✅ Icon created with sips!"
            exit 0
        fi
    fi
fi

# If nothing works, create a simple colored square
if command -v python3 &> /dev/null; then
    echo "✓ Using Python PIL..."
    
    python3 << 'EOF'
try:
    from PIL import Image, ImageDraw
    
    # Create a 512x512 image
    img = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    draw.rounded_rectangle([50, 50, 462, 462], radius=80, fill='#6366F1')
    
    # Draw inner rectangle
    draw.rounded_rectangle([100, 100, 412, 412], radius=40, fill='#E0E7FF')
    
    # Draw some circles (sparkles)
    draw.ellipse([360, 360, 420, 420], fill='#FCD34D')
    draw.ellipse([370, 340, 410, 380], fill='#FCD34D')
    draw.ellipse([340, 370, 380, 410], fill='#FCD34D')
    
    img.save('command-icon.png')
    print("✅ Icon created with Python PIL!")
except ImportError:
    print("❌ PIL not available")
    exit(1)
EOF
    
    if [ $? -eq 0 ]; then
        exit 0
    fi
fi

# Last resort - download a simple icon
echo "❌ No suitable tool found"
echo ""
echo "Please install one of these:"
echo "  • ImageMagick: brew install imagemagick"
echo "  • Python PIL: pip3 install pillow"
echo ""
echo "Or create command-icon.png manually (512x512 PNG)"
exit 1
