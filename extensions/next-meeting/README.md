<p align="center">
  <img src="assets/extension-icon.png" width="100" />
</p>

# Next Meeting

A [Raycast](https://raycast.com) extension that shows all your upcoming calendar meetings and how long until each one starts.

<p align="center">
  <img width="600" alt="Next Meeting extension showing upcoming calendar events in Raycast" src="metadata/next-meeting-1.png" />
</p>

## Features

- Reads events directly from macOS EventKit (no calendar permissions prompt)
- Shows today's meetings, with fallback to tomorrow if the day is clear
- Instant display via cache, with background refresh
- Color-coded time indicator: red (≤ 20m), orange (≤ 40m), yellow (≤ 1h), green (> 1h)
- "now" and "in progress" labels for imminent and ongoing meetings
- Detects video call links (Google Meet, Zoom, Microsoft Teams) for one-click join

## Commands

| Command | Description |
|---------|-------------|
| **Next Meeting** | Show all upcoming calendar events with time, location, and video links |
| **Refresh Calendar Cache** | Background task that keeps the command subtitle up to date (runs every 10 minutes) |

## Install

```bash
npm install
npm run dev
```
