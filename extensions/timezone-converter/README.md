# Timezone Converter

A Raycast extension to convert times between timezones instantly. Type a time and timezone to see it converted to your local time and favorites.

## Features

- Convert any time between timezones with natural input (`7:22 CET`, `3:30pm PST to EST`)
- Supports IANA identifiers (`Europe/Berlin`), abbreviations (`CET`, `PST`), and city names (`Tokyo`, `New York`)
- Handles ambiguous abbreviations (e.g., `IST` shows India, Ireland, and Israel)
- Shows your local timezone automatically
- Configure favorite timezones for quick reference
- Copy individual or all conversions to clipboard
- Displays UTC offsets and day boundary indicators (+1 day / -1 day)
- Respects your system's 12h/24h time format

## Install

```bash
pnpm install
pnpm dev
```

## Usage

Open Raycast and run **Convert Time**, then provide a query:

| Query | What it does |
|---|---|
| `7:22 CET` | Converts 7:22 CET to your local time + favorites |
| `3:30pm PST to EST` | Converts 3:30 PM PST specifically to EST |
| `14:00 Tokyo` | Converts 14:00 Tokyo time |
| `9:00 IST` | Shows all IST interpretations (India, Ireland, Israel) |

## Preferences

| Setting | Description |
|---|---|
| **Favorite Timezones** | Comma-separated list of timezones to always show (e.g., `America/New_York, CET, Tokyo`) |
