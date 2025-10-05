# Video Downloader

> Download videos from YouTube, Twitter, Twitch, Instagram, Bilibili and more using yt-dlp CLI

![video-downloader-1.png](metadata%2Fvideo-downloader-1.png)

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

**Install yt-dlp**  
 Use the built-in Windows package manager, `winget`, or alternatives like Scoop or Chocolatey. `yt-dlp` includes `ffmpeg` and `ffprobe` binaries.

```bash
winget install --id=yt-dlp.yt-dlp -e
```

**Update Extension Preferences - Optional**

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
