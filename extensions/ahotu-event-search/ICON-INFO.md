# Extension Icon

The extension icon is configured and ready to use.

## Current Icon

- **Filename**: `command-icon.png`
- **Size**: 512x512 pixels ✅
- **Format**: PNG with transparency ✅
- **Location**: Root directory of the extension ✅

## Updating the Icon

If you want to use a different icon:

1. Create or find a suitable icon representing sports/events/search
2. Ensure it's 512x512 pixels in PNG format with transparency
3. Replace `command-icon.png` in the root directory

## Icon Suggestions

- A running figure icon
- A finish line icon
- A calendar with a running shoe
- The Ahotu logo
- A magnifying glass with a runner
- Sports-related symbols

## Using SF Symbols (macOS)

You can export icons from SF Symbols app (built into macOS):

1. Open SF Symbols app
2. Search for sports-related icons (e.g., "figure.run", "flag.checkered")
3. Export at 512x512 resolution
4. Save as `command-icon.png`

## Using Online Tools

- [Raycast Icons](https://www.raycast.com/icon) - Raycast's icon builder
- [Icons8](https://icons8.com/) - Free icons
- [Flaticon](https://www.flaticon.com/) - Icon library
- Figma, Sketch, or similar design tools

## Resizing an Existing Icon

If you have an icon that's not 512x512:

```bash
# Using macOS sips (built-in)
sips -z 512 512 your-icon.png

# Using ImageMagick (if installed)
convert your-icon.png -resize 512x512 command-icon.png
```
