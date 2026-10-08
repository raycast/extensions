# Raycast Spokenly

A [Raycast](https://www.raycast.com/) extension to control [Spokenly](https://spokenly.app/) — the macOS speech-to-text app — without leaving your keyboard.

Sister project to [`raycast-handy`](https://github.com/mattiacolombomc/raycast-handy).

## Commands

| Command | Mode | What it does |
|---|---|---|
| **Toggle Dictation** | no-view | Start Spokenly's main dictation prompt via its `spokenly://` URL scheme. Optional fallback: simulate your configured global shortcut. |
| **Copy Last Transcript** | no-view | Copies the most recent transcript to the clipboard. |
| **Paste Last Transcript** | no-view | Pastes the most recent transcript into the active app. |
| **Search Transcripts** | view | Browse, search, copy, paste, reveal `.wav` in Finder, or trash any entry from your dictation history. |
| **Transcribe File** | view | Pick an audio/video file and transcribe it through Spokenly's local MCP server. Output as plain text, Markdown, SRT, VTT, or JSON. Optional speaker diarization. |
| **Open History Folder** | no-view | Reveal the Spokenly history directory in Finder. |
| **Open Last Recording** | no-view | Reveal the most recent `.wav` in Finder. |
| **Select Dictation Model** | view | Switch the active dictation transcription model (writes `transcriptionModelID` in Spokenly's preferences). |
| **Select File Transcription Model** | view | Same, but for `fileTranscriptionVoiceModelID` (used by file transcription). |
| **Run Quick Command** | view | List your Spokenly quick commands and trigger any of them. |

## Requirements

- macOS (Spokenly is macOS-only).
- [Spokenly](https://spokenly.app/) installed at `/Applications/Spokenly.app` and launched at least once.
- Node.js 18+ for development.

## Setup

```bash
git clone https://github.com/mattiacolombomc/raycast-spokenly.git
cd raycast-spokenly
npm install
npm run dev      # start the Raycast dev server
```

The extension shows up under "Spokenly" in Raycast as soon as `ray develop` is running.

To run the test suite or the linter:

```bash
npm test         # vitest
npm run lint     # eslint
npm run build    # ray build (type-checks + bundles)
```

## Preferences

| Preference | Default | Purpose |
|---|---|---|
| `MCP Server Port` | `51089` | The HTTP port where Spokenly hosts its MCP server. Only change if Spokenly is reconfigured. |
| `Toggle Dictation Fallback` | off | If on, `Toggle Dictation` simulates the global shortcut via System Events instead of opening the URL scheme. Useful if the URL scheme cannot stop an in-progress dictation. Requires Raycast to have Accessibility permission. |

## How it works (the interesting bits)

Spokenly does not ship a CLI for toggling dictation, has no AppleScript dictionary, and stores most of its preferences in an unconventional shape. This extension was built after reverse-engineering the app. The notable techniques:

- **MCP server.** Spokenly hosts a [Model Context Protocol](https://modelcontextprotocol.io/) JSON-RPC server on `http://127.0.0.1:51089` whenever it is running. It exposes a `transcribe_file` tool that accepts `{file_path, format?, speakers?}`. `src/lib/mcp-client.ts` calls it directly with `fetch` and auto-launches Spokenly if the port is unreachable.
- **URL scheme.** `spokenly://start?prompt_id=<UUID>` triggers a dictation session with the prompt identified by `<UUID>`. The Main Prompt's UUID lives in the plist key `mainPrompt.id`. Quick Commands use the same scheme with their own IDs.
- **Plist data blobs.** The keys `transcriptionModelID`, `fileTranscriptionVoiceModelID`, `mainPrompt`, `recentDictationModels`, `quickCommands` are stored as `<data>` elements whose payload is a UTF-8 JSON-encoded value (Swift `JSONEncoder` written into `UserDefaults`). A regular `defaults write -string` writes a `<string>` instead and gets rejected. `src/lib/plist.ts` reads with `plutil -extract <key> raw -o -` (base64) and writes with `plutil -replace <key> -data <base64>`.
- **History format.** Each dictation is `~/Library/Application Support/Spokenly/History/YYYY-MM-DD/{UUID}.json` with a co-located `{UUID}.wav`. Timestamps are in **Cocoa epoch** (seconds since 2001-01-01). `src/lib/history.ts` parses the Swift `Result<>` envelope (`content.dictation._0.success._0.result`) and converts the date.
- **Model registry.** Spokenly's supported model IDs are not enumerated by any API. `src/lib/models.ts` ships a curated list extracted from the app binary, unioned at runtime with whatever IDs appear in `recentDictationModels` so newer builds don't strand users on an outdated list. Regenerate with:
  ```bash
  strings /Applications/Spokenly.app/Contents/MacOS/Spokenly | \
    grep -iE 'parakeet|whisper|qwen|gpt4o|nova|voxtral|soniox|eleven|appleSpeech|nemotron|cartesia|distil|largeV'
  ```

## Project structure

```
src/
  lib/
    constants.ts     # paths, bundle id, supported extensions
    plist.ts         # plist Data <-> JSON via plutil + base64
    history.ts       # scan history dir, parse entries, Cocoa epoch
    mcp-client.ts    # JSON-RPC client + ensureRunning auto-launch
    models.ts        # curated model registry + plist union
    urls.ts          # spokenly:// URL scheme + osascript shortcut replay
  toggle-dictation.ts
  copy-last-transcript.ts
  paste-last-transcript.ts
  search-transcripts.tsx
  transcribe-file.tsx
  open-history-folder.ts
  open-last-recording.ts
  select-model.tsx
  select-file-model.tsx
  run-quick-command.tsx
tests/
  __mocks__/@raycast/api.ts
  fixtures/sample-history.json
  lib/*.test.ts
```

## License

MIT
