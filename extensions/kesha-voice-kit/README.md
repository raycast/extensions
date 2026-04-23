# Kesha Voice Kit — Raycast extension

Offline speech-to-text and text-to-speech for Raycast, powered by the [kesha-voice-kit](https://github.com/drakulavich/kesha-voice-kit) CLI. No API keys, no cloud — runs locally on Apple Silicon.

## Commands

### Transcribe Selected Audio

Select an audio file in Finder (`.ogg`, `.opus`, `.mp3`, `.m4a`, `.wav`, `.flac`, `.webm`), then run this command. Opens a detail view with the transcript and detected language; the transcript is already on your clipboard.

### Speak Clipboard

Synthesize speech from the current clipboard text and play it through the default audio output. Auto-routes English → Kokoro, Russian → Piper, or override with the _Default voice_ preference (any valid `kesha say --voice` value including `macos-*` system voices).

## Prerequisites

Install the `kesha` CLI and fetch the engine + models:

```bash
npm install -g @drakulavich/kesha-voice-kit   # or bun add --global
kesha install          # downloads engine + ASR + lang-id models (~350 MB)
kesha install --tts    # Kokoro + Piper + ONNX G2P (~490 MB, required by Speak Clipboard)
```

No system dependencies. Grapheme-to-phoneme runs entirely through bundled ONNX (CharsiuG2P ByT5-tiny) — there's no longer any `espeak-ng` / `brew` / `apt` step.

`macos-*` system voices need no install — they use voices already on your Mac.

## Preferences

| Preference | Default | When to set |
|---|---|---|
| `kesha` binary path | empty (uses PATH) | If `kesha` is installed somewhere PATH doesn't cover in Raycast's subprocess env. |
| Default voice | empty (auto-route) | If you want a specific voice for _Speak Clipboard_, e.g. `macos-com.apple.voice.compact.en-US.Samantha`. |

## Source and contributions

The extension source lives alongside the main CLI at <https://github.com/drakulavich/kesha-voice-kit/tree/main/raycast>. Issues and feature requests go in the main repo's [issue tracker](https://github.com/drakulavich/kesha-voice-kit/issues).
