# Cursor Launcher

A Raycast extension that allows you to quickly create new project folders, open recent projects, and open any directory in Cursor IDE.

## Features

### Create Project
- Create new project folders with a custom name
- Configurable base directory (default: `C:\git`)
- Real-time validation feedback for project names
- Shows full project path preview as you type
- Automatically opens the new project in Cursor IDE
- Validates project names for Windows compatibility
- Automatically adds to recent projects

### Recent Projects
- View all recently opened projects
- **Pin/Favorite Projects**: Pin frequently used projects to keep them at the top in a separate section
- Pinned projects are visually distinct and grouped separately
- Quick access to frequently used projects
- Shows last opened time
- Smart project type detection (Node.js, Python, Go, Rust, Java, PHP, Ruby, Git)
- Different icons for different project types
- Remove individual projects or clear all
- Automatically filters out deleted projects
- **Keyboard Shortcuts**:
  - `Enter` - Open in Cursor
  - `Cmd+E` - Show in Finder/File Explorer
  - `Cmd+C` - Copy path
  - `Cmd+P` - Pin/Unpin project
  - `Cmd+R` - Refresh list
  - `Cmd+Shift+Delete` - Clear all

### Open Directory
- Browse and navigate folders with a native List-based browser
- Quick access to common directories (Home, Desktop, Documents, Downloads, Base Directory)
- Navigate up directories with Backspace key
- Enter a folder with Enter key, select folder with Shift+Enter
- Browse folders with Cmd+Enter
- Shows current path in navigation title
- Automatically adds opened directories to recent projects
- **Keyboard Shortcuts**:
  - `Enter` - Open selected folder in Cursor
  - `Cmd+Enter` - Browse into selected folder
  - `Shift+Enter` - Select current folder
  - `Backspace` - Go up to parent directory

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development mode:
   ```bash
   npm run dev
   ```

3. Configure preferences:
   - Open Raycast
   - Go to Extensions → Cursor Launcher → Preferences
   - Set your preferred base directory (default: `C:\git`)
   - Optionally set max recent projects (default: 20)

## Usage

### Create a New Project
1. Open Raycast
2. Search for "Create Project"
3. Enter your project name (validation feedback appears as you type)
4. Review the full path preview
5. Press Enter or click "Create Project"
6. The project folder will be created and opened in Cursor

**Using Arguments**: You can also create a project directly by typing `Create Project my-project-name` in Raycast search. The project will be created automatically without showing the form.

### Open Recent Projects
1. Open Raycast
2. Search for "Recent Projects"
3. Browse your recently opened projects
4. Use keyboard shortcuts for quick actions:
   - `Enter` to open in Cursor
   - `Cmd+C` to copy path
   - `Cmd+P` to pin/unpin
   - `Cmd+E` to show in Finder
5. Pin frequently used projects to keep them at the top

### Open Any Directory
1. Open Raycast
2. Search for "Open Directory"
3. Browse folders using the List-based browser
4. Use quick access items for common directories
5. Navigate into folders with Enter or Ctrl+Enter
6. Select a folder with Enter to open in Cursor
7. Use Backspace to go up to parent directories

**Using Arguments**: You can open a folder directly by typing `Open Directory folder-name` in Raycast search (where `folder-name` is a folder in your base directory). The folder will open immediately if found.

## Commands

- **Create Project** - Create a new project folder and open it in Cursor with real-time validation
- **Recent Projects** - View and open recently opened projects with pinning support and grouped sections
- **Open Directory** - Browse and open any directory in Cursor using a native List-based folder browser

## Keyboard Shortcuts

### Recent Projects
- `Enter` - Open project in Cursor
- `Cmd+E` - Show in Finder/File Explorer
- `Cmd+C` - Copy project path to clipboard
- `Cmd+P` - Pin/Unpin project
- `Cmd+R` - Refresh recent projects list
- `Cmd+Shift+Delete` - Clear all recent projects

### Open Directory
- `Enter` - Open selected folder in Cursor
- `Ctrl+Enter` - Browse into selected folder
- `Backspace` - Go up to parent directory

## Project Type Detection

The extension automatically detects project types:
- **Node.js/JavaScript/TypeScript** - Detects `package.json`
- **Python** - Detects `requirements.txt`, `setup.py`, `pyproject.toml`, `Pipfile`
- **Go** - Detects `go.mod`, `go.sum`
- **Rust** - Detects `Cargo.toml`
- **Java** - Detects `pom.xml`, `build.gradle`
- **PHP** - Detects `composer.json`
- **Ruby** - Detects `Gemfile`, `Rakefile`
- **Git** - Detects `.git` folder

## Requirements

- Cursor IDE installed on your system
- Windows (extension is optimized for Windows paths)

## Configuration

The extension uses Raycast preferences to store settings:

- **Base Directory**: Directory where new projects will be created (default: `C:\git`)
- **Max Recent Projects**: Maximum number of recent projects to keep (default: 20)

Recent projects and pinned projects are stored locally and persist between sessions.

## Troubleshooting

### Cursor Not Opening
- Ensure Cursor is installed and accessible
- Check if Cursor is in your system PATH
- Try opening Cursor manually first to ensure it's working
- The extension automatically searches common installation paths

### Projects Not Appearing
- Use the refresh action (`Cmd+R`) to reload the list
- Check if projects still exist on disk
- Deleted projects are automatically filtered out
- Pinned projects appear in a separate section at the top

### Folder Browser Issues
- If you can't navigate into a folder, check folder permissions
- Empty folders will show an empty state with options to select the current folder
- Use Backspace to navigate up if you get stuck
- Quick access items provide shortcuts to common directories

### Terminal Not Opening
- Ensure Windows Terminal, PowerShell, or CMD is available
- The extension tries multiple terminal applications automatically
- Windows Terminal is tried first, then PowerShell, then CMD

### Project Name Validation Errors
- Project names cannot contain: `< > : " | ? *` or control characters
- Reserved Windows names (CON, PRN, AUX, NUL, COM1-9, LPT1-9) are not allowed
- Validation feedback appears as you type in the Create Project form

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
