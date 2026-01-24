# HEIC to JPEG

A Raycast extension to convert HEIC/HEIF images to JPEG format using macOS native tools.

## Features

- **File Picker** - Select HEIC files through a dialog
- **Finder Selection** - Convert files currently selected in Finder
- **Batch Conversion** - Convert multiple files at once
- **Maximum Quality** - Converts at 100% quality to preserve image fidelity
- **Same Folder Output** - Saves JPEGs next to the original files

## Commands

| Command | Description |
|---------|-------------|
| Convert HEIC to JPEG | Opens a file picker to select HEIC files |
| Convert Selected Files | Converts HEIC files currently selected in Finder |

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start in development mode

Or install from Raycast Store (coming soon).

## How It Works

Uses macOS native `sips` command for conversion - no external dependencies required.

```bash
sips -s format jpeg -s formatOptions 100 input.heic --out output.jpg
```

## License

MIT
