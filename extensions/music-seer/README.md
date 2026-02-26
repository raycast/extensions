# 🔮 Music Seer

Forked from the Raycast **Genius Lyrics** extension: [raycast/extensions/tree/main/extensions/genius-lyrics](https://github.com/raycast/extensions/tree/main/extensions/genius-lyrics).

## ℹ️ What is Music Seer?

Music Seer is your music companion for Spotify, Apple Music, Plexamp, and other macOS media players.
It helps you learn more about your favorite music with lyrics, artist bios, album information, and song meaning interpretation.

## ▶️ Supported Players

Confirmed support:
- Spotify
- Apple Music
- Plexamp

Other macOS media players should also work in many cases. If something does not work with your player, please let me know.

## 🎤 Lyric Search Current Track

Automatically detect the song currently playing on macOS and open matching Genius lyrics without typing a query.

## 🎶 Now Playing Menu Bar Item

Show the current track and artist directly in the Raycast menu bar, with quick actions to open lyrics and track, artist, or album info.
You can also customize the menu bar title using template variables: `{track}`, `{artist}`, and `{album}`.

## 🤖 AI Lyric Interpretation

Generate an AI interpretation for the lyrics you are viewing, grounded in the song text and formatted for quick reading.

## 🛠️ Interpretation Prompt Management

Create, edit, and select interpretation prompts to control how AI analysis is generated for each song.

Music Seer also supports manual song-title search, search by remembered lyric lines, and opening source pages on Genius.com.

## Install `media-control` (macOS)

Music Seer needs `media-control` to detect the currently playing (or recently paused) track.

If you already have Homebrew installed, run:

```bash
brew install media-control
```

If you do **not** have Homebrew yet:

1. Install Homebrew from [brew.sh](https://brew.sh/).
2. Open Terminal and run:

```bash
brew install media-control
```

Verify everything is working:

```bash
media-control get
```

If the command returns now-playing JSON, setup is complete.

No Homebrew / advanced option:
- Build from source: [ungive/media-control](https://github.com/ungive/media-control)
