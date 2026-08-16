# Fetch YouTube Transcript

## Overview

Fetch YouTube Transcript is a Raycast extension that allows you to easily fetch and save transcripts from YouTube videos.

## Features

- Quickly retrieve transcripts for YouTube videos
- Customizable download location
- Simple and intuitive interface
- Works with Raycast AI, so you can summarize a video or turn it into notes

## ⚠️ Important Prerequisite: `yt-dlp` Installation

This extension has been updated to use `yt-dlp`, a powerful and reliable command-line tool for interacting with YouTube. This change was made because previous methods were becoming unreliable due to frequent changes by YouTube.

**You must install `yt-dlp` on your system for this extension to work.**

You can install it easily using one of the following commands in your terminal. You can install it using pip or homebrew:

```bash
pip install yt-dlp
```

Or

```bash
brew install yt-dlp
```

Or, refer to the official `yt-dlp` documentation for other installation methods: [https://github.com/yt-dlp/yt-dlp#installation](https://github.com/yt-dlp/yt-dlp#installation)

## Installation

Install this extension through the Raycast Store.

## Usage

1. Ensure `yt-dlp` is installed on your system (see Prerequisites).
2. Open Raycast
3. Select Your Preferred Language.
4. Run the "Fetch YouTube Transcript" command
5. Paste the YouTube video URL
   - Provide the full YouTube video URL (e.g., <https://www.youtube.com/watch?v=exampleID> or <https://youtu.be/exampleID>)
6. **It will automatically fetch the transcript and save it to the downloads folder.**
7. You can change your preferred download folder and preferred language in Raycast extension settings.

## Using It with Raycast AI

The extension also exposes its transcript fetching to Raycast AI, so you can work with a video's contents in plain English instead of opening the saved file yourself.

Type `@fetch-youtube-transcript` in Raycast AI, or just paste a link and ask for what you want:

- "Summarize this video: <https://www.youtube.com/watch?v=exampleID>"
- "What are the key points of <https://youtu.be/exampleID>?"
- "Get the Hindi transcript of this video and translate the main ideas to English"

Because the AI receives the transcript as text, it can pass it on to your other extensions — for example, writing the summary straight into your notes app.

A few things worth knowing:

- `yt-dlp` is required here too (see Prerequisites above).
- The AI can request a specific language for a single question without changing your Default Language preference.
- For long videos the AI reads the transcript in chunks. If it has only seen part of a video, it is told so, so it can say the summary is partial rather than presenting it as complete.
- This does not change the regular command. Transcripts saved to your download folder are still saved in full, whatever the length of the video.

## Author

Apoorv Khandelwal

## License

MIT

## Categories

- Media
- Productivity
