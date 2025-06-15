# Windsurf Extension for Raycast

A Raycast extension that provides quick access to Windsurf IDE functionality.

## Features

### 🚀 Open with Windsurf
- Quickly open any file or folder in Windsurf IDE
- Supports path expansion (use `~` for home directory)
- Automatically saves opened folders to recent projects

### 📁 Windsurf Projects
- View all folders previously opened with Windsurf
- Quick access to recent projects with timestamps
- **Add Project** - Manually add folders to your projects list
- Remove projects from the list
- Show in Finder or copy path to clipboard
- Smart icons based on file types
- **Note**: Only folders can be added as projects (files are not supported)

## Commands

1. **Open with Windsurf** - Open a specific file or folder in Windsurf
2. **Windsurf Projects** - Browse and manage your recent Windsurf projects

## Requirements

- Windsurf IDE must be installed on your system
- The extension will check for Windsurf installation and show a message if not found

## Installation

Install the extension from the [Raycast Store](https://raycast.com/store).

## Usage

### Opening Files/Folders
1. Use the "Open with Windsurf" command
2. Enter the path to your file or folder
3. Press Enter to open in Windsurf
4. Opened folders will be automatically added to your recent projects

### Managing Projects
1. Use the "Windsurf Projects" command
2. Browse your recent projects
3. Press Enter to open a project in Windsurf
4. Use keyboard shortcuts for additional actions:
   - `Cmd+N` - Add Project (manually select a folder)
   - `Cmd+F` - Show in Finder
   - `Cmd+C` - Copy path to clipboard
   - `Cmd+R` - Remove from list

### Adding Projects Manually
1. In the "Windsurf Projects" command, press `Cmd+N` or use the action panel
2. The extension will first try to use any folder selected in Finder
3. If no Finder selection, it will open a folder picker dialog
4. Select a folder to add it to your projects list
5. **Note**: Only folders can be added as projects

## License

MIT
