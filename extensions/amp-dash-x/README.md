# Amp Dash X - Raycast Extension

A Raycast extension for organizing and executing [Amp AI](https://ampcode.com) prompts with the `-x` (execute) flag. Save frequently used prompts, organize them by categories, and quickly paste or copy Amp commands directly from Raycast.

## Features

- 📋 **Save and organize prompts** - Store your frequently used Amp prompts with titles and descriptions
- 🏷️ **Category management** - Organize prompts into custom categories for better organization
- ⚡ **Quick execution** - Paste Amp commands directly to your terminal or copy to clipboard
- 🔍 **Search functionality** - Find prompts quickly by title, category, or description
- ⌨️ **Keyboard shortcuts** - Efficient navigation with customizable shortcuts

## Prerequisites

Before using this extension, you need:

1. **Amp CLI** installed and configured on your system
   - Visit [ampcode.com](https://ampcode.com) to download and install Amp
   - Ensure `amp` command is available in your PATH

2. **Raycast** installed on your Mac
   - Download from [raycast.com](https://raycast.com)

## Installation

### From Raycast Store (Recommended)

1. Open Raycast
2. Search for "Amp Dash X"
3. Click "Install"

### Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/jdorfman/amp-x-raycast.git
   cd amp-x-raycast
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Import into Raycast:
   - Open Raycast preferences
   - Go to Extensions tab
   - Click "Add Extension"
   - Select the built extension directory

## Usage

### Execute Amp Prompts Command

Access your saved prompts and execute them with Amp's `-x` flag:

1. Open Raycast (`⌘ + Space`)
2. Type "Execute Amp Prompts" or "amp"
3. Browse or search your saved prompts
4. Select a prompt and choose an action:
   - **Paste Command** (`⌘ + P`) - Pastes `amp -x "your prompt"` directly to your active terminal
   - **Copy Command** - Copies the command to clipboard

#### Adding New Prompts

- Press `⌘ + N` to add a new prompt
- Fill in the required fields:
  - **Title**: Short descriptive name
  - **Prompt**: The actual prompt text for Amp
  - **Category**: Choose from existing categories or create new ones
  - **Description** (optional): Additional context

#### Managing Prompts

- **Edit**: Press `⌘ + E` to modify an existing prompt
- **Delete**: Press `⌘ + D` to remove a prompt (with confirmation)

### Manage Prompt Categories Command

Organize your prompts with custom categories:

1. Open Raycast
2. Type "Manage Prompt Categories" or "categories"
3. Available actions:
   - **Add Category**: Create new categories for better organization
   - **Edit Category**: Rename existing categories (except "General")
   - **Delete Category**: Remove categories (prompts move to "General")

## Configuration

### Preferences

Access extension preferences in Raycast Settings > Extensions > Amp Dash X:

- **Amp Binary Path**: Path to the amp executable (default: `amp`)
- **Default Flags**: Additional flags to pass to amp command

### Example Preferences

```
Amp Binary Path: /usr/local/bin/amp
Default Flags: --verbose
```

## Development

### Prerequisites

- Node.js 18+
- npm
- Raycast (for testing)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jdorfman/amp-x-raycast.git
   cd amp-x-raycast
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start Raycast development mode
- `npm run build` - Build extension for distribution
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Auto-fix lint issues
- `npm run publish` - Publish to Raycast store

### Project Structure

```
src/
├── amp.tsx              # Main command for executing prompts
├── categories.tsx       # Category management command
├── components/          # Reusable React components
│   └── PromptForm.tsx   # Form for adding/editing prompts
└── lib/
    └── storage.ts       # LocalStorage utilities for data persistence
```

## Keyboard Shortcuts

### Execute Amp Prompts

- `⌘ + P` - Paste command to terminal
- `⌘ + N` - Add new prompt
- `⌘ + E` - Edit selected prompt
- `⌘ + D` - Delete selected prompt

### Manage Categories

- `⌘ + N` - Add new category
- `⌘ + E` - Edit selected category
- `⌘ + D` - Delete selected category

## Data Storage

All prompts and categories are stored locally using Raycast's LocalStorage API. Data includes:

- Prompt title, content, category, and description
- Creation and modification timestamps
- Custom categories (with "General" as default)

## Troubleshooting

### Common Issues

**"amp command not found"**
- Ensure Amp CLI is installed and in your PATH
- Check the "Amp Binary Path" in extension preferences
- Try using the full path to the amp executable

**"Failed to paste command"**
- Ensure you have an active terminal window
- Check Raycast accessibility permissions in System Preferences

**Extension not loading**
- Restart Raycast
- Check if all dependencies are installed: `npm install`
- Rebuild the extension: `npm run build`

### Debug Mode

Enable verbose logging by adding the `--verbose` flag in Default Flags preference.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run lint`
5. Commit changes: `git commit -m "Description of changes"`
6. Push to branch: `git push origin feature-name`
7. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/jdorfman/amp-x-raycast/issues)
- **Amp Documentation**: [ampcode.com/manual](https://ampcode.com/manual)
- **Raycast API**: [developers.raycast.com](https://developers.raycast.com)

## Changelog

### Version 1.0.0
- Initial release
- Basic prompt management functionality
- Category organization
- Paste and copy commands
- Search and filtering capabilities
