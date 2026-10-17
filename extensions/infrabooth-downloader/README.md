# InfraBooth Downloader

Search SoundCloud, download links and control the [InfraBooth Downloader](https://github.com/bretheskevin/infrabooth-downloader/releases) desktop player without leaving Raycast.

## Requirements

- The InfraBooth Downloader desktop app for macOS or Windows, installed and running. Download it from the [releases page](https://github.com/bretheskevin/infrabooth-downloader/releases).

## Setup

None. When both Raycast and InfraBooth Downloader are installed, the desktop app starts a private local connection that only this extension can use. Open the app, and the extension connects on its own.

## Commands

Shortcuts below use macOS keys. On Windows, use Ctrl in place of ⌘ and Alt in place of ⌥.

- **Search SoundCloud**: search tracks and playlists. Before you type, your liked tracks (Liked Tracks) or your library playlists (Playlists) are shown; press Enter on a playlist to browse its tracks. A third type, Mixed for you, lists your personal SoundCloud mixes (Your Mix 1–10). A fourth type, Search Online, searches all of SoundCloud and shows tracks, playlists and albums in separate sections; choose Show All to scroll through every result of one kind, or paste a SoundCloud track, playlist or album link to open it directly. Press ⌘T to cycle through the types. Add to the queue, play now, download tracks, or open them on SoundCloud.
- **Now Playing**: browse the Up Next queue on the left, with the current track's artwork and live progress on the right. Play or pause (↵), play any queued track (↵), skip (⌘→ / ⌘←), toggle shuffle (⌘S), change the volume (⌥⌘↑ / ⌥⌘↓), mute (⌘M), and download the selected track (⌘D).
- **Download SoundCloud Link**: paste a SoundCloud track, playlist or album link (it is pre-filled when the clipboard already holds one). The form previews the link's title, artist or owner, and duration or track count, and shows the destination folder: the app's download folder by default, or pick another one for this download only. Press ⌘↵ to start the download in InfraBooth Downloader. Playlists go through the app's download queue, so only one runs at a time.
