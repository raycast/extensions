<p align="center">
   <img src="https://user-images.githubusercontent.com/372831/227213056-29a98faf-f897-4cd0-9c39-ca8f218a4190.png">
 </p>

Spotify's most common features, now at your fingertips. Search for music and podcasts, browse your library, and control the playback. Glance at what's currently playing directly from the menu bar.

## Commands

### Search

A single unified search command. Use this to search for artists, albums, songs, playlists, podcasts, and episodes. Use the dropdown menu to filter your search to a specific category. Each category offers contextual actions, so you can dive deeper into the search.

### Your Library

Use this to see your saved artists, albums, songs, playlists, and podcasts. Similar to the "Search" command, it includes a category dropdown and contextual actions.

### Now Playing

See what's currently playing. Use the actions (⌘ K) for further actions, such as Play/Pause, Like/Dislike, Skip, Start Radio, Add to Playlist, Connect Device and more.

### Menu Bar Player

See what's currently playing in your Menu Bar. Click for further actions, such as Play/Pause, Like/Dislike, Skip, Start Radio, Add to Playlist, Connect Device and more. Refreshes every 10 seconds.

### Quick Actions

This is a list of lots of Spotify actions. For example: Play/Pause, Like/Dislike current song, Change Volume, and more. If you'd like to have any of these available as a Root Command, you can create Quicklinks via the actions menu (⌘ K).

---

In order to use this extension, you'll need to authenticate with Spotify. This extension requires the following permissions [scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes):

- `playlist-modify-private`: To update your playlist, including private ones.
- `playlist-modify-public`: To update your playlist.
- `playlist-read-collaborative`: To fetch your playlists, including collaborative ones.
- `playlist-read-private`: To fetch your playlists, including private ones.
- `user-follow-read`: To fetch your followed artists.
- `user-library-modify`: To update your liked songs/episodes.
- `user-library-read`: To fetch your liked songs, artists, albums, podcasts, and episodes.
- `user-modify-playback-state`: To control playback state, such as play/pause, skip, change volume, transfer playback, and more.
- `user-read-currently-playing`: To fetch what's currently playing.
- `user-read-playback-state`: To fetch playback state, such as volume, shuffle, repeat, and more.
- `user-read-private`: To fetch your country code, so we can display songs available in your location only.
- `user-top-read`: To fetch your top artists and tracks.

---

To do

- [ ] Paginate views (artists, songs, albums, playlists, podcasts, episodes, etc.)
- [ ] Prioritise AppleScript (when possible) if Spotify is running
