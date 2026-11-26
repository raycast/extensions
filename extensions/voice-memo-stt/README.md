# Voice Memos Transcription — Raycast Extension

Browse macOS Voice Memos recordings in Raycast, transcribe them with
[`vmt`](https://github.com/matsubo/voice-memo-stt), and read, copy, or open the results — all from the list
with **⌘K**.

```
Search Voice Memos
┌──────────────────────────────────────────────────────────────────────┐
│ ✓  AI Moderator Meeting     2,730 chars   1h06m    3 months ago      │
│ ✓  Lunch notes                412 chars   15m23s   3 months ago      │
│ ○  Product review Q2                      45m12s   3 months ago      │
│ ○  Quick idea                             0m45s    3 months ago      │
└──────────────────────────────────────────────────────────────────────┘
                                                  ⌘K  Actions
```

`✓` is transcribed, `○` is not. The dropdown on the right filters to one or the
other.

## Actions (⌘K)

| Action | Shortcut | Available on |
|---|---|---|
| View Transcript | `↵` | transcribed |
| Transcribe | `↵` | not transcribed |
| Copy Transcript | `⌘C` | transcribed |
| Open in Default App | `⌘O` | transcribed |
| Open With… | | transcribed |
| Show Transcript in Finder | `⌘⇧F` | transcribed |
| Show Recording in Finder | | any |
| Transcribe Again (asks first; replaces the outputs, edits included) | | transcribed |
| Copy Recording Name | `⌘⇧C` | any |

Transcription jobs run in the background with a progress toast, and the list
refreshes itself when it finishes.

## Requirements

1. **`vmt` 0.6.0 or later installed** — `brew install matsubo/tap/vmt`, with an
   ElevenLabs API key set (`vmt config set engines.elevenlabs.api_key sk-...`).
2. **Raycast has Full Disk Access.** The Voice Memos database is in a
   TCC-protected container, and the permission is granted per calling app, so
   Raycast needs its own grant:

   ```
   System Settings → Privacy & Security → Full Disk Access → add Raycast
   ```

   Relaunch Raycast afterwards. Without it the extension shows
   *"Raycast cannot read Voice Memos"* with the same instructions.

If `vmt` lives somewhere other than `/opt/homebrew/bin` or `/usr/local/bin`, set
its path in the extension preferences (`⌘,`) — Raycast runs commands without a
login shell, so `PATH` is not inherited.

## Install

Install **Voice Memos Transcription** from the
[Raycast Store](https://www.raycast.com/matsubokkuri/voice-memo-stt). Store
updates arrive automatically; keep `vmt` current with `brew upgrade vmt`.
