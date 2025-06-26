# Mouse Auto Clicker

A Raycast extension that provides a simple toggle-able mouse auto-clicker functionality.

## Features

- **Toggle Auto Clicker**: Start and stop mouse auto-clicking with a single command
- **Continuous Operation**: Runs indefinitely until manually stopped
- **Customizable Interval**: Configure click intervals (default: 100ms)
- **Background Operation**: Runs in the background while active
- **Toast Notifications**: Visual feedback when toggling on/off
- **Automatic Cleanup**: Properly stops when extension is deactivated or system sleeps
- **Current Position Clicking**: Clicks at the current mouse cursor position

## Commands

- **Toggle Auto Clicker**: Start or stop the mouse auto-clicker

## Setup and Requirements

### Dependencies

This extension uses `cliclick` for mouse automation, which requires **Homebrew** for installation.

#### Automatic Installation
1. **Install the extension** through Raycast
2. **Run the command** for the first time
3. **Follow installation prompts**:
   - If Homebrew is not installed, you'll get a link to install it from https://brew.sh
   - If cliclick is not installed, you'll get a button to install it automatically via `brew install cliclick`

#### Manual Installation
If you prefer to install dependencies manually:

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install cliclick
brew install cliclick
```

### macOS Accessibility Permissions

This extension requires **Accessibility permissions** on macOS for cliclick to function properly.

1. **Run the command** for the first time
2. **Grant Accessibility permission** when prompted:
   - Go to `System Preferences > Security & Privacy > Privacy`
   - Select `Accessibility` from the left sidebar
   - Click the lock icon to make changes
   - Add `Raycast` to the list of allowed applications
   - Ensure the checkbox next to `Raycast` is checked

## Usage

1. **Position your mouse** where you want clicks to occur
2. **Start Auto Clicker**: Run the "Toggle Auto Clicker" command
3. **Verify it's working**: You should see clicks happening in the area around where you positioned your mouse
4. **Stop Auto Clicker**: Run the same command again to stop

## How to Test

To verify the auto-clicker is working:
- Position your mouse over a text field or clickable area
- Start the auto-clicker
- You should see the element being clicked repeatedly
- Open a text editor and position your mouse over it - you'll see the cursor appearing repeatedly
- Try it on buttons, links, or other interactive elements

## Configuration

The extension supports the following preference:

- **Click Interval**: Time between clicks in milliseconds (default: 100ms)

## Important Notes

- **Use responsibly**: Auto-clickers can interfere with normal computer usage
- **Accessibility required**: macOS Accessibility permissions are mandatory for this extension to work
- **Automatic cleanup**: The auto-clicker will stop when:
  - You run the toggle command again
  - Raycast is quit
  - The system goes to sleep
  - The extension is deactivated

## Troubleshooting

### Permission Issues
- If you get permission errors, ensure Raycast has Accessibility permissions
- Restart Raycast after granting permissions
- Check that the permission is enabled in System Preferences

### System Requirements
- macOS only (uses cliclick for mouse control)
- Requires Homebrew and cliclick (installation handled automatically)
- Requires Accessibility permissions for cliclick

## License

MIT License