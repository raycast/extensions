# ToolsHunt Raycast Extension

Quick access to ToolsHunt utilities through Raycast. Each tool is available as an independent command for instant access.

## Features

- 🔍 **Search Tools**: Browse and search all available tools through the main command
- ⚡ **Quick Launch**: Each tool is an independent command that opens directly
- 🌐 **Bilingual Support**: Supports both English and Chinese search and display
- 🎨 **Intuitive Interface**: Clear icons and descriptions for quick tool discovery

## Tools Available

### Text Formatting
- 📅 Convert Time Format - Timestamp conversion
- 📋 JSON Formatter - JSON formatting and validation
- 🍪 Format Cookie - Cookie string formatting
- 💻 Format JavaScript - JavaScript/TypeScript code formatting

### Encoding/Decoding
- 🔐 Encode/Decode Base64 - Base64 encoding and decoding
- 🖼️ Decode Base64 Image - Base64 image decoding and preview
- 🔗 Encode/Decode URL - URL encoding and decoding

### Comparison Tools
- 🔍 Compare JSON - JSON object comparison
- 📝 Compare Text - Text block comparison
- 🔄 Compare CURL - CURL command comparison

### Generators
- 🎲 Generate UUID - UUID and ULID generation
- 📱 Generate QR Code - QR code generation and reading
- #️⃣ Generate Hash - Various hash value generation
- 🎨 Generate Favicon - Favicon icon generation
- 🌍 Generate Domain - Creative domain name generation

### Converters
- ⚡ Convert CURL to Requests - CURL to Python requests conversion
- 💾 Convert JSON to SQL - JSON to SQL statement conversion

### AI Tools
- 📷 Generate ID Photo - ID photo generation
- ✨ Enhance Photo - AI-powered photo enhancement
- 🍽️ Annotate Food Calories - AI-powered food calorie annotation

### Other
- 🌐 Render HTML - HTML code preview and testing

## Installation

### Prerequisites

1. Ensure [Raycast](https://raycast.com/) is installed
2. Ensure ToolsHunt application is installed

### From Source

1. Clone or download this extension to your local machine
2. Install dependencies in the extension directory:
   ```bash
   cd raycast-extension
   npm install
   ```

3. Import the extension in Raycast:
   ```bash
   npm run dev
   ```

### From Raycast Store (Coming Soon)

Once published to the Raycast Store, you can search for "ToolsHunt" directly in Raycast to install.

## Usage

### Method 1: Using Search Command

1. Open Raycast (⌘ + Space)
2. Type "Search Tools"
3. Browse or search for the tool you need
4. Press Enter to open the selected tool

### Method 2: Direct Tool Commands

1. Open Raycast (⌘ + Space)
2. Type the tool name directly, such as:
   - "JSON Formatter"
   - "Convert Time Format"
   - "Base64"
   - etc.
3. Press Enter to open the corresponding tool

## Development

### Project Structure

```
raycast-extension/
├── src/
│   ├── index.tsx              # Main search command
│   ├── tools-config.ts        # Tool configuration
│   ├── utils.ts               # Utility functions
│   ├── time-format.tsx        # Individual tool commands
│   ├── json-formatter.tsx     # Individual tool commands
│   └── ...                    # Other tool commands
├── scripts/
│   └── generate-commands.js   # Command generation script
├── package.json               # Extension configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation
```

### Adding New Tools

1. Add tool configuration in `src/tools-config.ts`:
   ```typescript
   {
     id: "new-tool",
     name: "New Tool",
     nameZh: "新工具",
     description: "Tool description",
     descriptionZh: "工具描述",
     icon: "🔧",
     keywords: ["new", "tool", "新", "工具"]
   }
   ```

2. Add command configuration in `package.json` commands array:
   ```json
   {
     "name": "new-tool",
     "title": "New Tool",
     "description": "Tool description",
     "mode": "no-view"
   }
   ```

3. Run the generation script:
   ```bash
   node scripts/generate-commands.js
   ```

### Deep Link Support

The extension uses custom URL scheme to open specific tools:
```
toolshunt://tool/{toolId}
```

If your ToolsHunt application needs to support deep links, please refer to Electron's [custom protocol handling](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app) documentation.

### Build and Publish

```bash
# Development mode
npm run dev

# Build
npm run build

# Publish to Raycast Store
npm run publish
```

## Troubleshooting

### Application Won't Open

1. Confirm ToolsHunt is properly installed
2. Check if the application is in `/Applications/ToolsHunt.app` path
3. If the application is in another location, the extension will search automatically

### Deep Links Not Working

If deep link functionality is not available, the extension will:
1. Open the ToolsHunt application directly
2. Show a notification to inform the user to manually select the tool

## Tech Stack

- [Raycast API](https://developers.raycast.com/)
- TypeScript
- React

## License

MIT

## Contact

For questions or suggestions, please contact:
- GitHub Issues
- Email: your-email@example.com

## Acknowledgments

Thanks to the Raycast team for providing an excellent platform!