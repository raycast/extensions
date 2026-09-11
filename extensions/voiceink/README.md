# VoiceInk

Quick access to your [VoiceInk](https://tryvoiceink.com) transcriptions directly from Raycast.

## Features

- **Search Transcriptions**: Browse recent transcriptions or search through your entire history with multi-word matching
- **Quick Actions**: Copy, paste, or view details with keyboard shortcuts

## Setup

This extension reads directly from VoiceInk's local database. No API keys required.

### Database Source

The extension auto-detects your VoiceInk installation. If you have multiple versions or a custom installation, configure the database source in extension preferences:

- **Auto Detect** (default): Automatically finds VoiceInk Official or CE
- **VoiceInk (Official)**: Use the official VoiceInk app
- **VoiceInk CE**: Use VoiceInk Community Edition
- **Custom Path**: Specify a custom database path

## Keyboard Shortcuts

| Shortcut | Action                             |
| -------- | ---------------------------------- |
| `Enter`  | Copy text to clipboard             |
| `⌘ ⇧ C`  | Copy original text (when enhanced) |
| `⌘ ⇧ V`  | Paste text directly                |
| `⌘ D`    | View transcription details         |
