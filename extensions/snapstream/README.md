# SnapStream

Live TV in Picture-in-Picture, right from Raycast. Breaking news, live sports, or any channel — floating over your workspace in three keystrokes.

## Commands

### Search Channels

Browse and search your channel list. Channels are grouped by category (News, Sports, Entertainment, etc.). Hit Enter to open a stream in QuickTime Player — it automatically enters Picture-in-Picture so the video floats over your work.

- **Favorites** — press Cmd+F to pin channels to the top
- **Frecency** — channels you watch most often rise in the list
- **Search** — type any channel name or category to filter

### Import Channels

Import channels from an `.m3u` or `.m3u8` playlist file. Pick a file, preview the channels, toggle individual ones on or off, then import.

## Setup

SnapStream comes with a bundled set of channels. To add your own:

1. Use the **Import Channels** command to import from an M3U playlist file
2. Or set a **Remote M3U Playlist URL** in the extension preferences to pull channels from an online source

### Where to find M3U playlists

- [iptv-org/iptv](https://github.com/iptv-org/iptv) — 8,000+ channels organized by country and category
- [Free-TV/IPTV](https://github.com/Free-TV/IPTV) — curated free legal streams

## Preferences

| Preference | Description | Default |
|------------|-------------|---------|
| Remote M3U Playlist URL | URL to a remote M3U playlist for additional channels | `https://tvpass.org/playlist/m3u` |
| Auto Picture-in-Picture | Automatically enter PiP mode after opening a stream | On |
| PiP Delay | Seconds to wait before triggering PiP | 3 |

## Requirements

- macOS (uses QuickTime Player and AppleScript for Picture-in-Picture)
- Accessibility permissions may be needed for auto-PiP
