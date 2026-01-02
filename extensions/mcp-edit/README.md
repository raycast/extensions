# MCP Edit

A Raycast extension for quick access to MCP (Model Context Protocol) configuration files across AI coding assistants and developer tools.

## Overview

MCP Edit simplifies managing MCP configurations by providing a centralized interface to browse and edit configuration files from 15+ AI coding tools. Instead of remembering where each tool stores its MCP config, access them all from one place.

## Features

- **Browse MCP Clients** - Searchable list of 15+ popular AI coding assistants
- **Quick Config Access** - Open configuration files in your preferred editor with one keystroke
- **Customizable Editors** - Choose which editors appear in your action list (Cursor, VS Code, Zed, Sublime Text)
- **Flexible Config Paths** - Customize the config file path for each MCP client
- **Smart Path Expansion** - Automatically handles `~` for home directory paths

## Supported MCP Clients

- Amp
- Claude Code
- Claude Desktop app
- Cline
- Codex
- Copilot CLI
- Copilot/VS Code
- Cursor
- Factory CLI
- Gemini CLI
- JetBrains AI Assistant
- Kiro
- Qoder
- Visual Studio
- Windsurf

## Installation

### From Raycast Store (Recommended)

Coming soon - the extension will be available in the Raycast Store.

### Manual Installation

1. Clone this repository
2. Navigate to the project directory
3. Run `npm install`
4. Run `npm run dev` to start development mode
5. The extension will appear in Raycast

## Usage

1. Open Raycast (default: `⌘ + Space`)
2. Type "MCP Edit" or "Edit MCP Configuration"
3. Browse or search for your MCP client
4. Press `⌘ + ⏎` to open in your default editor, or use the actions menu to choose a specific editor

## Configuration

### Editor Preferences

You can enable/disable which editors appear in the action list:

1. Open Raycast preferences
2. Navigate to Extensions → MCP Edit
3. Toggle editor visibility options

### Custom Config Paths

Each MCP client has a default configuration path, but you can customize them:

1. Open Raycast preferences
2. Navigate to Extensions → MCP Edit
3. Find the client you want to customize
4. Update the "Config Path" preference

## Development

### Requirements

- Node.js 20+
- Raycast (macOS only)

### Setup

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run fix-lint

# Format code
npm run format
```

### Project Structure

```
mcp-edit/
├── src/
│   └── list-mcp-configurations.tsx  # Main command
├── assets/                          # Icons and images
├── package.json                     # Raycast manifest
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Adding New MCP Clients

To add support for a new MCP client:

1. Add the client to the `MCP_CLIENTS` array in `src/list-mcp-configurations.tsx`
2. Include a default config path
3. Add any necessary metadata

## License

MIT - see LICENSE for details

## Author

Built by [@kevintraver](https://github.com/kevintraver)
