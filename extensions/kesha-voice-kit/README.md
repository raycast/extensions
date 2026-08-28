# Kesha Voice Kit - Raycast extension

Offline microphone dictation for Raycast, powered by the [Kesha Voice Kit](https://github.com/drakulavich/kesha-voice-kit) CLI. Recording and transcription stay local; no API keys, no cloud roundtrips.

[![Install from the Raycast Store](https://www.raycast.com/drakulavich/kesha-voice-kit/install_button@2x.png)](https://www.raycast.com/drakulavich/kesha-voice-kit)

## Commands

### Dictate to Clipboard

Starts recording from the default microphone and shows a live view while you speak:

- **Signal meter** — input level plus the microphone's name and format, so you can tell at a glance whether the right device is live.
- **Auto-stop on silence** — after ~30 s without speech the status flips to Idle, and ~15 s later recording stops on its own; speaking again resets the timer.
- **Stop and Transcribe** — or let the configured time limit end the session.

Transcription runs locally (NVIDIA Parakeet TDT, multilingual) and the transcript is copied to the clipboard automatically. A running transcription can be cancelled from the action panel.

## Prerequisites

Install the Kesha Voice Kit CLI, then fetch the local engine + ASR models:

```bash
brew install drakulavich/tap/kesha-voice-kit
kesha install
```

Prefer bun? `bun add -g @drakulavich/kesha-voice-kit@latest` installs the same CLI.

`kesha install` downloads ~2.5 GB of engine and speech-to-text models on first
run, so give it a few minutes. Verify the result before using the extension:

```bash
kesha record --help
```

macOS may ask for microphone permission the first time the command records audio. Grant access to Raycast when prompted.

## Preferences

| Preference            |             Default | When to set                                            |
| --------------------- | ------------------: | ------------------------------------------------------ |
| `kesha` binary path   | empty (auto-detect) | If `kesha` is installed somewhere Raycast cannot find. |
| Max recording seconds |               `300` | If you want shorter or longer dictation sessions.      |

## Source and contributions

The extension source lives alongside the main CLI at <https://github.com/drakulavich/kesha-voice-kit/tree/main/raycast>. Issues and feature requests go in the main repo's [issue tracker](https://github.com/drakulavich/kesha-voice-kit/issues).
