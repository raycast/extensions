# Color Converter for Raycast

A Raycast extension for converting colors between different formats including RGB, HEX, HSL, Display P3, OKLCH, and more.

## Credits

This extension's color conversion logic is based on the excellent [OKLCH Color Picker](https://github.com/evilmartians/oklch-picker) by Evil Martians ([oklch.com](https://oklch.com)). The original project provides comprehensive tools for working with OKLCH color spaces.

## Features

- Convert between multiple color formats:
  - RGB (rgb(255, 126, 0))
  - HEX (#FF7E00)
  - HSL (hsl(29.54 100% 50%))
  - Display P3 (color(display-p3 1 0.502 0))
  - OKLCH (oklch(74.32% 0.2194 51.36))
  - OKLAB (oklab(74.32% 0.14 0.17))
  - Figma P3 (#FF8000FF)
  - Linear RGB/Vec4

- Automatic gamut mapping
- Copy colors to clipboard
- Visual color preview
- Fallback handling for out-of-gamut colors

## Why OKLCH?

OKLCH offers several advantages over traditional color formats:
- Native browser support
- Extended color gamut support (P3, Rec. 2020)
- Predictable contrast after color transformation
- No hue shift on chroma changes
- Better accessibility for palette generation

## Installation

1. Open Raycast
2. Search for "Color Converter"
3. Install the extension

## Usage

1. Open Raycast
2. Type "color" to find the converter
3. Enter a color in any supported format
4. Copy the converted values

## Development

Install dependencies
```bash
   npm install
```

Build the Extension
```bash
   npm run build
```

Dev Mode:
Start the development environment with:
```bash
   npm run dev
```

## Requirements

- Raycast 1.26.0 or higher
- Node.js 16.10 or higher
- npm 7.x or 8.x

## Technical Details

This extension uses:
- Culori for color space conversions
- React and TypeScript for the UI
- Raycast API for the interface

## Color Space Support

- **sRGB**: Full support for RGB, HEX, and HSL formats
- **Display P3**: Extended color gamut support
- **OKLCH/OKLAB**: Perceptually uniform color spaces
- **Figma P3**: Support for Figma's P3 color format

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT © Gleb Stroganov
