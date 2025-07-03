# Clipboard Formatters - Raycast Extension

A collection of Raycast extensions to format and manipulate clipboard content.

## Features

### 1. Format XML from Clipboard
- Formats XML content from clipboard with proper indentation
- Validates XML syntax and shows error if invalid
- Copies formatted XML back to clipboard

### 2. Format JSON from Clipboard
- Formats JSON content from clipboard with proper indentation (2 spaces)
- Validates JSON syntax and shows error if invalid
- Copies formatted JSON back to clipboard

### 3. Escape String from Clipboard
- Escapes special characters in strings (JavaScript/JSON style)
- Handles: quotes, newlines, tabs, backslashes, etc.
- Copies escaped string back to clipboard

## Installation

1. Clone or download this extension
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Import into Raycast or publish to Raycast Store

## Usage

1. Copy XML, JSON, or any string to your clipboard
2. Open Raycast (⌘ + Space)
3. Search for:
   - "Format XML from Clipboard"
   - "Format JSON from Clipboard" 
   - "Escape String from Clipboard"
4. Press Enter to execute
5. The formatted/escaped content will be copied back to your clipboard

## Development

- `npm run dev` - Start development mode
- `npm run build` - Build the extension
- `npm run lint` - Run linter
- `npm run fix-lint` - Fix linting issues

## License

MIT
