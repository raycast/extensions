# Video Downloader

> Download videos from YouTube, 𝕏, Twitch, Instagram, Bilibili and more using yt-dlp CLI

![video-downloader-1.png](metadata%2Fvideo-downloader-1.png)

## Features

- **Download from anywhere yt-dlp supports** — paste a URL, pick a format, and download. Audio-only (MP3) is included.
- **Auto-fill the URL** — optionally load the link from your clipboard, selected text, or the active browser tab (see preferences).
- **Use your browser's cookies** — work around auth-protected media, age restrictions, and "Bad guest token" rate-limit errors on X/Twitter by passing your logged-in browser's cookies (see the _Use Cookies from Browser_ preference).
- **Playlists, opt-in** — for a playlist URL, a _Download entire playlist_ checkbox appears; leave it unchecked to grab just the linked video.
- **Recover from hiccups** — transient failures show a _Try Again_ action (⌘R) and a _Copy Logs_ action, plus a one-key jump to update yt-dlp and ffmpeg.
- **Extract transcripts** — pull a video's subtitles as Markdown, with language selection.
- **AI tools** — `@video-downloader` can download a video or extract a transcript from a chat command.

## Installation

To use this extension, you must have `yt-dlp` and `ffmpeg` installed on your machine.

The easiest way to install this is using [Homebrew](https://brew.sh/). After you have Homebrew installed, run the
following command in your terminal:

```bash
brew install yt-dlp ffmpeg
```

Depending on your macOS version, the package might be located in a different path than the one set by the extension. To
check where `ffmpeg` was installed, run:

```bash
which ffmpeg
```

Then, update the path in the extension preferences to match the output of the above command.

You'll also need `ffprobe`, which is usually installed with `ffmpeg`. Just run `which ffprobe` and update the path
accordingly.

## Windows Beta

### Install yt-dlp
Use the built-in Windows package manager, `winget`, or alternatives like Scoop or Chocolatey. `yt-dlp` includes `ffmpeg` and `ffprobe` binaries.

```bash
winget install --id=yt-dlp.yt-dlp -e
```

### Update Extension Preferences (Optional)

Extension will detect the paths automatically. But you can Copy the paths from the below commands and set them in the extension's preferences.

After installation, open a new terminal and run the following commands to find the paths for `yt-dlp`, `ffmpeg`, and `ffprobe`:

```powershell
(Get-Command yt-dlp).Source
(Get-Command ffmpeg).Source
(Get-Command ffprobe).Source
```

## Supported Sites

See <https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md>.

## **FAQs**

### **Is there a YouTube downloader that actually works?**

Yes, Raycast's Video Downloader is consistently updated to ensure reliable functionality.

<!--
### **Can I download clips from YouTube?**

Absolutely\! Our extension supports downloading full videos, clips, and even YouTube Shorts.
-->

### **How do I download a YouTube video with a manipulated URL?**

Our downloader handles various URL formats. Just paste the link, and we'll take care of the rest.

### **Why does an X/Twitter link fail with "Bad guest token"?**

X rate-limits anonymous access, which can intermittently fail. Set the _Use Cookies from Browser_ preference to the browser you're signed in to X with, and the download will use your logged-in session. The _Try Again_ action also clears most transient failures, and _Update Libraries_ keeps yt-dlp current.

### **Can I download a whole playlist?**

Yes. When you paste a playlist URL, a _Download entire playlist_ checkbox appears below the format. Leave it unchecked to download only the linked video; check it to download the full playlist.
