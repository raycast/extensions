# Aria2

Control [aria2c](https://aria2.github.io/) torrents from Raycast: add magnet links or `.torrent` files, and manage downloads that are in progress, seeding, or finished.

aria2 **does seed** after a torrent finishes. The default share ratio is `1.0` (upload as much as you downloaded), then the torrent moves to Completed. Set **Seed Ratio** to `0` in extension preferences to seed indefinitely.

## Requirements

- [aria2](https://aria2.github.io/) (`brew install aria2`)
- JSON-RPC enabled on aria2c (this extension can start a local daemon for you)

## Preferences

| Preference | Default | Notes |
| --- | --- | --- |
| RPC Host / Port | `127.0.0.1` / `6800` | Must match `--rpc-listen-port` |
| RPC Secret | empty | Must match `--rpc-secret` if you set one |
| Default Download Folder | `~/Downloads` | Used for new torrents and the magnet handler |
| aria2c Path | auto-detect | Set if aria2c is not in Homebrew’s usual locations |
| Start aria2c if it is not running | on | Starts a local RPC daemon on first use |
| Seed Ratio | `1.0` | Applied when this extension starts aria2c |

If you already run aria2 yourself, start it with RPC:

```bash
aria2c --enable-rpc --rpc-listen-port=6800 --dir="$HOME/Downloads" --enable-dht=true --bt-save-metadata=true --save-session="$HOME/.aria2/session" --input-file="$HOME/.aria2/session"
```

Add `--rpc-secret=your-token` and put the same value in preferences if you want authentication.

## Magnet links

Raycast cannot register itself as a `magnet:` handler. **Set Magnet Handler** installs `~/Applications/Aria2 Magnet Handler.app` and sets it as the default app for magnet links (and `.torrent` files). Clicking a magnet in a browser then adds it to aria2 and saves to your default download folder.

If macOS still asks which app to use, pick **Aria2 Magnet Handler** and check “Always”.

You can also:

- Run **Add Torrent** and paste a magnet or pick a `.torrent` file
- Pass a magnet as the command argument from Root Search
- Add **Add Torrent** as a [fallback command](https://manual.raycast.com/fallback-commands) so pasting a magnet into Raycast downloads it

## Commands

- **Manage Torrents** — downloading, seeding, queued, paused, completed; pause/resume/remove; open in Finder
- **Add Torrent** — magnet, HTTP(S) torrent URL, or local `.torrent` file
- **Set Magnet Handler** — install, reinstall, or remove the system handler
