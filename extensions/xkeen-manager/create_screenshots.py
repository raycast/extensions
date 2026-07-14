#!/usr/bin/env python3
"""
Create placeholder screenshots for Raycast Store
2000x1250 px PNG images with professional design
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Screenshot dimensions
WIDTH = 2000
HEIGHT = 1250

# Color scheme
BG_COLOR = (245, 245, 247)  # Light gray background
ACCENT_COLOR = (74, 144, 226)  # Raycast blue
TEXT_COLOR = (0, 0, 0)  # Black text
SUCCESS_COLOR = (34, 197, 94)  # Green

def create_screenshot(filename, title, description):
    """Create a screenshot with title and description"""

    # Create base image
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Add title
    try:
        # Try to use system font, fallback to default
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 80)
    except:
        title_font = ImageFont.load_default()

    try:
        desc_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 50)
    except:
        desc_font = ImageFont.load_default()

    # Draw title
    title_y = 200
    draw.text((100, title_y), title, fill=TEXT_COLOR, font=title_font)

    # Draw description
    desc_y = 500
    draw.text((100, desc_y), description, fill=ACCENT_COLOR, font=desc_font)

    # Draw accent bar
    draw.rectangle([(0, 0), (WIDTH, 10)], fill=ACCENT_COLOR)

    # Save image
    img.save(filename, 'PNG')
    print(f"✓ Created {filename}")

# Create screenshots
screenshots = [
    ('xkeen-manager-1.png', 'XKeen Manager', 'Main Screen • Status: Running'),
    ('xkeen-manager-2.png', 'XKeen Manager', 'Status Actions • Quick Access Menu'),
    ('xkeen-manager-3.png', 'XKeen Manager', 'Profiles • Server Management'),
    ('xkeen-manager-4.png', 'XKeen Manager', 'Quick Add • Domain Routing'),
    ('xkeen-manager-5.png', 'XKeen Manager', 'Health Check • System Status'),
]

# Create metadata directory if it doesn't exist
metadata_dir = os.path.dirname(__file__) + '/metadata'
os.makedirs(metadata_dir, exist_ok=True)

# Create each screenshot
for filename, title, description in screenshots:
    filepath = os.path.join(metadata_dir, filename)
    create_screenshot(filepath, title, description)

print(f"\n✓ All screenshots created in {metadata_dir}")
print(f"✓ Size: {WIDTH}x{HEIGHT} px (16:10 aspect ratio for Raycast Store)")
