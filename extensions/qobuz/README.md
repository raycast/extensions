# Qobuz

Search Qobuz, see what's playing, and manage your favourites and playlists — and open anything straight in the Qobuz app.

## Commands

- **Search** — find albums, artists, and tracks; open them in Qobuz or copy the link.
- **Now Playing** — a menu-bar item showing the track currently playing in the Qobuz desktop app, with one-click copy of its link.
- **Favourites** — browse your favourite albums, artists, and tracks.
- **Playlists** — browse your Qobuz playlists.

## Setup

Qobuz has no public OAuth, so the extension authenticates with your personal **`user_auth_token`**. You only need to provide it once.

1. Open [play.qobuz.com](https://play.qobuz.com) and sign in.
2. Open your browser's DevTools → **Network**.
3. Click any request to `www.qobuz.com/api.json` and find the **`X-User-Auth-Token`** request header.
4. Copy its value into the extension's **Qobuz Token** preference.

That's it — the extension bootstraps the rest (the `app_id` is discovered automatically) and caches your session.

## Now Playing

The **Now Playing** command reads the Qobuz desktop app's local player state to determine the current track — macOS doesn't expose Qobuz to the system "Now Playing" widget, so this fills that gap.

## Credits

Built on the [`@kud/qobuz`](https://www.npmjs.com/package/@kud/qobuz) core library. Not affiliated with Qobuz.
