# FluidVoice

Transcribe local audio/video files and web media with [FluidVoice](https://github.com/altic-dev/FluidVoice)'s Local API. Browse dictation history and check the connection from Raycast. macOS only.

## Setup

1. Install FluidVoice and choose/download a speech model. This extension was verified against FluidVoice **1.6.11**.
2. Enable FluidVoice's Local API. Its default address is `http://127.0.0.1:47733`. If you change the port, set **Local API Port** in this extension's Raycast preferences to match. Restart FluidVoice if the API does not respond after enabling it.
3. Install the media helpers:

   ```sh
   brew install ffmpeg yt-dlp
   ```

   `ffprobe` (included with ffmpeg) checks audio compatibility. ffmpeg converts unsupported media formats. yt-dlp is used for supported player pages and media manifests; direct audio/video URLs download without it.

No API key is required. Keep FluidVoice running while transcribing.

## Commands

- **Transcribe Audio**: enter an HTTP(S) media URL, file URL, or local path. A file picker selection takes precedence over the text field. Without a command argument, the command presets a Finder selection when Finder is active, or a URL/file from the clipboard. Transcripts can be copied from the result view.
- **Browse Dictation History**: search and copy FluidVoice dictations. This API lists dictation history, not past file-transcription jobs or FluidMeet meetings.
- **Check Connection**: check Local API availability and the FluidVoice version.

All commands have the subtitle **FluidVoice**, so searching for the app name finds them.

## Raycast AI

Use the extension's **Transcribe Media** tool in Raycast AI Chat with one URL or absolute local file path. It returns the transcript for questions or summaries. Large transcripts remain subject to the selected AI model's context limits. Using a transcript in Raycast AI follows Raycast AI's processing and privacy settings.

## Media and downloads

The extension sends the **whole local file path in one request** to FluidVoice. It does not split audio, upload the file to a remote transcription service, or add model metadata to the transcript. FluidVoice uses its currently selected speech model and manages its own audio processing. Inference requests have no client deadline; health/history checks time out after 15 seconds.

Web media is downloaded to the extension's private support folder. HTML/player pages and manifests use yt-dlp, with playlists disabled. Authenticated/cookie-based downloads are not configured. Only download media you are entitled to access.

**Downloaded Files to Keep** defaults to 5 completed jobs. Set it to 0 to remove temporary media after transcription. Original input files are never deleted. Retention is applied on every transcription run, including local files and a limit of 0. Live jobs carry a process/heartbeat lease and are excluded from cleanup. Jobs whose process has exited are recovered on the next run; expired leases and unmarked legacy folders are recovered after a 24-hour grace period. Failed jobs are cleaned up. A cached file selected as the current local input is protected. Keep the Raycast command open during processing; closing it may interrupt transcription.

## Troubleshooting

- **Could not connect**: run Check Connection, ensure FluidVoice is running, check that Local API is enabled and the ports match, then restart FluidVoice if needed.
- **Missing media tools**: install `ffmpeg` and `yt-dlp` with the command above. Homebrew paths on both Apple Silicon and Intel Macs are supported.
- **No audio track or no speech**: check the media in a player and verify the selected speech model and language in FluidVoice.
- **Busy/model errors**: finish other FluidVoice recording/transcription work and retry. Actual limits and performance depend on the selected provider, model, and machine.

## Development

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

The tests use a local HTTP server and mocked FluidVoice/media commands. They do not require a running FluidVoice instance, installed media helpers, or internet access.

API contract: [FluidVoice 1.6.11 Local API source](https://github.com/altic-dev/FluidVoice/tree/v1.6.11/Sources/Fluid/Services/LocalAPI).
