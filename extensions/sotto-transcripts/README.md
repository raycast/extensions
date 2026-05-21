# Sotto Transcripts

Browse and re-copy transcripts from [Sotto](https://sotto.to)'s recording history, directly from Raycast.

Sotto's auto-paste sometimes misfires, the active app eats the keystroke, you forgot to focus the right field, or you just want yesterday's dictation back. This extension reads Sotto's local history file and gives you fuzzy search, fast copy/paste, and a detail view across every transcript you've ever recorded.

## Features

- 🔍 **Fuzzy search** every past transcript — searches the text, the source, the model, and the status
- 📋 **One-keystroke re-copy** — Enter to copy, ⌘V to paste straight into the previously focused app
- 📅 **Grouped by recency** — Today, Yesterday, Earlier This Week, Earlier This Month, then by month
- 🕒 **Relative timestamps** — "23 minutes ago", "Yesterday at 2:30 PM", "Tuesday at 9:14 AM"
- 📊 **Word count, duration, and cost** per transcript, plus the model that produced it
- 🎧 **Open the original `.wav`** in Finder or play it inline
- ⌨️ **Toggle the detail pane** with ⌘⇧D for a denser list view

## Getting Started

1. Install [Sotto](https://sotto.to) and use it at least once so it creates `recording-history.json`.
2. Install this extension from the Raycast Store (or run `npm run dev` from this directory).
3. Open Raycast and run **Search Transcripts**. Your history loads automatically.

The extension reads from Sotto's default location:

```
~/Library/Containers/com.kitze.sotto/Data/Library/Application Support/com.kitze.sotto/recording-history.json
```

If Sotto stores its data elsewhere, set a custom path in **Raycast → Extensions → Sotto Transcripts → Configure Extension**.

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Copy transcript to clipboard | `↵` |
| Paste transcript into the active app | `⌘V` |
| Open the full-screen detail view | `⌘↵` |
| Hide / show the detail pane | `⌘⇧D` |
| Show the recording in Finder | `⌘⇧F` |
| Play the audio recording | `⌘⇧P` |
| Copy the entry ID | `⌘⇧I` |
| Reload the history file | `⌘R` |

## Privacy & Data

This extension is **entirely local**. Nothing leaves your machine.

- Reads one file: `recording-history.json` (the file Sotto already writes to disk).
- No network requests, no analytics, no telemetry.
- The original audio files only open when you explicitly choose **Play Audio** or **Show in Finder**.

If macOS prompts you for Full Disk Access, that's because Raycast itself needs permission to read from inside Sotto's container (`~/Library/Containers/...`). Grant it once in **System Settings → Privacy & Security → Full Disk Access → Raycast**.

## Troubleshooting

**"Sotto history not found"**  
Sotto hasn't created the history file yet — record at least one dictation and try again. If you've moved Sotto's data folder, set a custom path in extension preferences.

**"Permission denied"**  
Raycast needs Full Disk Access to read from Sotto's container. Grant it in System Settings (see Privacy section above).

**"History file is corrupted"**  
The JSON file is malformed. This usually means Sotto crashed mid-write. Open Sotto and let it run to rewrite the file, or restore from a Time Machine backup.

**A transcript I just recorded isn't showing up**  
Press `⌘R` to reload the file, or close and reopen the command. The history file is only re-read on open.

## Configuration

The single preference is **Recording History Path** — override it if Sotto stores its data outside the default Containers location. Leave it blank to use the default.

## Contributing

Local development:

```bash
git clone <this repo>
cd sotto-raycast
npm install
npm run dev
```

`npm run dev` opens Raycast with the extension registered and hot-reloads on save. Other scripts:

- `npm run build` — production build
- `npm run lint` / `npm run fix-lint` — Raycast lint + Prettier
- `npm run knip` — unused-code audit

Source layout:

```
src/
├── search.tsx                       # command entry — list, filter state, error view
├── components/
│   ├── EntryItem.tsx                # memo'd list item with detail + actions
│   └── TranscriptDetail.tsx         # full-screen detail view
└── util/
    ├── types.ts                     # Entry, RawEntry, HistoryFile, Preferences
    ├── paths.ts                     # default history-file path resolver
    ├── load-entries.ts              # reads + normalises Sotto's JSON
    ├── group-entries.ts             # Today / Yesterday / … recency grouping
    ├── relative-date.ts             # human-friendly timestamps
    ├── format-duration.ts           # "1m 23s"
    ├── format-cost.ts               # "$0.0069" / "Free"
    ├── preview.ts                   # transcript-text truncation
    └── describe-error.ts            # friendly error titles + descriptions
```

## Credits

This extension is an independent companion to [Sotto](https://sotto.to). it is not affiliated with or endorsed by the Sotto team. All credit for the underlying dictation experience goes to them.

Built with the [Raycast API](https://developers.raycast.com).

## License

MIT
