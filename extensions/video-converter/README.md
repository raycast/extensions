# Video Converter

A powerful Raycast extension to convert video and audio files into various formats with ease.

## Features

- Convert videos to a variety of formats: `mp4`, `mov`, `avi`, `mkv`, `webm`, `mpeg`
- Supports multiple codecs: `h264`, `h265`, `mpeg4`, `vp8`, `vp9`, `mpeg1`, `mpeg2`
- Set maximum file size or define custom bitrate
- Replace or remove audio tracks during conversion
- Hardware acceleration support for faster encoding
- Automatically grabs selected files from Finder
- Save and reuse your conversion settings with smart presets

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

## License

MIT