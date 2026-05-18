# Kesha Voice Kit - Raycast extension

Offline microphone dictation for Raycast, powered by the [Kesha Voice Kit](https://github.com/drakulavich/kesha-voice-kit) CLI. Recording and transcription stay local; no API keys, no cloud roundtrips.

## Commands

### Dictate to Clipboard

Starts recording from the default microphone, stops when you press **Stop and Transcribe** or when the configured time limit is reached, then transcribes locally and copies the transcript to the clipboard.

## Prerequisites

Install Kesha Voice Kit 1.19.0 or newer and fetch the local engine + ASR models:

```bash
bun add -g @drakulavich/kesha-voice-kit@latest
kesha install
```

macOS may ask for microphone permission the first time the command records audio. Grant access to Raycast when prompted.

## Preferences

| Preference            |             Default | When to set                                            |
| --------------------- | ------------------: | ------------------------------------------------------ |
| `kesha` binary path   | empty (auto-detect) | If `kesha` is installed somewhere Raycast cannot find. |
| Max recording seconds |               `120` | If you want shorter or longer dictation sessions.      |

## Source and contributions

The extension source lives alongside the main CLI at <https://github.com/drakulavich/kesha-voice-kit/tree/main/raycast>. Issues and feature requests go in the main repo's [issue tracker](https://github.com/drakulavich/kesha-voice-kit/issues).
