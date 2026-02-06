# Wispr Flow History

Search and browse your [Wispr Flow](https://wisprflow.ai) voice transcription history directly from Raycast.

## Requirements

- [Wispr Flow](https://wisprflow.ai) must be installed and have at least one transcription recorded.
- macOS Full Disk Access may be required to read the Wispr Flow database.

## Features

- **Infinite scroll** — transcripts load progressively as you scroll
- **Search transcripts** — type to filter across all your dictations
- **Time-grouped list** — transcripts organized by Today, Yesterday, This Week, Last Week, and Older
- **App filter** — filter by which app you were dictating into (Slack, VS Code, Chrome, etc.)
- **Sort options** — sort by newest, oldest, longest duration, or most words
- **Detail view** — full transcript text with metadata (source app, dictation time, word count, duration, WPM)
- **View original transcription** — see the raw text before Wispr's formatting
- **Open source app** — launch the app a transcript was dictated in
- **Archive transcripts** — archive transcripts you no longer need
- **Copy or paste** — press Enter to copy, or paste directly into your active app

## Preferences

- **Primary Action** — choose Copy to Clipboard or Paste to Active App as the default action
- **Show Archived** — include archived transcripts in the list
- **Minimum Duration** — hide transcripts shorter than a specified duration (filters out accidental triggers)
- **Confirm Before Archive** — toggle the confirmation dialog when archiving
- **Database Path** — custom path to the Wispr Flow database for non-standard installs

## How It Works

Wispr Flow stores your transcription history in a local SQLite database on your Mac. This extension reads that database locally — it makes no network requests. The only modification it can make is archiving transcripts, which mirrors Wispr Flow's own archive feature.
