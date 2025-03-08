# Raycast Favicon Generator

A powerful Raycast extension that generates a complete set of favicons for your website, including support for various platforms and devices.

## Features

- Generate comprehensive favicon sets from a single master image
- Support for desktop browsers, mobile devices, and web app manifests
- Automatic generation of various icon sizes and formats
- Dark mode icon support
- Web App Manifest generation
- Clipboard integration for easy HTML tag copying
- Favicon validation tool

## Prerequisites

- [Raycast](https://raycast.com/) installed on your system
- Node.js and npm/npx

## Usage

1. Open Raycast and search for "Favicon Generator"
2. Provide a master image (PNG recommended, minimum size 512x512px)
3. Select an output directory for the generated favicons
4. The extension will:
   - Generate all necessary favicon files
   - Create a web app manifest
   - Copy the required HTML tags to your clipboard

## Generated Assets

The extension generates a complete set of favicon assets, including:

- Standard favicons for desktop browsers
- Apple Touch Icons for iOS devices
- Web App Manifest icons for Progressive Web Apps
- Microsoft Windows Tile icons
- Various other platform-specific icons

## Configuration Options

You can customize the favicon generation with options like:
- Custom background colors
- App name and short name
- Theme colors
- Icon transformations
- Path configurations

## Validation

The extension includes a favicon checker that can validate your favicon implementation on a live website.

## Credits

This extension uses the [RealFaviconGenerator](https://realfavicongenerator.net/) CLI tool under the hood.

## License

MIT License - See LICENSE file for details