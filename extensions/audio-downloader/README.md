# Audio Downloader

> Download audio from YouTube, Twitter, Twitch, Instagram, Bilibili and more using yt-dlp CLI

![audio-downloader.png](metadata%2Faudio-downloader.png)

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

## Supported Sites

See <https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md>.

## **FAQs**

### **Is there a audio downloader that actually works?**

Yes, Raycast's Audio Downloader is consistently updated to ensure reliable functionality.

<!--
### **Can I download clips from YouTube?**

Absolutely\! Our extension supports downloading full audios, clips, and even YouTube Shorts.
-->

### **How do I download audio with a manipulated URL?**

Our downloader handles various URL formats. Just paste the link, and we'll take care of the rest.
