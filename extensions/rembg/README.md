# RemBg - Raycast Extension

Remove backgrounds from images directly from Raycast. Runs 100% locally using [rembg](https://github.com/danielgatis/rembg) — no API, no cloud, no data leaves your Mac. Produces significantly better results than the built-in macOS background removal.

## Features

- **Remove Background**: Select images in Finder and remove their backgrounds instantly.
- **Remove Background from Clipboard**: Remove the background from an image currently in your clipboard.

## Requirements

You need **Python 3.10 to 3.13** installed on your Mac. That's it — `rembg` is automatically installed on first run if needed.

The first setup can take a few minutes (virtualenv + package install + model download).

### Troubleshooting

- If setup fails, install Python 3.13 with `brew install python@3.13`.
- Restart Raycast and run the command again.

## Settings

- **Output Suffix**: Text added to the output filename (default: `_nobg`).
- **Copy to Clipboard**: Automatically copy the result to your clipboard after processing.
- **Processing Mode**:
  - `Quality`: Best cutout (heavier models + alpha matting + mask cleanup).
  - `Speed`: Fastest processing (lightweight model, minimal post-processing).
