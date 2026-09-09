# Turbo Speedo Video

Adjust video playback speed, change frame rate, and remove audio using FFmpeg on your Mac. Files are processed locally.

## Requirements

Install [FFmpeg](https://ffmpeg.org/download.html), including `ffprobe`. With Homebrew:

```bash
brew install ffmpeg
```

The extension checks common Homebrew and MacPorts locations. For a custom installation, set **FFmpeg Path** in the extension's preferences to the full path of the `ffmpeg` executable. `ffprobe` must be installed in the same directory.

## Usage

1. Select a video in Finder, or enter its full path in the command's optional **Video file path** argument.
2. Open **Adjust Video Speed**, **Change Framerate**, or **Remove Audio** in Raycast.
3. Choose the speed (0.25×–40×), output frame rate (24, 30, or 60 fps), and audio option where available.
4. Review the output path and run **Process Video**.
5. The result is revealed in Finder when processing finishes. Keep the command open while processing.

**Adjust Video Speed** starts at 2× speed. **Change Framerate** starts at normal speed. **Remove Audio** starts at 2× speed with audio removed; choose 1× if you only want to remove audio.

Input formats: MP4, MOV, AVI, MKV, WebM, FLV, WMV, M4V, 3GP, and OGV, subject to your FFmpeg installation's decoder support. Outputs default to MP4 using H.264 video and AAC audio. Custom output paths can use MP4, MOV, MKV, or M4V.

Audio is adjusted to match the video speed when **Keep Audio** is selected. Silent videos remain silent. Processing re-encodes the video, so quality and file size may change. Existing files are never overwritten; choose a new output name if one already exists.

## Troubleshooting

- **FFmpeg not found:** Check the FFmpeg Path preference and confirm `ffprobe` is installed beside `ffmpeg`.
- **No video selected:** Select a file in Finder before launching the command, or supply its full path as an argument.
- **Processing fails:** Check that the input plays correctly, the output directory exists and is writable, and there is enough free disk space.

## Development

Requires Node.js 22.22.2 or newer, npm, Raycast, and FFmpeg on your PATH for integration tests.

```bash
npm ci
npm run dev
```

Before submitting changes:

```bash
npm run lint
npm run type-check
npm test -- --runInBand
npm run build
```

Open and test the distribution build in Raycast, then run `npm run publish` to submit it for Store review. Publishing opens or updates a pull request in [raycast/extensions](https://github.com/raycast/extensions); the extension becomes available after Raycast approves and merges it.

## License

MIT. See [LICENSE](LICENSE).
