# Clipboard Transformer

Transform and paste your clipboard content in any text case format you need. Perfect for developers who constantly switch between naming conventions.

## Features

- **Clipboard History**: Stores up to 50 recent clipboard items with timestamps
- **12 Case Transformations**: Instantly convert text to any format
- **Live Preview**: See all transformations before pasting
- **Smart Detection**: Automatically identifies content type (URL, code, text, etc.)
- **Paste or Copy**: Choose to paste directly or copy the transformed text
- **Persistent Storage**: Clipboard history survives Raycast restarts

## Available Transformations

- **lowercase** - all lowercase letters
- **UPPERCASE** - ALL UPPERCASE LETTERS
- **camelCase** - firstWordLowercaseRestCapitalized
- **PascalCase** - FirstLetterOfEveryWordCapitalized
- **snake_case** - words_separated_by_underscores
- **kebab-case** - words-separated-by-hyphens
- **CONSTANT_CASE** - SCREAMING_SNAKE_CASE
- **Title Case** - Every Word Capitalized
- **Sentence case** - First word capitalized
- **dot.case** - words.separated.by.dots
- **path/case** - words/separated/by/slashes

## How to Use

1. Copy some text to your clipboard
2. Open Raycast and search for "Clipboard Transformer"
3. Select a clipboard item from the history
4. Press Enter to see all transformation options
5. Choose your desired format to paste it instantly

## Keyboard Shortcuts

- **Cmd + R** - Refresh current clipboard
- **Cmd + Shift + D** - Toggle detail view
- **Cmd + Shift + Delete** - Clear clipboard history

## Use Cases

Perfect for developers who need to:

- Convert variable names between coding conventions
- Transform API responses to match your naming style
- Quickly format text for different documentation standards
- Switch between camelCase (JavaScript) and snake_case (Python)
- Format strings for different environments (URLs, file names, constants)

## Privacy

All clipboard data is stored locally on your device. Nothing is sent to external servers.

### Privacy Controls

You can customize how long clipboard history is retained:

- **Maximum History Items**: Choose to store 10, 25, 50 (default), 100, or 200 items
- **History Retention**: Automatically delete items older than 1, 7, 30 (default), or 90 days - or never
- **Clear on Quit**: Enable to automatically clear all history when Raycast quits

**To access privacy settings**: Open the extension, press `Cmd + ,` or go to Raycast Settings → Extensions → Clipboard Transformer → Preferences

For maximum privacy, consider:

- Setting retention to 1 day
- Reducing max items to 10
- Enabling "Clear on Quit"
- Manually clearing history with `Cmd + Shift + Delete` after copying sensitive data
