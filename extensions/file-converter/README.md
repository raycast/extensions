# File Converter

Convert any file to another format directly from Raycast — images, audio, and video — using files selected in Finder.

## Features

- **Convert File** — Pick any file and choose a target format from a dropdown
- **Convert to WebP / PNG / JPEG / TIFF / ICO** — Instantly convert the selected Finder image
- **Convert to MP4 / MP3 / WAV** — Instantly convert the selected Finder audio or video
- **Multi-file support** — Select multiple files in Finder and convert them all at once
- **Auto-detect** — The selected file in Finder is pre-filled automatically when you open a command

## Requirements

The following tools must be installed via Homebrew:

```bash
brew install ffmpeg imagemagick pandoc
```

## Usage

1. Select one or more files in Finder
2. Open Raycast and search for the target format (e.g. "Convert to WebP")
3. Press Enter — the converted file(s) are saved in the same folder

## Supported Formats

| Type     | Formats                                      |
|----------|----------------------------------------------|
| Image    | JPG, PNG, WebP, GIF, BMP, TIFF, AVIF, ICO   |
| Audio    | MP3, WAV, AAC, FLAC, OGG, M4A               |
| Video    | MP4, MKV, MOV, AVI, WebM, GIF               |
