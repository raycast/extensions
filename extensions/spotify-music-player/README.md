# Spotify Player for Raycast (Windows)

Spotify's most common features, now at your fingertips. Search for music, browse your library, and control playback. Glance at what's currently playing and use quick actions—all from Raycast on Windows.

## Commands

### Search

A single unified search command. Use this to search for artists, albums, songs, and playlists. Use the dropdown menu to filter your search to a specific category. Each category offers contextual actions, so you can dive deeper into the search.

### Now Playing

See what's currently playing. Use the actions for Play/Pause, Next/Previous, Toggle Shuffle, Toggle Repeat, Start Radio, Refresh, and Open in Spotify. Auto-refreshes every 5 seconds.

### Quick Actions

Access quick playback controls: Play/Pause, Like/Dislike, Next, Previous, Copy Track URL, Toggle Shuffle, Toggle Repeat, Start Radio, and set/mute volume. All actions are available in one place for fast control.

## Authentication

To use this extension, you'll need to authenticate with Spotify. The first time you use any command, you'll be prompted to authorize access. Follow the instructions in your browser and accept the requested permissions.

## Required Permissions (Scopes)

- `playlist-modify-private`: Update your private playlists
- `playlist-modify-public`: Update your public playlists
- `playlist-read-collaborative`: Fetch collaborative playlists
- `playlist-read-private`: Fetch private playlists
- `user-follow-read`: Fetch followed artists
- `user-library-modify`: Update liked songs
- `user-library-read`: Fetch liked songs, artists, albums, playlists
- `user-modify-playback-state`: Control playback (play/pause, skip, volume)
- `user-read-currently-playing`: Fetch what's currently playing
- `user-read-playback-state`: Fetch playback state (volume, shuffle, repeat)
- `user-read-private`: Fetch your country code
- `user-top-read`: Fetch your top artists and tracks

## Preferences

- Show Album Art: Show or hide album artwork in Now Playing
- Volume Step: Set the amount to increase/decrease volume (5%, 10%, 15%, 20%)

## Troubleshooting

- **No active device**: Make sure Spotify is playing music on any device
- **Nothing is currently playing**: Start playback in Spotify first
- **Authentication errors**: Revoke access in your [Spotify settings](https://www.spotify.com/account/apps/) and re-authenticate
- **Extension doesn't appear in Raycast**: Make sure Raycast is updated and check logs for errors

## Credits

Based on the original [Spotify Player](https://github.com/raycast/extensions/tree/main/extensions/spotify-player) extension from the Raycast repository, adapted to work on Windows using the Spotify Web API.
