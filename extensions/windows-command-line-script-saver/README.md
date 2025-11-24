# Windows Command Line Script Saver

A Raycast extension for Windows that lets you save, organize, and execute your most-used Command Prompt scripts with a single click.

## Features

- **Save Scripts**: Quickly save multi-line command sequences with a name and working directory
- **Execute with One Click**: Run saved scripts directly from Raycast and view the output in real-time
- **Edit Scripts**: Modify existing scripts (name, directory, or commands) with a simple form
- **Smart Organization**: Scripts are automatically sorted by last accessed time
- **Command Management**: Copy commands, view details, edit, and delete scripts you no longer need
- **Error Handling**: Clear error messages and non-fatal stderr handling for better script execution feedback

## Commands

### Save Script
Save a new Windows Command Prompt script by providing:
- **Script Name**: A descriptive name for easy identification
- **Working Directory**: The directory where commands should run (defaults to `C:\`)
- **Commands**: One or more commands (one per line)

### View Scripts
Browse and manage your saved scripts:
- **Execute**: Run the script and view live output (Enter)
- **Edit**: Modify the script name, working directory, or commands (Ctrl+E)
- **Copy Commands**: Copy just the commands to clipboard (Ctrl+C)
- **Copy Full Script**: Copy the complete script including directory change (Ctrl+Shift+C)
- **Delete**: Remove scripts you no longer need (Ctrl+D)

## Usage

1. Open Raycast and search for "Save Script"
2. Enter a name, working directory, and commands for your script
3. Submit the form to save
4. Use "View Scripts" to browse and execute your saved scripts
5. Click on any script to execute it and view the output

### Example Use Cases

- Quickly run build and deployment sequences
- Execute database backup scripts
- Run cleanup or maintenance commands
- Chain multiple development environment setup commands

## Keyboard Shortcuts

- **Enter**: Execute script
- **Ctrl+E**: Edit script
- **Ctrl+C**: Copy commands only
- **Ctrl+Shift+C**: Copy full script with directory change
- **Ctrl+D**: Delete script

## Technical Details

- Scripts are stored in Raycast's LocalStorage
- Commands are executed using Node.js `child_process.exec`
- Working directory is set using `cd /d` for proper drive changes
- stderr output is treated as non-fatal and displayed separately
- Navigation uses Raycast's push/pop API for smooth screen transitions

## Development

```cmd
npm install
npm run dev
```

### Scripts
- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix linting issues automatically
- `npm run publish` - Publish to Raycast Store

## Requirements

- Raycast (Windows version)
- Node.js

## License

MIT

## Author

anhad_sodhi
