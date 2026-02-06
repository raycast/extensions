# Wispr Flow History

Search and browse your [Wispr Flow](https://wisprflow.ai) voice transcription history directly from Raycast.

## Requirements

- [Wispr Flow](https://wisprflow.ai) must be installed and have at least one transcription recorded.
- macOS Full Disk Access may be required to read the Wispr Flow database.

## Features

- **Search transcripts** — type to filter across all your dictations
- **Time-grouped list** — transcripts organized by Today, Yesterday, This Week, and older
- **App filter** — filter by which app you were dictating into (Slack, VS Code, Chrome, etc.)
- **Detail view** — full transcript text with metadata (source app, word count, duration)
- **Copy or paste** — press Enter to copy, or paste directly into your active app

## How It Works

Wispr Flow stores your transcription history in a local SQLite database on your Mac. This extension reads that database in read-only mode — it never modifies your data and makes no network requests.
