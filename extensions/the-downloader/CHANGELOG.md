# The Downloader Changelog

## [Initial Release] - {PR_MERGE_DATE}

Download videos, audio, image galleries, Spotify music and complete webpages from Raycast, and chat with AI about any video, post or article. The Downloader started from [Video Downloader](https://www.raycast.com/vimtor/video-downloader) by vimtor and its contributors.

- **Download** — paste a link and The Downloader picks the tool: yt-dlp for video and audio, gallery-dl for image galleries, spotDL for Spotify, and monolith for complete webpages saved as one `.html`. Transcripts and thumbnails too. Once a link is read, the form shows the channel, duration, views and best quality, with an estimated size for every quality; Media Preview (⌘Y) shows the thumbnail, description and formats.
- **Live download view** — a progress ring, speed, time left, size, a speed chart and the steps (Prepare → Video → Audio → Merge → Saved). Stop Download is the first action; Esc returns to the form while the download continues in a toast.
- **Fast Download** — a link as the command's argument, downloaded right away with your saved defaults.
- **Download History** — everything downloaded, grouped by day, searchable and filterable by type, with Open File, Show in Finder, Download Again and Remove.
- **Chat About Link** — ask anything about a video (its timestamped transcript, chapters and statistics; answers link to the moment), a social post or an article. Use Raycast AI, Apple Intelligence (macOS 27, on-device) or a local Ollama model, with Answer Style, Answer Language and Custom Instructions. Chats are saved, and when a page blocks apps or is gone, you can read the Internet Archive's copy.
- **Raycast AI Chat** — Download Video, Read Link and Get Link Info tools, plus the Summarize Link, Study Notes and Performance Check skills.
- **Setup and updates** — missing tools install through Homebrew (macOS) or winget (Windows), and outdated ones are offered an update before a download. spotDL's prebuilt binary comes from its GitHub releases and is checked against its SHA-256.
- **Privacy** — links are validated before any tool sees them, the page reader and the AI download tool never reach your local network, browser cookies are used only when you pick a browser, and the auto-downloaded or Homebrew spotDL gets the Spotify client secret from a private config file, not its command line.
