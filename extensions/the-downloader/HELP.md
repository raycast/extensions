### Choose a Download Folder

Pick the folder where downloads are saved, then continue. `~/Downloads` works for most people, and you can change it later in the extension's preferences.

### Tools

The Downloader uses yt-dlp, FFmpeg, gallery-dl, Deno, monolith and spotDL. You don't need to set them up now: the first time a download needs a missing tool, the extension offers to install it — through Homebrew on macOS or winget on Windows, while spotDL is downloaded from its GitHub releases.

### Optional

- **Spotify: Client ID / Client Secret** — Spotify downloads work far more reliably with a free Spotify Developer app. Create one at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard), add `http://127.0.0.1:9900/` as a Redirect URI, tick **Web API**, and copy its Client ID and Client Secret.
- **Gallery: Cookies from Browser** — for sites that need a login (Instagram, Reddit and others), pick a browser you're signed into.
