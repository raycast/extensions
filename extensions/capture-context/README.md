# Raycast Context Capture

A Raycast extension for capturing and organizing content with context, including screenshots and clipboard content, while preserving metadata like source application, URLs, and timestamps.

## Features

- **Silent Capture**: Capture context without UI interruption.
- **Clipboard Capture**: Save and annotate clipboard text.
- **Screenshot Comments**: Add comments to screenshots.
- **Capture Comments**: Annotate captures with context.
- **Flexible Storage**: Configure directories for storage.

## Commands

1. **Capture**: Silently capture context with a hotkey.
2. **Clipboard Capture**: Capture clipboard text instantly.
3. **Comment Captures**: Add/edit capture comments.
4. **Comment Screenshots**: Comment on recent screenshots.
5. **Manage Directories**: Set storage locations.

## Configuration

- **Screenshots Directory**: Default `~/Desktop/`
- **Capture Directory**: Default `~/Downloads/`

## Installation

1. Install from Raycast Store.
2. Configure directories.
3. Set up hotkeys for quick capture.

## Troubleshooting

If captures save to an old directory:

1. Clear Raycast cache:
   ```bash
   rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions-cache
   ```
2. Restart Raycast.

## License

MIT License
