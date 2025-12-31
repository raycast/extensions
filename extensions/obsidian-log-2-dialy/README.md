# Obsidian: log 2 daily

[中文](README.zh.md)

Append quick snippets into your Obsidian daily note from Raycast.

## Features

- Reads `.obsidian/daily-notes.json` (also tolerates `.obsiidan/daily-notes.json`) to locate the daily note using `folder` and `format`.
- Supports date formats like `YYYY-MM-DD` or `YYYY/MM/DD`; tokens `YYYY/YY/MM/M/DD/D` are supported and `/` creates nested folders.
- Two record modes: `Callout` (quoted block with time) or `Plain text` (`**HH:MM**` followed by your input).
- Inserts under a configurable heading (default `## Temp Notes`); will trigger Obsidian to create the note if it’s missing.

## Setup

1. Install deps: `pnpm install`
2. Run in dev mode with hot reload: `pnpm dev` (keeps the command available under Raycast’s “Development” group)
3. In Raycast command preferences, set:
   - `Obsidian Vault Path` (vault root)
   - `Target Heading` (optional, default `## Temp Notes`)
   - `Record Mode` (`Callout` or `Plain text`)

## Usage

1. Keep `pnpm dev` running.
2. Open the command in Raycast, type your snippet, press `Cmd+Enter` to submit.
3. Optional: set a keyboard shortcut in Raycast (Settings → Extensions → your command → Set Hotkey) for instant capture.

## Notes

- If the daily note does not exist, the command opens Obsidian via URI to create it.
- Multi-line input is preserved. Callout mode prepends `> ` to each line; plain mode inserts as-is.
