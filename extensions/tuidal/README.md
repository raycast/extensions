# Tuidal for Raycast

Control [Tuidal](https://github.com/Sassech/tuidal) — a lossless Tidal music player for the terminal — directly from Raycast. Search tracks, manage your library, control playback, and keep an eye on what's playing from your menu bar, all without touching the terminal.

## Setup

Tuidal must be running in a terminal for this extension to work. The extension talks to a local HTTP server that Tuidal exposes on port `7837`.

### 1. Install Tuidal

```bash
git clone https://github.com/Sassech/tuidal
cd tuidal
cargo build --release
```

### 2. Run it

```bash
./target/release/tuidal
```

### 3. Log in to Tidal

Press `L` inside the app to authenticate with your Tidal account.

Once Tuidal is running and logged in, every Raycast command is available.

---

## Commands

### Now Playing

See the current track, artist, album, progress bar, and audio quality (HiRes / Lossless / AAC). Actions: play/pause, next, previous, toggle shuffle, cycle repeat.

### Menu Bar Player

Always-on track info in your menu bar. Shows artist and title while playing, with a dropdown for full playback controls. Refreshes every 10 seconds.

### Search Tidal

Live search across the entire Tidal catalogue. Press `Enter` on any result to start playing immediately.

### Your Library

Browse your saved playlists, Tidal Mixes, favourite tracks, and favourite albums. Drill into any collection to see its tracks and play from there.

### Queue

See every track lined up to play, with the current track highlighted. Jump to any position by selecting it.

### Just Play

The fastest way to play something. Type a song, artist, or album name and press `Enter` — Tuidal finds the best match and starts playing instantly, no results list needed.

### Toggle Play / Pause · Next · Previous

No-window commands you can bind to keyboard shortcuts for instant control from anywhere on your Mac.

### Toggle Shuffle

Switches shuffle on or off and shows a HUD confirming the new state.

### Cycle Repeat

Cycles through repeat modes — **all → one → off** — with a HUD showing the new mode.

---

## Audio Quality

Tuidal streams directly from Tidal at your chosen quality:

| Mode     | Format                  |
| -------- | ----------------------- |
| HiRes    | FLAC 24bit / 96kHz      |
| Lossless | FLAC 16bit / 44.1kHz    |
| High     | AAC 320kbps             |

Quality is set inside the Tuidal app (`1`, `2`, `3` keys) and reflected in the Now Playing metadata panel.
