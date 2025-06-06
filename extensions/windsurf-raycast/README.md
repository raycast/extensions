# Windsurf Extension for Raycast

A Raycast extension that provides quick access to Windsurf IDE functionality.

## Features

### 🚀 Open with Windsurf
- Quickly open any file or folder in Windsurf IDE
- Supports path expansion (use `~` for home directory)
- Automatically saves opened items to recent projects

### 📁 Windsurf Projects
- View all files and folders previously opened with Windsurf
- Quick access to recent projects with timestamps
- Remove projects from the list
- Show in Finder or copy path to clipboard
- Smart icons based on file types

## Commands

1. **Open with Windsurf** - Open a specific file or folder in Windsurf
2. **Windsurf Projects** - Browse and manage your recent Windsurf projects

## Requirements

- Windsurf IDE must be installed on your system
- The extension will check for Windsurf installation and show a message if not found

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. Use `npm run build` to build for production

## Usage

### Opening Files/Folders
1. Use the "Open with Windsurf" command
2. Enter the path to your file or folder
3. Press Enter to open in Windsurf
4. The item will be automatically added to your recent projects

### Managing Projects
1. Use the "Windsurf Projects" command
2. Browse your recent projects
3. Press Enter to open a project in Windsurf
4. Use keyboard shortcuts for additional actions:
   - `Cmd+F` - Show in Finder
   - `Cmd+C` - Copy path to clipboard
   - `Cmd+Delete` - Remove from list

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## License

MIT
