# Universal Color Converter

Convert colors between different formats instantly, no interface required.
- Universal Color Converter will automatically detect the format you provide, convert your color to every other format.
- Supports Hex, RGB, OKLCH, SwiftUI Color, and UIColor.

## Features

- **Automatic Format Detection**: Paste any supported color format and get instant recognition
- **Universal Conversion**: Convert between all supported formats simultaneously
- **Quick Copy**: Press Enter to copy the preferred format, or use action panel for specific formats
- **Real-time Preview**: See color swatches for each converted format

## Supported Formats

### Input Formats
- **Hex**: `#FF5733`, `#ff5733ff` (with alpha)
- **RGB/RGBA**: `rgb(255, 87, 51)`, `rgba(255, 87, 51, 0.8)`
- **RGB Shortcut**: `255, 87, 51` or `123 234 345` (space or comma separated)
- **OKLCH**: `oklch(0.68 0.21 33.7)` with optional alpha
- **SwiftUI Color**: `Color(red: 1.0, green: 0.341, blue: 0.2, opacity: 0.8)`
- **UIColor**: `UIColor(red: 1.0, green: 0.341, blue: 0.2, alpha: 1.0)`

### Output Formats
All inputs are converted to:
- Hex (e.g., `#FF5733`)
- RGB/RGBA (e.g., `rgb(255, 87, 51)`)
- OKLCH (e.g., `oklch(0.680 0.210 33.7)`)
- SwiftUI Color (e.g., `Color(red: 1.000, green: 0.341, blue: 0.200)`)
- UIColor (e.g., `UIColor(red: 1.000, green: 0.341, blue: 0.200, alpha: 1.0)`)

## Usage

1. **Open Raycast** and search for "Convert Color"
2. **Paste or type** any supported color format into the search bar
3. **Press Enter** to copy the preferred format to your clipboard
   - Hex input → RGB output
   - All other formats → Hex output
4. **Use Action Panel** (⌘+K) to copy any specific format

## Examples

### Basic Usage
```
Input: #FF5733
Output: rgb(255, 87, 51) [copied on Enter]

Input: rgb(123, 200, 75)
Output: #7BC84B [copied on Enter]
```

### Advanced Formats
```
Input: 255, 87, 51
Output: #FF5733 [copied on Enter]

Input: 123 234 345
Output: #7BEAFF [values clamped to 0-255]

Input: Color(red: 0.8, green: 0.2, blue: 0.6, opacity: 0.9)
Output: #CC3399E6 [copied on Enter]

Input: oklch(0.7 0.15 180)
Output: #00B4A6 [copied on Enter]
```

## Installation

This extension is available in the Raycast Store. Search for "Universal Color Converter" in Raycast's extension directory.

## About me

Hi, I'm [Joe](http://fabisevi.ch) everywhere on the web, but especially on [Bluesky](https://bsky.app/profile/mergesort.me).

## License

See the [license](LICENSE) for more information about how you can use Universal Color Converter.

## Sponsorship

Universal Color Converter is a labor of love, so I have no expectations of sponsorship. But if you find it and my other work  valuable, I would really appreciate it if you'd consider helping [sponsor my open source work](https://github.com/sponsors/mergesort), so I can continue to work on projects like [Boutique](https://github.com/mergesort/Boutique), [Bodega](https://github.com/mergesort/Bodega), [Recap](https://github.com/mergesort/Recap), and more. to help developers like yourself.
