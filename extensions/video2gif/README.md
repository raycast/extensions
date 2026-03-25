# Video to GIF

A Raycast extension that converts videos to high-quality GIFs using ffmpeg.

![Custom Convert Form](metadata/screenshot-1.png)

![Conversion Complete](metadata/screenshot-2.png)

## Features

- **Quick Convert** — select a video in Finder, trigger the command, done. Uses your default settings.
- **Custom Convert** — fine-tune quality, dimensions, FPS, speed, loop mode, and trim before converting.
- **Two-pass palette generation** for superior colour quality compared to standard GIF encoding.
- **Live file size estimation** as you adjust settings.
- **Progress tracking** with percentage and estimated time remaining.
- **Recent conversions** — last 5 conversions shown in the custom convert form.

## Requirements

[ffmpeg](https://ffmpeg.org/) must be installed on your system:

```bash
brew install ffmpeg
```

## Commands

| Command | Description |
|---------|-------------|
| **Convert to GIF** | Instantly converts the selected Finder file using your default preferences |
| **Convert to GIF (Custom)** | Opens a settings form for full control over the conversion |

## Settings

Configurable via Raycast extension preferences:

- **Output Folder** — where GIFs are saved (default: Desktop)
- **Default Quality** — 1–100 (default: 80)
- **Default Max Width** — Original, 320, 480, 640, 800, or 1080px (default: 640)
- **Default FPS** — 1–50 (default: 15)
- **Default Loop Mode** — Loop Forever or No Loop
- **Long Video Threshold** — videos longer than this auto-show trim fields (default: 30s)

## Input Methods

The extension resolves video files in this order:

1. Selected file in Finder
2. File path on clipboard
3. Falls back to a file picker

Supported formats: MP4, MOV, AVI, MKV, WebM, M4V.

## Licence

MIT
