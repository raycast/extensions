# About The Downloader

The Downloader is a Raycast extension for saving media from the web — videos, audio, image galleries, and complete webpages — without leaving Raycast.

Paste a URL (or let it auto-load from your clipboard, selected text, or browser tab) and The Downloader routes it to the right tool automatically.

## Built on

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — videos and audio
- [Deno](https://deno.com) — the JavaScript runtime yt-dlp uses for YouTube extraction
- [gallery-dl](https://github.com/mikf/gallery-dl) — image galleries
- [spotDL](https://github.com/spotDL/spotify-downloader) — Spotify tracks, albums, and playlists
- [ffmpeg](https://ffmpeg.org) — audio extraction and format conversion
- [monolith](https://github.com/Y2Z/monolith) — complete webpages as a single HTML file

The extension installs these for you on first use. On macOS most install via Homebrew; spotDL is downloaded as a prebuilt binary (which needs Rosetta 2 on Apple Silicon — or install `spotdl` via Homebrew for a native build).

## Configuration

Default format, quality, and download folder are set in the extension's Raycast preferences (⌘,).

## License

Released under the MIT License — see [LICENSE](LICENSE).
