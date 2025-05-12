# Wine

Launch installed Wine programs in Raycast.

[![CI](https://github.com/jordan/proj/actions/workflows/ci.yml/badge.svg)](https://github.com/jordan/proj/actions/workflows/ci.yml)

## Features

• Browse and launch installed Wine apps via their .desktop files.
• Sort and group by name or folder.
• Override Wine binary path, default WINEPREFIX, and add custom desktop directories.

## Usage

1. Press `⌘Space` and invoke **Launch Wine Program**.
2. Use the dropdowns to sort (ascending/descending) or group by folder.
3. Select an app to launch via Wine.

### Preferences

- **Wine Binary Path**: Path to `wine` executable.
- **Default WINEPREFIX**: Fallback WINEPREFIX if none set in Exec.
- **Additional .desktop Directories**: Comma-separated extra search paths.

## Troubleshooting

- Ensure .desktop files are in `~/.local/share/applications/wine/Programs/` or configured directories.
- Check Raycast logs for error toasts.

## Development

\```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm publish
\```