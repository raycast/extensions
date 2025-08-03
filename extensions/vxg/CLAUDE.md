# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- **Build the extension**: `npm run build` (uses `ray build`)
- **Development mode**: `npm run dev` (uses `ray develop`)
- **Lint code**: `npm run lint` (uses `ray lint`)
- **Fix lint issues**: `npm run fix-lint` (uses `ray lint --fix`)
- **Publish extension**: `npm run publish` (uses `npx @raycast/api@latest publish`)

## Project Architecture

This is a Raycast extension that provides voice recording and AI-powered transcription functionality using Google's Gemini AI.

### Core Components

**Recording System**: The application uses a hierarchical class structure:
- `RecordingController`: Manages the overall recording state and UI selection
- `Recording`: Represents individual recording sessions with transcription capabilities
- `AudioRecorder`: Handles the actual audio capture using SoX command-line tool

**Audio Processing**: Audio is captured using SoX (`/opt/homebrew/bin/sox`) to record from the MacBook Pro Microphone in MP3 format. Audio files are stored in `/tmp/vxg/` with UUIDs as filenames.

**Transcription Pipeline**: Uses Google's Gemini 2.0 Flash model for speech-to-text conversion. The transcription process streams results and saves both MP3 audio files and TXT transcription files.

**State Management**: Uses nanostores for reactive state management across the application, allowing real-time updates of recording status, transcription progress, and audio levels.

### Key Features

- Real-time audio level monitoring during recording
- Streaming transcription with live updates
- Multiple output options (type, paste, copy with capitalization variants)
- File management (show in Finder, delete recordings)
- Retry functionality for failed transcriptions

### Dependencies

- `@raycast/api`: Core Raycast extension framework
- `@google/generative-ai`: Google Gemini AI for transcription
- `nanostores`: Reactive state management
- `uuidv7`: Unique identifier generation
- SoX: External audio recording tool (must be installed at `/opt/homebrew/bin/sox`)

### Configuration

The extension requires a Gemini API key configured in Raycast preferences. The key is retrieved via `getPreferenceValues<{ gemini_api_key: string }>()`.