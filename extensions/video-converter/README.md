# Video Converter

A powerful Raycast extension to convert video and audio files into various formats with ease.

## Features

- Convert videos to a variety of formats: `mp4`, `mov`, `avi`, `mkv`, `webm`, `mpeg`, `gif`
- Supports multiple codecs: `h264`, `h265`, `mpeg4`, `vp8`, `vp9`, `mpeg1`, `mpeg2`
- Set maximum file size or define custom bitrate
- Replace audio tracks, or enable Remove Audio to export without sound (overrides replacement audio and hides audio bitrate settings)
- Hardware acceleration support for faster encoding
- Automatically grabs selected files from Finder on macOS; use the file picker on Windows
- Save and reuse your conversion settings with smart presets

## GIF conversion and estimated size

Choose **GIF** in Convert Video or Quick Convert to use gifski. GIF mode replaces video codec, preset, compression, audio and hardware acceleration controls with **Quality (%)** (default 50) and **FPS** (from the source video). Clear FPS to restore automatic detection; for multiple files each source retains its own frame rate unless you enter an override. GIF supports at most 100 FPS and quantizes timing to hundredths of a second. Output keeps the source dimensions and loops continuously.

Install the gifski CLI in addition to FFmpeg:

- macOS: `brew install gifski`.
- Windows: download `gifski.exe` from the [official releases](https://github.com/ImageOptim/gifski/releases), extract it and add its directory to PATH.
- Custom location: set `GIFSKI_PATH` to the full executable path. Restart Raycast after installation or environment changes.

**Estimated Size** is available in both commands and shows the total for all selected files. Video estimates use duration and video/audio bitrate (or the target size). GIF estimates encode short samples from the beginning, middle and end at the selected quality/FPS, extrapolate to the full duration and add 10% headroom, following the sampling approach used by the [Gifski app](https://github.com/sindresorhus/Gifski/blob/main/Gifski/EstimatedFileSize.swift). Estimates update after settings change and cancel obsolete background work. Actual sizes can differ, particularly with changing scene complexity or variable-bitrate video.

## Requirements

This extension requires [FFmpeg](https://ffmpeg.org/) to be installed on your system.

### Install FFmpeg on macOS

There are several ways to install FFmpeg, but the easiest is via [Homebrew](https://brew.sh), a package manager for macOS.

#### Step 1: Install Homebrew (if not already installed)

Open Terminal and paste the following command:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions to complete the installation.

#### Step 2: Install FFmpeg using Homebrew

Once Homebrew is installed, run:

```sh
brew install ffmpeg
```

This will install FFmpeg with default options, including support for most common codecs.

#### Step 3: Verify Installation

After installation, verify that FFmpeg is accessible from your terminal by running:

```sh
ffmpeg -version
```

You should see version information if the installation was successful.

If you see a "command not found" error, try restarting your terminal or ensuring that Homebrew's path is added to your shell configuration (e.g., `.zshrc`, `.bash_profile`).

### Install FFmpeg on Windows

Run in PowerShell:

```powershell
winget install --id Gyan.FFmpeg --exact
```

Alternatively, download a full Windows build from [FFmpeg Downloads](https://ffmpeg.org/download.html). Extract the entire build (including any DLLs) and add its `bin` directory to PATH. Both `ffmpeg.exe` and `ffprobe.exe` are required. Restart Raycast after installation or changes to PATH.

Verify both tools:

```powershell
ffmpeg -version
ffprobe -version
```

The extension searches PATH, WinGet's user links directory and Chocolatey's bin directory on Windows, and Homebrew directories on macOS. For other locations, set `FFMPEG_PATH` and `FFPROBE_PATH` to full executable paths in Raycast's environment.

### Encoding libraries and hardware acceleration

Use a full FFmpeg build containing `libx264` (H.264), `libx265` (HEVC), `libvpx` / `libvpx-vp9` (VP8/VP9), and `libopus` (WebM audio). AAC, MP2 and MPEG video use FFmpeg's native encoders. Missing encoders produce an error naming the required library.

With hardware acceleration enabled, Windows tries NVIDIA NVENC, Intel Quick Sync (QSV), then AMD AMF for H.264/HEVC. macOS uses VideoToolbox. Each candidate must be included in FFmpeg and pass a short encoding probe with the installed GPU/driver; otherwise conversion falls back to the software library. The probe cannot guarantee support for every input resolution or pixel format. Other codecs use software encoding.

The Preset setting applies to `libx264` and `libx265`; other encoders use their own defaults to avoid incompatible options.

### Development

```sh
bun install
bun test
bun run build
bun run lint
```

## License

MIT
