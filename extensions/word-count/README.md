# Word Count

Count the number of characters, words, sentences, and paragraphs in some text.

## Features

### Count Text
The main command provides an interactive form to count text from:
- Selected text (automatically loaded)
- Clipboard content (fallback)
- Manual input

### Count from Screenshot ✨ NEW
Capture any text on your screen and instantly get word counts using OCR (Optical Character Recognition).

**How to use:**
1. Assign a hotkey to "Count from Screenshot" in Raycast preferences
2. Press your hotkey
3. Select the screen area containing text
4. View results instantly in a HUD notification

**Requirements:**
- macOS 12.0 or later

## Tips

### Count Command
- The command will automatically count any text in your clipboard. To clear, use `⌘ + E`.
- Whitespace is included by default when counting characters. To toggle whitespace counting, use `⌘ + T`.

### Count from Screenshot
- Press `Esc` to cancel screenshot capture
- Works best with clear, high-contrast text
- Supports multiple languages (configurable in preferences)
- Enable camera shutter sound in extension preferences if desired

## Preferences

- **Play screenshot sound**: Enable/disable the camera shutter sound when capturing screenshots (default: off)
- **OCR Language**: Select the language for text recognition in screenshots. Supports English, Spanish, French, German, Italian, Portuguese, Chinese (Simplified & Traditional), Japanese, Korean, Russian, and Arabic (default: English)
