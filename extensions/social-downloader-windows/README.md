# Social Downloader for Windows

Download public videos, audio, and playlists from supported social platforms, or convert media already on your computer.

## Setup

Open **Download Social Media**. On first launch, the extension automatically downloads and verifies yt-dlp, FFmpeg, and FFprobe in its own support folder. Keep the command open until setup finishes. No administrator access, PATH changes, or executable selection is needed. The only preference is your download folder.

## Multiple links and playlists

1. Paste a video or playlist URL.
2. Click the visible **＋ Add Link** control below the URL fields to add another link. Each additional field has its own **✕ Remove Link** control. The Add Link action and **Ctrl+N** shortcut are also available. These are native Raycast checkbox controls that trigger an immediate action; custom inline buttons inside text fields are not supported.
3. Choose **Analyze Links and Playlists**. The preview loads up to 200 entries per source link and deduplicates identical URLs. Remove unwanted entries from the video selector.
4. Choose video or audio, format, resolution cap, audio bitrate, and destination.
5. Start the queue. Up to three downloads can run at once. Cancel individual items or the entire queue, open completed files, and retry failed or canceled items.

**Advanced Single Video Quality** preserves the original per-track selection view.

Supported host families: YouTube, Instagram, X/Twitter, TikTok, Facebook, Reddit, Vimeo, Twitch, and Pinterest. Actual availability depends on the site's extractor, public access, region, and network restrictions. Authentication and cookies are not supported. Live streams are not supported.

## Conversion

Select **Convert local files**, choose one or more files, and choose MP4, MKV, MP3, or M4A output. Local conversion runs sequentially to avoid excessive CPU usage.

For downloads, enable **Convert after download** for explicit re-encoding. Video is downloaded into an intermediate MKV before conversion to avoid incompatible source codecs in MP4. Video output uses H.264/AAC; audio uses the requested bitrate. Without conversion, video containers preserve source codecs and compatible audio may preserve its source bitrate.

Conversions create uniquely named copies and retain source files. Downloads in the batch queue also use unique names to avoid concurrent filename collisions. Increasing resolution or bitrate cannot restore missing source quality.

Keep the command open while processing. Closing it cancels active work. Partial or intermediate files may remain after interruption. The extension does not resume queues across Raycast restarts.

## Components and licenses

Pinned downloads are verified with SHA-256 before execution:

- [yt-dlp 2026.10.26](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.10.26)
- [FFmpeg 9.0.2 Windows essentials build by Gyan](https://github.com/GyanD/codexffmpeg/releases/tag/9.0.2), listed by the [FFmpeg project](https://ffmpeg.org/download.html)

FFmpeg license notices are retained in the support folder. Component versions are updated with extension releases. First setup downloads roughly 100 MB of FFmpeg components plus yt-dlp. Subsequent launches reuse installed components without downloading them again.

YouTube JavaScript challenges use the Node executable running the extension. The official yt-dlp executable includes its EJS components. See the [EJS setup guide](https://github.com/yt-dlp/yt-dlp/wiki/EJS).

## Development and installation

Use Node.js 22.22.2 or later:

```powershell
npm install
npm run dev
```

When importing source through **Import Extension**, run `npm run build` afterward. It compiles to Raycast's default runtime directory. Do not override it with `-o dist` for an imported extension.

`npm run bundle` produces `dist/social-downloader-windows.rayext` for direct installation.

## Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run bundle
```

The public Store submission requires review by the Raycast team. Run `npm run publish` to submit the extension under the authenticated Raycast account.
