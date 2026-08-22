# WayCompress

WayCompress is a local file compression extension for Raycast on macOS and Windows. It allows you to compress videos, images, audio files, and PDFs directly to a specific target size in Megabytes (such as a 20 MB Discord limit or a 10 MB email attachment cap) while retaining the highest possible visual and audio quality.

All processing runs locally on your system using open-source engines without sending any files or metadata to external servers.

---

## Why WayCompress? (Comparison with Other Extensions)

Most compression tools available in the Store use fixed quality percentage presets (e.g., "Low", "Medium", "High") or convert formats without guaranteeing a specific output size. This often results in trial-and-error when trying to fit media under platform upload limits.

WayCompress differs in several key ways:

- **Exact Target Size Targeting**: Instead of vague quality sliders, you specify an exact target size (e.g., `20` MB for Discord, `16` MB for WhatsApp, `10` MB for email, or any custom value). The extension calculates the exact bitrate budgets required to fit that size.
- **Two-Pass Video Encoding**: For video files, WayCompress runs a 2-pass H.264 encode with duration-based bitrate distribution and bits-per-pixel analysis, preserving original resolution whenever bitrate headroom permits.
- **Multi-Format Coverage in One Tool**: Handles Video (MP4/H.264), Images (JPEG, WebP, PNG, GIF), Audio (AAC/M4A), and PDF documents in a single workflow.
- **Cross-Platform File Detection**: Automatically detects the currently selected file in macOS Finder or Windows Explorer upon opening the command.
- **Strict Resolution Protection**: Includes dedicated compression strategies allowing you to lock image/video dimensions so they are never downscaled.

---

## Features

- **Target Size Control**: Set target file size in MB. The extension handles bitrate calculation, quantization, and container overhead adjustments.
- **Video Compression**: 2-pass MP4 encoding with automatic audio downmixing at tight budgets to prevent video artifacts.
- **Image Compression**: Iterative binary search across compression levels for JPEG, WebP, PNG, and GIF.
- **Audio Compression**: Dynamic AAC bitrate scaling based on duration.
- **PDF Compression**: Dual-engine support using Ghostscript for deep compression or built-in stream optimization.
- **Active File Selection**: Reads the currently highlighted file from Finder (macOS) or Explorer (Windows) when the command launches.
- **Built-in Diagnostics**: Includes a diagnostic command to check local CLI tool dependencies and provide install commands.

---

## Quick Presets

| Preset           | Target Size | Common Use Case                           |
| :--------------- | :---------- | :---------------------------------------- |
| Discord Free     | 20 MB       | Discord standard upload limit             |
| WhatsApp         | 16 MB       | WhatsApp media sharing limit              |
| Email Attachment | 10 MB       | Standard corporate email attachment limit |
| Legacy Discord   | 8 MB        | Legacy Discord upload limit               |
| Large Share      | 50 MB       | Quick cloud/link sharing                  |
| Video Share      | 100 MB      | Higher bitrate video sharing              |
| Custom           | Custom MB   | Any target size (e.g., 2.5, 35, 150)      |

---

## Requirements and Installation

WayCompress relies on standard CLI tools for media processing.

### 1. FFmpeg (Required for Video, Image, and Audio)

- **macOS** (via Homebrew):

  ```bash
  brew install ffmpeg
  ```

- **Windows** (via winget):
  ```powershell
  winget install Gyan.FFmpeg
  ```
  _(or `choco install ffmpeg` / `scoop install ffmpeg`)_

### 2. Ghostscript (Optional, for deep PDF compression)

- **macOS**:

  ```bash
  brew install ghostscript
  ```

- **Windows**:
  ```powershell
  winget install ArtifexSoftware.GhostScript
  ```

_If Ghostscript is not installed, WayCompress automatically falls back to its built-in PDF stream optimizer._

---

## Quality Strategies

When compressing a file, you can choose from three quality strategies:

1. **Smart Balanced (Default)**: Protects original resolution and framerate, only downscaling dimensions if the target bitrate falls below acceptable visual density thresholds.
2. **Strict Resolution**: Never alters width or height dimensions. If the file cannot reach the target size without downscaling, the extension alerts you rather than reducing resolution.
3. **Maximum Efficiency**: Prioritizes file size reduction and uses modern, high-efficiency encoding parameters.

---

## Usage

1. Open Raycast and run **Compress to Target Size**.
2. If a file is selected in Finder or Explorer, it will be selected automatically. Otherwise, choose a file with the file picker.
3. Choose a preset or enter a custom target size in MB.
4. Select your preferred Quality Strategy.
5. Press Enter to start compression.
6. When finished, use the action menu to reveal the output file in Finder/Explorer, open it directly, or copy its path.

To verify your local environment setup, run the **Compression Engine Diagnostics** command in Raycast at any time.

---

## License

MIT
