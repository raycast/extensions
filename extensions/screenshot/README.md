# Screenshot Extension for Raycast

Capture your screen effortlessly using macOS native tools directly from Raycast.

## Features

This extension provides various screenshot commands using the built-in macOS `screencapture` utility:

- **All in One**: Opens the graphical toolbar with all options (Area/Window/Screen) and copies to clipboard with success feedback
- **Capture Area**: Opens the crosshair for manual area selection
- **Capture Window**: Starts in window selection mode (camera icon)
- **Capture Window to Clipboard**: Captures a selected window directly to the clipboard
- **Capture Screen**: Captures the entire screen immediately and saves to `~/Desktop/screen.png`
- **Capture Timer**: Captures the screen after a delay (default 5 seconds) and saves to `~/Desktop/timed_shot.png`
- **Capture to Clipboard**: Interactive area selection that saves to the clipboard
- **Capture and Annotate**: Interactive selection that opens in Preview for markup

## Usage

1. Install the extension from the Raycast Store
2. Search for "Screenshot" in Raycast to see all available commands
3. Select the desired capture mode and follow the on-screen instructions

For the **Capture Timer** command, you can optionally specify a delay time in seconds as an argument (defaults to 5 seconds if not provided).

## Requirements

- macOS (uses native `screencapture` utility)
- Raycast app

## Permissions

The extension requires permission to execute system commands for screen capture. macOS may prompt for screen recording permissions on first use.

## Technical Details

This extension leverages the macOS `screencapture` command with various flags:

- `-i`: Interactive mode (select area/window)
- `-c`: Force capture to clipboard
- `-W`: Select window mode
- `-U`: Show the interactive toolbar
- `-P`: Open the image in Preview after capture
- `-T`: Set a timer in seconds

For more information about `screencapture`, see the [official man page](https://leancrew.com/all-this/man/man1/screencapture.html).

## Feedback

All commands show a HUD notification on success or failure.

## Contributing

Contributions are welcome! Please see the [Raycast documentation](https://developers.raycast.com/basics/contribute-to-an-extension) for guidelines on contributing to extensions.

## License

MIT
