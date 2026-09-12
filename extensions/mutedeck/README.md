# MuteDeck for Raycast

Control your meetings straight from Raycast with [MuteDeck](https://mutedeck.com): toggle your microphone, camera, screen share and recording, leave meetings, and see your live call status in a Stream Deck-style Meeting Deck.

This extension is maintained by the MuteDeck team, building on the original extension by Chad Walters.

## Features

- **Meeting Deck** — a live grid of Stream Deck-style tiles. Tiles recolor with your real status (red = muted/recording, green = camera/share on, dimmed = unavailable) and refresh every second while open. Press ↵ on a tile to toggle it.
- **Toggle Microphone / Camera / Screen Share / Recording** — instant commands made for global hotkeys. Each one confirms the *resulting* state in a HUD (e.g. "🔇 Muted").
- **Leave Meeting** — leaves the current meeting, with optional confirmation.
- **Bring to Front** — jump to your call window from the Meeting Deck.
- **Presenting protection** — optional confirmation before toggling your mic or camera while sharing or recording.

Works with Zoom, Microsoft Teams, Google Meet, Webex and system-level microphone control — anywhere MuteDeck works. The microphone toggle also works outside meetings (system mute).

## Prerequisites

- [MuteDeck](https://mutedeck.com) installed and running (free download)
- No meeting required for microphone control; other controls activate when you join a call

## Configuration

Everything works out of the box. In Raycast Settings → Extensions → MuteDeck you can optionally:

- Change the **API Endpoint** if you've reconfigured MuteDeck's ports (default: `http://localhost:3491`)
- Turn confirmation dialogs on/off: **Confirm Leave Meeting**, **Confirm Mute/Video While Presenting**

For hands-free control, assign global hotkeys to the toggle commands in Raycast Settings.

## How it works

The extension talks to MuteDeck's local HTTP API (`http://localhost:3491`). Everything stays on your machine: no external API calls, no data collection, no tracking.

## Support

- [MuteDeck Help Center](https://mutedeck.com/help/) — MuteDeck questions
- [Report extension issues](https://github.com/raycast/extensions/issues) — extension problems
