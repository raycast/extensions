# Compressor

Compress and resize images and videos in one click, optimized for the web.

## Features

- **Compress Files**: Quickly compress selected images and videos using optimized presets.
- **Resize Files**: Resize media to web-optimized dimensions (e.g., 720p, 1080p, etc.).
- **Optimize for Web**: A combined workflow that resizes and compresses files in one step.

## How it works

1. Select one or more files in Finder.
2. Run any of the Compressor commands from Raycast.
3. Your optimized files will be saved in a new folder named "Optimized" in the same directory as the source files.

## Optimization Details

- **Images**: Converted to high-quality WebP format with intelligent compression level 6.
- **Videos**: Converted to H.264 MP4 with a CRF of 23 and faststart flags for instant web playback.

## Requirements

- FFmpeg (automatically bundled for Windows and macOS, or uses system install).

## Author

Developed by [orelhassid](https://github.com/orelhassid).
