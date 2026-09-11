# Qobuz

Search Qobuz, see what's playing, and manage your favourites and playlists — open anything straight in the Qobuz app.

## Commands

### Browse & search

| Command        | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| **Search**     | Search for albums, artists, and tracks; open them in Qobuz or copy the link. |
| **Favourites** | Browse your favourite albums, artists, and tracks.                           |
| **Playlists**  | Browse your Qobuz playlists.                                                 |

### Now Playing

| Command         | Description                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Now Playing** | Menu-bar item showing the track currently playing in the Qobuz desktop app, with one-click copy of its link. Refreshes every minute. |

### Playback controls

| Command            | Description                                 |
| ------------------ | ------------------------------------------- |
| **Play / Pause**   | Toggle play/pause in the Qobuz desktop app. |
| **Next Track**     | Skip to the next track.                     |
| **Previous Track** | Skip to the previous track.                 |
| **Fast-Forward**   | Fast-forward within the current track.      |
| **Rewind**         | Rewind within the current track.            |

## Setup

Qobuz has no public OAuth flow, so the extension authenticates with your personal user auth token. You only need to provide it once.

1. Open [play.qobuz.com](https://play.qobuz.com) and sign in.
2. Open your browser's DevTools and switch to the **Network** tab.
3. Click any request going to `www.qobuz.com/api.json`.
4. Find the **`X-User-Auth-Token`** request header and copy its value.
5. Paste it into the extension's **Qobuz Token** preference in Raycast.

**Using the `@kud/qobuz` CLI?** If you have already run `qobuz login`, the token is stored in your macOS Keychain. Leave the **Qobuz Token** preference empty and the extension will read it from there automatically — no manual copy-paste needed.

## Now Playing

The **Now Playing** command reads the Qobuz desktop app's local player state to determine the current track. macOS does not expose Qobuz to the system Now Playing widget, so this command fills that gap. The Qobuz desktop app must be running for it to show anything.

## Playback controls

The playback control commands (Play / Pause, Next, Previous, Fast-Forward, Rewind) send macOS media keys to the system. They require **Accessibility permission** — Raycast will prompt you to grant this the first time you use one of these commands.

## Credits

Built on the open-source [`@kud/qobuz`](https://www.npmjs.com/package/@kud/qobuz) core library.

This is an independent, unofficial extension — not affiliated with, endorsed by, or sponsored by Qobuz. "Qobuz", the Qobuz logo, and the extension icon derived from it are trademarks of Qobuz Music, used here only to indicate compatibility.
