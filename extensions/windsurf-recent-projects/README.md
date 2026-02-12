# Windsurf Raycast Extension

Control Windsurf directly from Raycast - Search and open recent projects from Windsurf.

## Features

- 🔍 **Search Recent Projects**: Quickly search through your recently opened projects in Windsurf
- 📌 **Pin Favorites**: Pin your favorite projects for quick access
- 🌿 **Git Integration**: Display current Git branch for projects
- 🖥️ **Multiple Open Modes**: Open with Windsurf, close other windows, or open in new window
- 📂 **File Management**: Copy paths, show in Finder
- 🎨 **Customizable Layout**: Choose between List and Grid views

## Commands

### 1. Search Recent Projects
Search and open recent projects from Windsurf with filtering options.

**Default Shortcut**: `Cmd + Shift + Enter` to open in new window

**Keyboard Shortcuts**:
- `Cmd + O` - Open with system default app
- `Cmd + Shift + O` - Open with Terminal
- `Cmd + .` - Copy project name
- `Cmd + Shift + .` - Copy project path
- `Cmd + Shift + P` - Toggle pin
- `Cmd + Opt + ↑/↓` - Move pinned entry
- `Ctrl + X` - Remove from recent

### 2. Open with Windsurf
Opens the currently selected Finder item with Windsurf.

### 3. Open New Window
Opens a new Windsurf window.

### 4. Show Installed Extensions
View and manage your installed Windsurf extensions.

### 5. Install Extension
Search and install extensions from the VS Code Marketplace.

## Installation

### From Source

```bash
git clone https://github.com/ma-samsik/raycast-windsurf-extension.git
cd raycast-windsurf-extension
npm install
npm run dev
```

This will open Raycast development mode where you can test the extension.

### Build for Distribution

```bash
npm run build
```

## Development

### Project Structure

```
src/
├── index.tsx              # Main command - Search Recent Projects
├── open-with-windsurf.tsx # Open selected Finder item
├── open-new-window.tsx    # Open new Windsurf window
├── database.ts            # Windsurf DB access & recent entries
├── windsurf.ts            # Open project functionality
├── pinned.ts              # Pinned entries management
├── preferences.tsx        # User preferences
├── types.ts               # Type definitions
├── constants.ts           # Constants (DB paths, app name)
├── utils.ts               # Utility functions
├── grid-or-list.tsx       # Adaptive UI components
├── contexts/
│   └── ProjectContext.tsx # Project context provider
└── utils/
    ├── git.ts             # Git branch detection
    └── exec.ts            # Command execution helpers
```

### Environment Variables

None required, but Windsurf must be installed on your system.

## Prerequisites

- macOS 11 or later
- Windsurf installed and in PATH or Applications folder
- Raycast 1.83+

## Configuration

Open Raycast preferences for this extension to configure:

- **View Layout**: Choose between List and Grid view
- **Keep Section Order**: Maintain section order while searching
- **Close Other Windows**: Close other Windsurf windows when opening a project
- **Terminal App**: Select terminal app for folder operations
- **Git Integration**: Show/hide Git branch information
- **Git Branch Color**: Customize Git branch tag color

## Troubleshooting

### Database Not Found
If you see "Failed to load recent projects":
1. Ensure Windsurf is installed
2. Check if `~/.windsurf/` directory exists
3. Open a project in Windsurf to create the database

### Windsurf Not Found
If the extension can't find Windsurf:
1. Try installing via: `windsurf --install` (if available)
2. Or use `open -a Windsurf` to verify installation
3. Add Windsurf to PATH if needed

### Database File Locations Checked
- `~/.windsurf/User/globalStorage/state.vscdb`
- `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Related

- [Windsurf](https://www.codeium.com/windsurf)
- [Raycast](https://raycast.com)
- [Cursor Recent Projects Extension](https://github.com/raycast/extensions/tree/main/extensions/cursor-recent-projects) (Original inspiration)
