# cliamp for Raycast

Control and manage [cliamp](https://www.cliamp.stream/) — the terminal music player — from Raycast. Talks directly to cliamp's V2 IPC socket (`~/.config/cliamp/cliamp.sock`, newline-delimited JSON).

## Commands

| Command | What it does |
| --- | --- |
| **Now Playing** | Control center: track info, play/pause/next/prev/stop, seek, volume, shuffle, repeat, mono, speed, EQ presets |
| **Search Music** | Search any configured provider (radio, local, podcasts, Spotify, Tidal, …) and play or queue results. Empty search box shows your Favorites + the browsable station catalog. ⌘D bookmarks a station, ⌘F / ⌘⇧F filter by min bitrate / codec |
| **Live Playlist** | View/manage the live playlist: play, queue next, reorder, remove, clear |
| **Browse Playlists** | Browse provider playlists, load them, or drill into tracks |
| **Now Playing in Menu Bar** | Current track + controls in the macOS menu bar (refreshes every 30 s) |
| **Play Station** | Play a station by name (favorites first, then the 58k-station directory). Use ⌘⇧L on any station in Search to turn it into a Quicklink — a root-level Raycast item you can alias or hotkey |
| **Play/Pause, Next, Previous, Stop, Raise/Lower Volume** | Instant no-view commands — bind hotkeys to these |
| **Start/Quit Cliamp Daemon** | Manage the headless daemon |

## Notes

- Commands auto-start `cliamp --daemon` if it's not running (toggle in preferences).
- The daemon is headless: full playback/queue/provider API, no TUI visualizer or Lua plugins. If you run the TUI (`cliamp`) instead, the same socket serves everything including themes/visualizers.
- Configure streaming providers with `cliamp setup` (writes `~/.config/cliamp/config.toml`).
- Volume is in dB (−30 to +6), matching cliamp.

## Development

```sh
npm install
npm run dev    # live-reload in Raycast
npm run build  # validate production build
```
