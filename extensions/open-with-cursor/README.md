# Open with Cursor

Open files and folders from Finder directly in [Cursor](https://cursor.sh) editor with a single Raycast command.

## Features

- 🚀 **Quick Access**: Open selected files or folders in Cursor instantly
- 📁 **Smart Detection**: Automatically opens the current Finder window if nothing is selected
- 🔧 **CLI Support**: Uses Cursor's CLI when available for faster launching
- 💡 **Seamless Fallback**: Works even without the CLI installed

## Usage

1. **With Selection**: Select any file or folder in Finder, then trigger "Open with Cursor" from Raycast
2. **Without Selection**: With a Finder window open, trigger the command to open that directory
3. **Keyboard Shortcut**: Assign a hotkey in Raycast preferences for even faster access

## Installation

### From Raycast Store
Search for "Open with Cursor" in the Raycast Store and install with one click.

### Manual Installation
1. Clone this repository
2. Run `npm install` 
3. Run `npm run dev` to start development
4. The extension will appear in Raycast

### Optional: Install Cursor CLI
For the best experience, install Cursor's command-line interface:
1. Open Cursor
2. Press `⌘⇧P` to open the Command Palette
3. Run "Shell Command: Install 'cursor' command"

## Requirements

- macOS
- [Cursor](https://cursor.sh) editor installed
- [Raycast](https://raycast.com) app

## How it Works

The extension mimics the behavior of Raycast's built-in "Open with iTerm" command:
- First, it tries to get selected items from Finder using Raycast's API
- If nothing is selected, it falls back to the frontmost Finder window using AppleScript
- It then opens the path in Cursor, preferring the CLI if available

## Troubleshooting

**"Finder is not the active application"**  
Make sure Finder is the frontmost application when triggering the command.

**"No Finder window open"**  
Open at least one Finder window before using the command.

**Cursor doesn't open**  
Ensure Cursor is installed in your Applications folder. If you've installed it elsewhere, the extension may not find it.

## Author

Created by sincethestudy

## License

MIT