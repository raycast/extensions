# vxg

A Raycast extension for recording voice with AI-powered transcription using Google Gemini.

## Features

- **Real-time voice recording** with live audio level monitoring
- **AI transcription** using Google Gemini 2.0 Flash model with streaming results
- **Multiple output options**: Type text directly, paste to active app, or copy to clipboard
- **Capitalization variants**: Original or decapitalized first letter
- **File management**: View recordings in Finder, retry transcription, delete recordings
- **Persistent storage**: Audio files (.mp3) and transcriptions (.txt) saved to `/tmp/vxg/`

## Requirements

- **SoX audio tool**: Must be installed at `/opt/homebrew/bin/sox`
  ```bash
  brew install sox
  ```
- **Google Gemini API key**: Configure in Raycast extension preferences

## Configuration

- **Default Action**: Choose whether pressing Enter should Type (like Snippets) or Copy (like Clipboard History) the transcribed text. When set to Type, Cmd+Enter copies. When set to Copy, Cmd+Enter types.

## Usage

1. Launch the "Record and transcribe" command in Raycast
2. Click "Start Recording" or press Enter to begin recording
3. Speak into your MacBook Pro microphone
4. Click "Stop Recording" when finished
5. View the AI transcription in real-time as it streams
6. Use actions to type, paste, or copy the transcribed text
