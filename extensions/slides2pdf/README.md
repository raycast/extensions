# Slides2pdf

This Raycast command converts PowerPoint (.pptx) files into PDF using LibreOffice in headless mode.

## Setup Instructions

### macOS

Install LibreOffice via Homebrew:

```bash
brew install --cask libreoffice
```

After installation, the `soffice` binary is usually available at one of these locations:

- `/Applications/LibreOffice.app/Contents/MacOS/soffice`
- `/opt/homebrew/bin/soffice` (Homebrew on Apple Silicon)
- `/usr/local/bin/soffice` (Homebrew on Intel)

If the command can't find `soffice`, make sure the binary is in your PATH or update the extension to call the full path.

### Ubuntu / Debian (Linux)

Install LibreOffice using apt:

```bash
sudo apt-get update
sudo apt-get install libreoffice
```

The `soffice` binary will usually be at `/usr/bin/soffice`.

### Windows

1. Download LibreOffice from: https://www.libreoffice.org/download/
2. Install it (default path: `C:\Program Files\LibreOffice`).
3. Add `C:\Program Files\LibreOffice\program` to your PATH environment variable, or update the command to call `soffice.exe` using its full path.

## Troubleshooting

- If you see "LibreOffice (soffice) not found", ensure LibreOffice is installed and `soffice` is available in PATH.
- On macOS Apple Silicon, Homebrew installs to `/opt/homebrew`; if your PATH doesn't include that, either add it or install the cask which symlinks the app into `/Applications`.
- If conversions fail but `soffice` is present, try running the same `soffice --headless --convert-to pdf --outdir <outdir> <file>` command in Terminal to get more detailed output.

## Preferences

- `Open when single file converted` — when enabled, the generated PDF opens immediately for single-file conversions.
- `Open when multiple files converted` — when enabled, all generated PDFs are opened after batch conversions finish.

## Notes

- This command uses LibreOffice in headless mode (no GUI). It relies on the `soffice` binary which LibreOffice provides.
- If you want a persistent menu-bar indicator, that would require a different extension type. The command shows progress via Raycast toasts.