# Kaset Control

Control [Kaset](https://github.com/sozercan/kaset) — the YouTube Music client for
macOS — from Raycast.

Kaset is a separate app: this extension drives it over AppleScript, so Kaset has
to be installed and running.

## Requirements

- **Kaset 0.14.2 or newer.** The queue commands and the merged YouTube Music and
  YouTube search need 0.14.2 or later.
- macOS.

## Commands

| Command | What it does |
| --- | --- |
| **Now Playing** | The current track with live progress, the queue, and recently played. Full playback controls, queue actions, and rating. |
| **Play Song** | Search YouTube Music and YouTube together and play, queue, or play next. |
| **Toggle Play/Pause**, **Next Track**, **Previous Track** | Playback control, no window. |
| **Set Volume** | Pick a volume level. |
| **Toggle Shuffle**, **Cycle Repeat**, **Toggle Mute** | Playback modes. |
| **Like Track**, **Dislike Track** | Rate the current track. |
| **Show Menu Bar** | Keep the current track and artwork in the menu bar with controls. |
| **Record Player State** | Records history in the background. See below. |

## Preferences

- **Play Song Source** — whether Play Song searches YouTube Music, YouTube, or
  both (the default). You can also narrow this inside the search itself.
- **Menu Bar Style** / **Menu Bar Icon** / **Hide When Idle** — control the menu
  bar item.

## Recently Played

History is recorded without the menu bar. Open **Record Player State** once, or
turn on its background refresh in Raycast's extension settings, so it can keep
recording while the Now Playing window is closed.

A track is added to Recently Played only once it has stopped playing, so the
track you are listening to never appears in both Now Playing and Recently
Played.

## Notes

- **Seeking is display-only.** Kaset exposes no AppleScript command to seek, so
  the progress ring tracks playback but cannot scrub.
- **Album** is resolved by searching YouTube Music, because Kaset's player
  payload does not carry album names. This costs one search per track change.
- The menu bar item is optional and off unless you enable it.
