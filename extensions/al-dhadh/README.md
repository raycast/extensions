# Al-Dhadh

A Raycast extension that converts text between Arabic and English keyboard layouts instantly.

## Description

Al-Dhadh (الضاد) helps you convert text that was typed in the wrong keyboard layout. If you've ever typed Arabic text while your keyboard was set to English (or vice versa), this extension will instantly convert it to the correct characters.

## Features

- 🔄 **Bidirectional Conversion**: Automatically detects and converts between Arabic and English keyboard layouts
- ⚡ **Instant Conversion**: Select text and convert it with a single keystroke
- 📋 **Smart Paste**: Automatically replaces selected text with the converted version
- 🎯 **Accurate Mapping**: Uses precise keyboard layout mapping for accurate conversions
- 🌐 **Mixed Text Support**: Handles text with both Arabic and English characters
- 📱 **Arabic Numbers**: Converts between Arabic-Indic numerals (٠-٩) and Western numerals (0-9)

## Usage

1. Select any text that needs conversion
2. Trigger the Al-Dhadh command via Raycast
3. The text will be automatically converted and pasted in place

### Examples

**Arabic to English:**
- `سممخ صخقمي` → `hello world`
- `شمشصثر` → `ahalan`

**English to Arabic:**
- `hello world` → `سممخ صخقمي`
- `ahalan` → `شمشصثر`

## Installation

1. Install via Raycast Store (coming soon)
2. Or install manually:
   ```bash
   git clone [repository-url]
   cd al-dhadh
   npm install
   npm run dev
   ```

## Keyboard Layout Mapping

The extension uses the standard Arabic QWERTY keyboard layout mapping:

| Arabic | English | Arabic | English | Arabic | English |
|--------|---------|--------|---------|--------|---------|
| ض | q | ش | a | ئ | z |
| ص | w | س | s | ء | x |
| ث | e | ي | d | ؤ | c |
| ق | r | ب | f | ر | v |
| ف | t | ل | g | لا | b |
| غ | y | ا | h | ى | n |
| ع | u | ت | j | ة | m |
| ه | i | ن | k | و | , |
| خ | o | م | l | ز | . |
| ح | p | ك | ; | ظ | / |

## Requirements

- Raycast
- macOS

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

---

Made with ❤️ for the Arabic-speaking community
