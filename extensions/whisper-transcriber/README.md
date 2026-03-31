# Whisper Transcriber

Transcribe local audio and video files in Raycast using the open-source [Whisper](https://github.com/openai/whisper) CLI.

## Features

- Transcribe common audio and video formats from a simple file picker
- Save transcript files to a temporary folder, next to the source file, or a custom directory
- Choose the Whisper model that fits your speed and quality needs
- Copy the transcript from Raycast or open the generated TXT file
- Runs locally on your Mac after Whisper is installed

## Requirements

This extension depends on the Whisper command-line tool and `ffmpeg`.

- Install Whisper: `pip install -U openai-whisper`
- Install ffmpeg on macOS: `brew install ffmpeg`

Whisper's official setup instructions are available in the [openai/whisper README](https://github.com/openai/whisper).

## Raycast Preferences

The extension exposes a few preferences so users do not need to manage shell environment variables:

- `Whisper Model`: Select the model to use for new transcriptions
- `Output Location`: Save transcripts to a temp folder, the source folder, or a custom directory
- `Custom Output Directory`: Used only when `Output Location` is set to `Custom Output Directory`
- `Whisper CLI Path`: Optional override for the `whisper` binary
- `FFmpeg Path`: Optional override for the `ffmpeg` binary

## Usage

1. Open `Transcribe File` in Raycast.
2. Pick an audio or video file from your Mac.
3. Wait for Whisper to finish transcribing.
4. Copy the transcript, open the TXT file, or reveal it in Finder.

## Troubleshooting

- If Raycast says it cannot find `ffmpeg`, install it with Homebrew or set the `FFmpeg Path` preference.
- If Raycast says it cannot start `whisper`, install Whisper or set the `Whisper CLI Path` preference.
- If Whisper fails to download a model because of SSL certificates, download the model once from Terminal or repair your Python certificate setup and retry.

## Privacy

This extension runs locally and does not upload your media files by itself. Any downloads are limited to Whisper model files from the Whisper CLI when a model is not cached yet.
