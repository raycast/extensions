<p align="center">
  <img src="assets/extension-icon.png" width="128" height="128" alt="Agent Feedback icon">
</p>

# Agent Feedback

Record your screen, point at the interface, and say what should change. Agent Feedback turns the recording into local, agent-ready Markdown with a timestamped transcript and screenshots, then copies it to your clipboard.

Everything after the one-time model download runs on your Mac. There is no account, hosted video, transcription API, analytics, or telemetry.

## Workflow

1. Run **Record Agent Feedback** to start screen and microphone capture.
2. Talk naturally while navigating your app.
3. While pointing at something important, run **Mark Feedback Moment** to attach an exact screenshot and timestamp.
4. Run **Record Agent Feedback** again to stop.
5. Agent Feedback transcribes locally, assembles the report, and copies it to your clipboard so you can paste it into your agent when ready.

If you do not mark anything manually, Agent Feedback captures periodic background frames and selects up to the configured maximum automatically.

## Recommended Hotkeys

| Command | Hotkey |
| --- | --- |
| Record Agent Feedback | `⌘ ⇧ F` |
| Mark Feedback Moment | `⌘ ⇧ M` |

Set hotkeys from Raycast by selecting a command and choosing **Configure Command** from the Action Panel.

## Local Setup

Agent Feedback requires [`whisper-cli`](https://github.com/ggml-org/whisper.cpp) for local transcription:

```sh
brew install whisper-cpp
```

Then run **Download Local Models** once in Raycast. It downloads:

- Whisper base multilingual model
- Silero voice-activity model to prevent hallucinations during silence

Both downloads come from their official Hugging Face repositories and are verified against pinned SHA-256 digests before installation.

On first use, macOS asks for Raycast's **Screen & System Audio Recording** and **Microphone** permissions.

## Install From Source

```sh
git clone https://github.com/vojtaholik/agent-feedback.git
cd agent-feedback
npm install
npm run dev
```

## Output

Each session contains:

- `recording.mov` — screen, cursor, click highlights, and microphone
- `transcript.json` — timestamped local Whisper output
- `frames/` — manually marked or automatically captured screenshots
- `feedback.md` — the report copied to your clipboard

Use **Open Feedback Sessions** to inspect or delete these artifacts in Finder.

## Privacy

- Recordings and reports remain in Raycast's local extension support directory.
- Model inference is local.
- The only network requests are the explicit one-time model downloads.
- Model files are integrity checked before use.
- Nothing is uploaded automatically.

Remember that screen recordings can contain private information. Review a report before sharing it outside your machine.

## Development

```sh
npm install
npm run build
npm run lint
```

Agent Feedback is macOS-only because it uses the system `screencapture` and `afconvert` tools.

## License

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
