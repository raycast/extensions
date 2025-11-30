# Instagram Video Transcriber for Raycast

A Raycast extension that transcribes Instagram videos using OpenAI's Whisper API.

## Features

- 🎯 **Simple Interface**: Just paste an Instagram URL and get the transcript
- 🚀 **Fast & Accurate**: Uses OpenAI Whisper API for high-quality transcription
- 💾 **Smart Caching**: Remembers transcripts to save time on repeated requests
- 📚 **Transcript History**: View and search all your past transcriptions
- 📋 **Multiple Export Options**: Copy as plain text or formatted Markdown
- 🔗 **Quick Access**: Open original videos directly from history

## Prerequisites

### Required Tools
Install these via Homebrew:

```bash
# For downloading Instagram videos
brew install yt-dlp

# For audio extraction
brew install ffmpeg
```

### Required
- **OpenAI API Key**: Required for transcription (get one at [platform.openai.com](https://platform.openai.com))

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and import to Raycast:
   ```bash
   npm run build
   ray import
   ```

## Configuration

In Raycast preferences for this extension:

1. **OpenAI API Key**: Add your OpenAI API key (required)

## Usage

1. Open Raycast
2. Search for "Transcribe Instagram Video"
3. Paste an Instagram video URL (supports Posts, Reels, IGTV)
4. Press Enter to start transcription
5. Copy or save the resulting transcript

## How It Works

The extension follows this flow:

1. **URL Validation**: Checks if the provided URL is a valid Instagram video
2. **Cache Check**: Looks for existing transcript to avoid re-processing
3. **Video Download**: Uses yt-dlp to download the video
4. **Audio Extraction**: Converts video to audio using ffmpeg
5. **Transcription**: Uses OpenAI Whisper API to transcribe the audio
6. **Result Display**: Shows transcript with options to copy or export
7. **History**: Automatically saves to transcript history for easy access later

## Privacy & Performance

- **Automatic caching** prevents unnecessary re-processing
- **Transcript history** stores your past transcriptions locally
- **Storage efficient** - automatically cleans up temporary files after transcription

## Troubleshooting

### "yt-dlp not found"
Install it: `brew install yt-dlp`

### "ffmpeg not found"
Install it: `brew install ffmpeg`

### "Invalid OpenAI API key"
Make sure your API key is correct and has sufficient credits. Check your API key at [platform.openai.com](https://platform.openai.com)

### "Audio file too large"
Whisper API has a 25MB limit. Try shorter videos or the extension will automatically handle file size.

### Private Instagram Videos
The extension cannot access private videos or stories. Only public content is supported.

## License

MIT
