# Icon Setup

The Raycast extension requires an icon file named `icon.png` in the root directory.

## Requirements

- **File name**: `icon.png`
- **Location**: Root of the extension directory
- **Size**: 512x512 pixels (will be automatically scaled)
- **Format**: PNG with transparency
- **Style**: Simple, recognizable icon that represents WLED/LED lighting

## Creating Your Icon

### Option 1: Download a Free Icon

Visit these sites for free icons:
- https://www.flaticon.com/ (search "led light" or "light bulb")
- https://iconscout.com/
- https://icons8.com/

### Option 2: Use an Emoji as Icon

You can use a lightbulb emoji as a quick placeholder. macOS can export emojis as images.

### Option 3: Generate with AI

Use AI image generators like:
- DALL-E
- Midjourney
- Stable Diffusion

Prompt: "Simple minimalist icon of an LED light strip, flat design, tech style, transparent background"

### Option 4: WLED Official Logo

Download the WLED logo from:
https://github.com/Aircoookie/WLED

## Quick Placeholder

If you need to test the extension quickly, you can use any 512x512 PNG image temporarily.

**macOS Quick Command:**
```bash
# This will create a simple colored square as a placeholder
# (Requires ImageMagick: brew install imagemagick)
convert -size 512x512 xc:#FF6B35 icon.png
```

Or use the SF Symbols app on macOS to export a lightbulb symbol.

## Once You Have Your Icon

1. Save it as `icon.png` in the root directory (same level as package.json)
2. The icon should appear in Raycast once the extension is loaded
3. Rebuild the extension: `npm run build`

## Recommended Icon Theme

For WLED, consider:
- Lightbulb icon
- LED strip icon
- RGB color symbol
- Smart home/automation icon
- Gradient colored shape representing RGB lighting
