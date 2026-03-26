# Plexamp Raycast Extension

Raycast extension for browsing Plex music libraries and controlling a Plexamp player.

## Commands

- `Browse Library`: browse the selected Plex music library, artists, albums, playlists, and queue tracks or entire albums in Plexamp
- `Search Library`: quickly search artists, albums, and tracks and play/queue them in Plexamp
- `Recently Played`: browse the most recently played tracks from the selected Plex music library
- `Now Playing`: see what's playing, control the transport and adjust the queue
- `Now Playing Menubar`: show the current album art and a customizable now playing label in the macOS menu bar
- `Plexamp Status`: inspect the connected Plexamp client and selected Plex music library

## Setup

1. Open any command and sign in with your Plex account from the in-command setup flow.
2. Choose the Plex Media Server you want to use.
3. Choose the Plex music library you want to browse. If your server only has one music library, it is selected automatically.
4. Optionally set `Plexamp URL Override` if your Plexamp or Plexamp Headless instance is not available at `http://127.0.0.1:32500`.
5. Optionally customize `Menubar Format` with `{track}`, `{album}`, and `{artist}` tokens for the `Now Playing Menubar` command.

## Features

- Sign in with Plex from Raycast using a managed Plex auth flow.
- Browse artists, grouped artist releases, library-scoped playlists, and album track lists from the selected Plex music library.
- Toggle between list and grid view for artist albums (`Cmd+Shift+V`), with albums grouped by release type (Albums, EPs, Singles, Compilations, etc.) and sorted by release year in grid view. Grid column count is configurable in extension preferences.
- Search the library the way Plex does, with grouped results for artists, albums, and songs.
- Play immediately in Plexamp, add to queue, or insert as play next from browse and search results.
- Inspect the active Plexamp queue and use transport controls from Raycast in `Now Playing`.
- Jump to tracks, reorder the queue, and remove queue items from `Now Playing`.
- Show the active album art and a customizable now playing string in the menu bar, refreshed every 10 seconds.
- Switch the selected music library or sign out from Plex from `Plexamp Status`.
- Show configurable track ratings in Raycast using `5 Stars`, `5 Stars (Half Stars)`, or `1 Star`.
