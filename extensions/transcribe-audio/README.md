# Transcribe Audio for Raycast

Transcribe audio and video files from Finder using OpenAI, Deepgram, or ElevenLabs. Copy the result to your clipboard, or save it as Markdown, plain text, or SRT next to the source file.

## Features

- **Multiple providers:** OpenAI `gpt-4o-transcribe`, Deepgram `Nova-3`, and ElevenLabs `Scribe v2`.
- **Audio type presets:** Voice note, meeting, interview, lecture, call, and podcast. Each preset chooses sensible defaults, including speaker labels when it makes sense.
- **Speaker labels:** Optional diarization for providers that support it.
- **Output formats:** Markdown, plain text, or SRT (when timestamps are available).
- **Native Raycast file picker:** pick a file inside Raycast without the command closing.
- **Transcription history:** browse, copy, and re-save recent transcripts.
- **Format conversion:** unsupported or oversized files are converted to a provider-friendly format with FFmpeg.

## Supported input formats

Audio: MP3, WAV, M4A, MP4, FLAC, OGG, AAC, CAF, AIF, AIFF, M4R, WebM, and common video formats.

The source file is never modified; conversion happens in a temporary directory that is cleaned up afterwards.

## Requirements

- macOS with Raycast
- Node.js and npm
- `ffmpeg` installed and available on `PATH` (used for video files and unsupported formats)
- API key for at least one provider

## Install locally

```bash
cd /Volumes/Conductor/CodingAgents-Projects/transcribe-audio-raycast
npm install
ray develop
```

## Configuration

Open the extension’s preferences in Raycast to add your API keys.

| Preference | Description |
|------------|-------------|
| OpenAI API Key | For `gpt-4o-transcribe` |
| Deepgram API Key | For `Nova-3` |
| ElevenLabs API Key | For `Scribe v2` |
| Default Provider | Which provider is selected by default |
| Default Audio Type | Which preset is selected by default |
| Language | Optional ISO 639-1 language code (e.g. `en`, `pt`) |

## Usage

1. Run the command and pick an audio or video file with the native file picker.
2. Choose an audio type and whether to label speakers.
3. Copy the transcript, or save it as Markdown, plain text, or SRT beside the source file.

## Provider notes

- **OpenAI:** 25 MB file limit (oversized files are converted to mono MP3; if still too large the command errors), no speaker diarization, simple API.
- **Deepgram:** up to 2 GB files, fast, supports speaker diarization.
- **ElevenLabs:** up to 3 GB / 10 hours, supports up to 32 speakers, word-level timestamps.

## Acknowledgements

This extension uses [FFmpeg](https://ffmpeg.org) to convert audio and video files when the selected provider cannot accept the original format directly.

## Project layout

```
src/
├── transcribe.tsx          # Main Raycast command and UI
├── history.tsx             # Transcription history browser
├── types.ts                # Shared types and preset configs
├── preferences.ts          # Raycast preferences helpers
├── providers/
│   ├── index.ts            # Provider router
│   ├── openai.ts           # OpenAI transcription client
│   ├── deepgram.ts         # Deepgram transcription client
│   └── elevenlabs.ts       # ElevenLabs transcription client
└── utils/
    ├── audio.ts            # FFmpeg conversion helpers
    ├── files.ts            # File path helpers
    ├── format.ts           # Transcript formatting
    ├── history.ts          # LocalStorage history helpers
    └── streams.ts          # Upload streaming helpers
```
