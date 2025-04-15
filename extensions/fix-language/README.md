# Fix Language Raycast Extension

## Overview

**Fix Language** is a Raycast extension that helps you seamlessly switch the language input source of your text when you type and forget to change the language. It supports quick switching for both selected text and clipboard content, making it a useful tool for users who work in multiple languages, such as English and Thai.

## Features

- **Quick switch for selected text**: Easily switch the language of your selected text input source with a single command.
- **Quick switch for clipboard text**: Instantly switch the language input source of your clipboard content.
- **Customizable settings**: Adjust the extension settings to fit your language-switching preferences.
- **Language Support**: Supports switching between **English** and **Thai** by default.

## Language Support

This extension currently supports the following languages:

- **English (en)**
- **Thai (th)**

## Commands

### 1. `sw`: Quick Switch for Selected Text
- **Description**: Switch the language of the currently selected text.
- **Default Languages**: English and Thai.
- **Mode**: `no-view`

### 2. `swc`: Quick Switch for Clipboard Text
- **Description**: Switch the language input source for the clipboard content.
- **Default Languages**: English and Thai.
- **Mode**: `no-view`

### 3. `fix-language`: Switch the Language Input Source
- **Description**: Switch the language input source for the currently active text.
- **Mode**: `view`

### 4. `fix-language-setting`: Settings for Fix Language Extension
- **Description**: Customize settings for how the language switching behaves.
- **Mode**: `view`

## Installation

To install the **Fix Language** extension:

1. Download and install the [Raycast](https://www.raycast.com/) app.
2. Open Raycast and navigate to the Extension Store.
3. Search for **Fix Language** and click install.
4. Customize the extension settings as needed.

## Dependencies

This extension uses the following packages:

- [@raycast/api](https://www.npmjs.com/package/@raycast/api): Raycast API for building extensions.
- [@raycast/utils](https://www.npmjs.com/package/@raycast/utils): Utilities for Raycast extensions.
- [simple-keyboard-layouts](https://www.npmjs.com/package/simple-keyboard-layouts): Provides the keyboard layouts for language switching.

## Development

To work on the extension locally:

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Scripts

- `build`: Build the extension for production.
- `dev`: Run the extension in development mode.
- `fix-lint`: Fix any ESLint issues.
- `lint`: Lint the codebase.
- `publish`: Publish the extension to the Raycast Store.

## License

This extension is licensed under the [MIT License](LICENSE).

---

Author: tin5451