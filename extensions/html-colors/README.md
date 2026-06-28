# HTML Colors

A Raycast extension that helps you quickly look up HTML colors by name. Perfect for web developers and designers who need to find the right color codes without remembering exact names.

> Data source: [Web Colors - Wikipedia](https://en.wikipedia.org/wiki/Web_colors#HTML_color_names)

## Features

- 🔍 **Fuzzy Search**: Search colors by name, hex code, or RGB value
  - Supports typos and partial matches
  - Results are ordered by relevance
  - Minimum 2 characters required for search

- 🎨 **Two Color Sets**:
  - Basic HTML colors (16 standard colors)
  - Extended HTML colors (140+ additional colors)

- 📋 **Color Information**:
  - Color name
  - HEX code
  - RGB value
  - Visual color preview
  - Category indicator (Basic/Extended)

- 🎯 **Quick Actions**:
  - Copy HEX code (default)
  - Copy RGB value
  - Copy color name
  - Toggle between HEX/RGB display
  - Show/Hide color details

- 🔄 **Filtering**:
  - All colors (default)
  - Basic colors only
  - Extended colors only

## Usage

1. Open Raycast
2. Type "Search HTML Colors" to find the extension
3. Start typing to search for colors:
   - Use color names (e.g., "blue", "crimson")
   - Use hex codes (e.g., "#FF0000")
   - Use RGB values (e.g., "rgb(255, 0, 0)")
4. Use the dropdown to filter between basic and extended colors
5. Press `⌘ + I` to toggle the detail view for any color
6. Use `⌘ + T` to switch between HEX and RGB display
7. Select a color to copy its value to clipboard

## Keyboard Shortcuts

- `⌘ + I`: Toggle color details
- `⌘ + T`: Toggle between HEX and RGB display

## Requirements

- macOS 12.0 or later
- Raycast 1.0.0 or later

## Installation

1. Open Raycast
2. Press `⌘ + Space` to open the command bar
3. Type "Store" and select "Open Store"
4. Search for "HTML Colors"
5. Click "Install"

## Development

This extension is built with:
- TypeScript
- React
- Raycast API
- Fuse.js for fuzzy search

For development instructions, please refer to the [Raycast Developer Docs](https://developers.raycast.com).

## License

MIT
