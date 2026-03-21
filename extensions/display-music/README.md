# Apple Music Artwork — Raycast Menu Bar Extension

Shows your currently playing Apple Music track's **album artwork** directly in the macOS menu bar, replacing the generic music icon with the actual cover art.

## Features

- **Album artwork as menu bar icon** — circular artwork thumbnail updates with each track
- **Track info** — song name, artist, album, and playback position
- **Playback controls** — play/pause, next, previous directly from the menu bar dropdown
- **Reveal in Music** — jump to the track in Apple Music
- **Configurable display** — optionally show track title and/or artist name next to the artwork
- **Background refresh** — updates every 10 seconds automatically

## Setup

### Prerequisites

- macOS with Apple Music installed
- [Raycast](https://raycast.com) installed
- Node.js 18+ installed

### Install & Run

```bash
# Clone or copy this extension folder
cd apple-music-artwork-menubar

# Install dependencies
npm install

# Start development server
npm run dev
```

Raycast will pick up the extension. Search for "Now Playing" in Raycast to activate the menu bar command.

### First Run

When you first run the command, macOS will ask you to grant Raycast permission to control Apple Music via System Events. Accept the prompt — this is needed for the AppleScript calls that read track info and artwork.

## Configuration

Open Raycast preferences for this extension to configure:

| Preference | Default | Description |
|---|---|---|
| Show Track Title | ✅ On | Display the song name next to the artwork icon |
| Show Artist Name | ❌ Off | Display the artist name next to the artwork icon |

## How It Works

The extension uses AppleScript to communicate with Apple Music:

1. Checks if Music.app is running and playing
2. Extracts the raw artwork data from the current track
3. Writes it to a temp file (`~/.cache/raycast-apple-music-artwork.jpg`)
4. Uses that file as the `MenuBarExtra` icon with a rounded rectangle mask
5. Refreshes every 10 seconds via Raycast's background refresh

## Keyboard Shortcuts (when menu is open)

| Shortcut | Action |
|---|---|
| Space | Play / Pause |
| ← | Previous Track |
| → | Next Track |
| ⌘R | Reveal in Music |
