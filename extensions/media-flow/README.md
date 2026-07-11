<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="MediaFlow icon">
</p>

# MediaFlow

[![Test](https://github.com/egor-xyz/raycast-media-flow/actions/workflows/test.yml/badge.svg)](https://github.com/egor-xyz/raycast-media-flow/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A universal, open-source now-playing monitor and audio device switcher for macOS,
living in the Raycast menu bar.

> **Screenshot:** TBD — menu bar and details view screenshots will be added once the
> extension is submitted to the Raycast Store.

## Features

- **Now Playing menu bar** — artwork, title/artist, live progress, play/pause/skip,
  and quick device/volume switching without leaving the menu bar.
- **Device switching** — list and switch audio input/output devices, wireless badge,
  per-device volume where the hardware supports it.
- **Media details view** — a rich `List.Item.Detail` view with large artwork, full
  metadata, and every active source at once (not just whichever app the menu bar
  happened to pick).
- **AI tools** — `Get Now Playing` and `Control Playback`, usable from Raycast AI /
  Quick AI once the extension is installed.

## Commands

| Command | Mode | Description |
| --- | --- | --- |
| Now Playing | Menu bar (background refresh, ~1 min effective) | Current media in the menu bar |
| Media Details | View | Rich view of all active media sources |
| Audio Devices | View | List and switch audio input/output devices |
| Next Track | No-view | Skip to the next track on the active media source |
| Previous Track | No-view | Go back to the previous track on the active media source |
| Play/Pause | No-view | Toggle play/pause on the active media source |

## Install

Raycast Store listing: TBD.

For local development:

```bash
npm install
npm run dev
```

`npm run dev` runs `ray develop` and hot-reloads the extension in Raycast.

### Optional dependency: `media-control`

```bash
brew install media-control
```

MediaFlow's primary detection engine shells out to the `media-control` CLI
([ungive/mediaremote-adapter](https://github.com/ungive/mediaremote-adapter)), which
covers *any* app registered with the macOS Now Playing service — Music, Spotify,
TIDAL, Deezer, Amazon Music, VLC, browsers, and most podcast apps — in one shot,
including artwork.

It is **optional but strongly recommended**. Without it, MediaFlow degrades
gracefully to AppleScript-only coverage (Music.app and Spotify, plus a Safari/Chrome
tab-title fallback) and shows an install hint in the menu. Direct use of Apple's
`MediaRemote` API has been entitlement-gated since macOS 15.4, which is why
`media-control` — not a bundled/private API call — is the supported path. See
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full detection-engine
writeup.

## Usage

### Menu bar

The menu bar icon shows the current track's artwork (falling back to a music-note
icon when nothing is playing or no artwork is available). With the default "Icon
and Title" style, the title text next to it shows `Title – Artist`, truncated to
`maxTitleLength` characters (30 by default); switch to "Icon Only" to hide the
title. The footer's "Hide/Show Title in Menu Bar" item lets you toggle the title
on and off for the current session without leaving the menu, but the permanent
setting is the Menu Bar Style preference, one click away via the "Open Extension
Preferences" item just below it.

Click the icon to open the menu:

- **Now Playing** — one item per active source (playing sources and the pinned
  source listed first). Clicking a track opens its app.
  - Play/Pause
  - Next Track — hold ⌥ (Option) to reveal Previous Track in its place
  - A "More" submenu with Copy "Title — Artist", Copy URL (when the source has
    one), and Pin/Unpin
- **Audio**
  - An Output submenu to switch the default output device
  - A Volume submenu with Mute, 25/50/75/100% presets, and Louder (⌘↑) /
    Quieter (⌘↓) items that step the system volume by 10%
- **Details…** — opens Media Details, plus an "Updated <time>" item that
  doubles as a manual refresh

### Instant control

Next Track, Previous Track, and Play/Pause are `no-view` commands, so each can
be run straight from Raycast's root search — type the command name and hit
Enter — without opening the menu bar dropdown. Since these are meant for
repeated use, assign each one a hotkey: **Raycast → Extensions → MediaFlow →**
(select the command) **→ Hotkey**. Each command shows a HUD confirming the
action and then best-effort refreshes the Now Playing menu bar, so its icon and
menu reflect the change immediately instead of waiting out the next poll.

### Refresh behavior

While the menu bar item is idle (menu closed), it follows changes made outside
Raycast — switching tracks in Spotify, for example — via Raycast's background
refresh. In practice Raycast schedules these runs about **once per minute**
(measured), regardless of the manifest's shorter interval, so an app-side track
change can take up to ~1 minute to appear. Controls that go through MediaFlow
(menu items, the Next/Previous/Play-Pause commands) refresh the menu bar
immediately. While the menu is open, a 10s timer re-polls and live-updates
position/progress; it stops the moment the menu closes.

### AI

Ask "What's playing?" in Raycast AI chat / Quick AI to read the current
track(s) via the `Get Now Playing` tool, or ask it to play, pause, or skip via
the `Control Playback` tool.

### Preferences

Set these under **Raycast → Extensions → MediaFlow → Preferences**:

- **Menu Bar Style** (`menuBarStyle`) — show icon with track title, or icon
  only (default: Icon and Title)
- **Visibility** (`showWhenStopped`) — keep the menu bar icon visible when
  nothing is playing (default: on)
- **Max Title Length** (`maxTitleLength`) — truncate the menu bar title after
  this many characters (default: 30)

## Supported apps

| App | Detection | Control | Artwork |
| --- | --- | --- | --- |
| Music.app | `media-control` + AppleScript | Yes (AppleScript) | Via `media-control` |
| Spotify | `media-control` + AppleScript | Yes (AppleScript) | Via `media-control` |
| VLC | `media-control` only — AppleScript offers transport-only control, but no VLC provider is implemented | Via `media-control` | Via `media-control` |
| TIDAL | `media-control` only — no AppleScript dictionary | Via `media-control` | Via `media-control` |
| Deezer | `media-control` only — no AppleScript dictionary | Via `media-control` | Via `media-control` |
| Amazon Music | `media-control` only — no AppleScript dictionary | Via `media-control` | Via `media-control` |
| Firefox | `media-control` only — no AppleScript support | Via `media-control` | Via `media-control` |
| Podcast apps (generic) | `media-control` only | Via `media-control` | Via `media-control` |
| Safari | `media-control` where the tab registers Now Playing, plus a tab-title fallback provider (YouTube-title heuristic) | No | No (tab-title fallback has no artwork) |
| Chrome | `media-control` where the tab registers Now Playing, plus a tab-title fallback provider (YouTube-title heuristic) | No | No (tab-title fallback has no artwork) |

Coverage without `media-control` installed shrinks to the two AppleScript-covered
rows above (Music, Spotify) plus the Safari/Chrome tab-title fallback — every other
row in this table depends on `media-control` being installed.

## Contributing

See [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md). Adding support for a new app?
Start with [`docs/ADDING_NEW_SOURCE.md`](./docs/ADDING_NEW_SOURCE.md).

## License

MIT — see [`LICENSE`](./LICENSE).
