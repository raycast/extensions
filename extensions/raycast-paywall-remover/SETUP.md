# Setup Instructions

## Required Files

Before the extension can be fully functional, you need to:

1. **Add Extension Icon**: Create a `command-icon.png` file in the root directory (512x512px recommended)
2. **Update Author Information**: Replace "Your Name" and "your-username" in package.json and extension.json with actual values

## Development

1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Build extension: `npm run build`

## Project Structure

- `src/commands/` - Raycast command implementations
- `src/utils/` - Utility functions and classes
- `src/types/` - TypeScript type definitions
- `extension.json` - Raycast extension manifest
- `package.json` - Node.js package configuration