<div align="center">
  <img src="https://raw.githubusercontent.com/deathrashed/gupload/main/Uploads/Images/graf-banner-swinsian.png" width="" alt="Swinsian Player logo">

# Swinsian Player

_The ultimate Swinsian controller for Raycast_

[![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-orange?style=flat-square)](https://www.raycast.com/deathrashed/swinsian-player)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

[Features](#features) • [Installation](#installation) • [Usage](#usage)

</div>

---

**Swinsian Player** is a powerful Raycast extension that gives you complete control over [Swinsian](https://swinsian.com/), the advanced music player for macOS. Whether you want to skip tracks, rate your favorite songs, or search your entire library, you can do it all without ever leaving Raycast.

## Features

- 🎵 **Now Playing** - Beautiful view of current track metadata and artwork
- 📍 **Menu Bar Extra** - Compact status in your menu bar with customizable sections
- 🔍 **Global Search** - Instant search across your entire library (Title, Artist, Album)
- 🗂️ **Library Browser** - Browse by artist, album artist, album, genre, year, or track search
- 📂 **Playlists** - Browse and play your custom and smart playlists
- ➕ **Add to Playlist** - Pick a normal playlist and add the current track
- ⭐ **Deep Integration** - Set ratings, love/ban on Last.fm, and manage output devices
- 🛠️ **Library Tools** - Rescan tags, reset play counts, and reveal files in Finder
- 🔊 **Advanced Control** - Precise volume adjustment, shuffle/repeat modes, and seek controls

## Installation

1. Make sure you have [Swinsian](https://swinsian.com/) installed and running.
2. Open **Raycast** and search for **Swinsian Player**.
3. Click **Install Extension**.

> [!NOTE]
> This extension requires Swinsian to be running to fetch metadata and perform actions.

## Usage

### Main Commands

| Command                                            | Description                                                                      |
| :------------------------------------------------- | :------------------------------------------------------------------------------- |
| **Now Playing**                                    | View current track details and access the full player interface.                 |
| **Menu Bar Player**                                | Add a compact controller to your macOS menu bar.                                 |
| **Quick Search**                                   | Find any track in your library and play it immediately.                          |
| **Browse Library**                                 | Browse the library by artist, album artist, album, genre, year, or track search. |
| **Browse Playlists**                               | List all your Swinsian playlists and start playback.                             |
| **Add Track to Playlist**                          | Choose a normal playlist and add the current Swinsian track.                     |
| **Play/Pause**, **Next Track**, **Previous Track** | Run the most useful playback actions directly from Raycast.                      |

Detailed copying, discovery, window, rating, Last.fm, and playback-mode actions are consolidated inside Now Playing and Menu Bar Player instead of appearing as separate top-level Raycast commands.

### Quick Actions

- **Playback**: Play/Pause, Next, Previous, Stop, seek, and reshuffle.
- **Volume**: Turn Volume Up/Down by 10%.
- **Modes**: Configure Shuffle, Repeat, and Stop After Track.
- **Rating**: Set star ratings (0–5) for the current track.
- **Last.fm**: Love or Ban the current track on Last.fm.
- **Output Devices**: Switch Swinsian's active audio output.
- **Finder**: Copy file path or reveal the current track in Finder.
- **Tools**: Open Last.fm account actions and create or save a file metadata report with the bundled parser.
- **Discovery**: Open context-aware databases, streaming services, lyrics, artwork, social, and utility actions for the first selected Swinsian track.

### Discovery

Discovery is a direct submenu under `Actions`. It contains Artist, Album, Track,
Lyrics, Covers, Social, and Utilities. Last.fm,
TheAudioDB and COV remain ordinary Discovery links and do not require local tools or API credentials.
Services are only shown where they work: lyrics providers use the selected track,
and cover providers use the selected artist or album.

Track searches deliberately use `track + artist`, never the album name. Album
searches use `album + artist`, and artist searches use only the artist. This
keeps services such as Genius, Musixmatch, Spotify, and MusicBrainz focused on
the correct entity.

Discovery, Last.fm, and custom-service preferences are extension-wide, so
the Menu Bar Player and the Swinsian Player popup use the same configuration and
the same context-aware action registry. `Tools → Reports` can copy the bundled
file metadata report or save it after a native destination picker.

Extension preferences support:

- Hidden category IDs: `databases`, `streaming`, `lyrics`, `covers`, `social`,
  `utilities`, `lastfm`
- Hidden service IDs, including `google`, `aoty`, `audiodb`, `metallum`, `rym`,
  `discogs`, `musicbrainz`, `spotify`, `youtube`, `bandcamp`, `genius`, `cov`,
  `google-images`, `reddit`, `lucida`, `internet-archive`, and `whosampled`
- A Last.fm username for account-specific statistics and collage services
- Custom services as JSON:

```json
[
  {
    "id": "my-service",
    "title": "My Service",
    "url": "https://example.com/search?q={query}",
    "icon": "my-icon.png"
  }
]
```

Custom URLs may contain `{artist}`, `{album}`, `{track}`, `{query}`, and
`{type}`. Custom icons are resolved from the extension's assets directory.
TheAudioDB in `Tools` also provides native Copy JSON and Save Markdown actions.

> [!TIP]
> You can customize the Menu Bar Player visibility in the extension preferences. Playback, Library, Options, Last.fm, and Action submenus can be shown or hidden independently.

---

<div align="center">
  Made by deathrashed
</div>
