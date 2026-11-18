# Tesla Clips

Manage Tesla dashcam and Sentry clips — merge split recordings into continuous videos, or remove merged output folders.

## Requirements

- [FFmpeg](https://ffmpeg.org/) must be installed for merging.

```bash
brew install ffmpeg
```

The extension auto-detects common Homebrew paths (`/opt/homebrew/bin/ffmpeg`, `/usr/local/bin/ffmpeg`). You can also set a custom path in preferences.

## Commands

| Command     | Description                                                                          |
| ----------- | ------------------------------------------------------------------------------------ |
| Tesla Clips | Scan folders for Tesla clip events, merge split recordings, or remove merged outputs |

## How Tesla Stores Clips

Tesla writes dashcam and Sentry footage as one-minute `.mp4` segments per camera inside event folders. Filenames follow this pattern:

```text
YYYY-MM-DD_HH-MM-SS-<camera>.mp4
```

Example cameras include `front`, `back`, `left_repeater`, and `right_repeater`. This extension groups those segments by event and camera, then concatenates them into one continuous file per camera.

## How It Works

1. **Scan** — Select source folders via Finder or preferences. The extension recursively discovers Tesla clip events (directories containing timestamped `.mp4` segments). Already-merged outputs are detected during scan.
2. **Choose an action** — From the Actions section, either **Merge Clips** or **Remove Merged Outputs**.
3. **Merge** — Combine split segments per camera with FFmpeg (stream copy, no re-encoding). Output is written to a `merged/` subdirectory inside each event folder, or to a custom output root. When existing merged files are detected, a review screen lets you choose per camera whether to skip or overwrite.
4. **Remove** — Move merged output folders to Trash. Original split clips are kept.
5. **Validate** — Merged files are checked for minimum size. Source timestamps are preserved on output files.

## Preferences

| Preference                              | Description                                                            |
| --------------------------------------- | ---------------------------------------------------------------------- |
| Default Source Folder                   | Used when no Finder folders are selected                               |
| Output Root Folder                      | Optional custom location for merged files (default: `<event>/merged/`) |
| ffmpeg Binary                           | Path to ffmpeg executable                                              |
| Overwrite Existing Merged Files         | Replace existing merged outputs when merging                           |
| Delete Original Split Clips After Merge | Trash source segments after a successful merge                         |
| Open Output Folder After Merge          | Open the first output folder in Finder when a merge completes          |
| Enable Debug Logging                    | Verbose logs in Raycast command logs                                   |

## Merge Safety

- Existing merged outputs are detected before merging and can be reviewed per camera.
- Invalid or corrupt merged files (too small to be real videos) are treated as missing and re-merged automatically.
- Timeline gaps (> 2 minutes between segments) are flagged in the UI.

## Troubleshooting

- **No events found** — Ensure folders contain Tesla clip events with timestamped `.mp4` files.
- **ffmpeg not found** — Install via Homebrew or set the binary path in preferences.
- **Merge failures** — Check available disk space; ffmpeg needs room to write output files.
- **Remove merged outputs** — Merged folders are moved to Trash; restore from Trash if needed.

## Development

```bash
npm install
npm run dev
npm run validate
```
