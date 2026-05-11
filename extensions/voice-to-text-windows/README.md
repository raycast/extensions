# Voice-to-Text for Windows

Record speech from your microphone, transcribe it with OpenAI Whisper, and clean it up with AI — built specifically for Windows.

## Features

- **Real-time audio visualization** — see your microphone waveform while recording
- **Multiple transcription models** — choose between GPT-4o Transcribe (best quality, $0.006/min), GPT-4o Mini Transcribe (good quality, $0.003/min), or Whisper v2 (legacy, $0.006/min)
- **50+ languages** — auto-detect or select from all Whisper-supported languages
- **AI cleanup modes** — General, Email, Slack/Chat, Notes, or your own custom prompt
- **Dictation history** — browse, search, copy, and paste past transcriptions
- **Auto-copy to clipboard** — results are copied automatically after transcription

## Setup

1. Get an OpenAI API key here: https://platform.openai.com/api-keys
2. Open extension preferences and paste your API key
3. Optionally configure language, transcription model, and prompt mode

## Commands

### Dictate

Record speech and convert it to clean text. Press **Enter** to stop recording and begin transcription. The result is automatically copied to your clipboard.

### Dictation History

Browse and search past dictations. Copy or paste previous results directly from the list.

### Select Mode

Quickly switch between AI cleanup modes:

- **General** — Fix grammar, punctuation, and filler words
- **Email** — Format as a professional email with subject line and sign-off
- **Slack / Chat** — Casual, concise messaging tone
- **Notes** — Structured bullet points
- **Custom** — Use your own prompt (configured in preferences)

## Requirements

- Windows 10 or later
- A working microphone (uses your system default from Windows Sound settings)
- OpenAI API key (for transcription and AI cleanup)
- Raycast Pro is optional - if you have it, AI cleanup uses your selected Raycast AI model. Otherwise falls back to gpt-4.1-nano.
