# TextFile

A [Raycast](https://raycast.com) extension that saves your clipboard content to text files.

## Features

- Instantly save clipboard text content to a file
- Files are automatically saved with timestamp in name
- Files are stored in `~/clipboard_history` directory
- Shows confirmation HUD when file is saved

## Usage

1. Copy any text content to your clipboard
2. Run the "Save Clipboard" command in Raycast
3. The clipboard content will be saved as a text file in `~/clipboard_history`

## Development

This extension is built with:
- [@raycast/api](https://developers.raycast.com/)
- TypeScript
- Node.js

### Requirements
- [Node.js](https://nodejs.org)
- [npm](https://www.npmjs.com/)
- [Raycast](https://raycast.com)

### Available Commands

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## License

MIT © Brian Sunter