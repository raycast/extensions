# Elsewhere

Control Elsewhere from focused Raycast commands without leaving your current context.

Elsewhere for macOS is required.

## Commands

### Audio and Spaces

- **Toggle Audio**
- **Switch Space**

### Background music

- **Toggle Background Music**
- **Switch Background Music**

### Volume

- **Make Ambience Louder** and **Make Ambience Quieter** (±10%)
- **Make Music Louder** and **Make Music Quieter** (±10%)

Volume commands leave Raycast open, so press Enter repeatedly for quick adjustments.

Immediate actions are no-view commands. Commands that require choosing a Space or track open a focused
Raycast list with current-state context.

If Elsewhere is not running, selection commands offer to open it and populate automatically when it is ready.
Immediate commands provide an **Open Elsewhere and Retry** confirmation.

## State snapshot contract

Elsewhere publishes the versioned `elsewhere-control-v1.json` snapshot in its macOS user-data directory. The extension
discovers that file below `~/Library/Application Support` using the app-family identifier
`app.glaze.macos.27b0yt1l*`, validates schema version 1 at runtime, and never reads Elsewhere's editable Space
documents directly.
