# Omni

Real-time transcription powered by [Omni](https://github.com/ahkohd/omni) — right from Raycast.

## Setup

1. Install Omni:
   ```bash
   npm install -g @ahkohd/omni
   ```

2. Configure your transcription server in `~/.config/omni/config.toml`:
   ```toml
   [server]
   baseUrl = "http://your-server:8000/v1"
   apiKey = ""
   model = "voxtral-realtime"
   ```

3. Install this Raycast extension and you're good to go.

## Commands

| Command | Description |
|---------|-------------|
| **Toggle Transcription** | Start/stop transcription. Uses your configured default stop mode (insert/copy/stop). Bind this to a hotkey for hands-free use. |
| **Transcribe & Copy** | Same as toggle, but copies to clipboard instead of inserting. |
| **Select Input Device** | Browse and switch audio input devices. |
| **Omni Status** | View daemon state, recording info, server config. |
| **Omni Doctor** | Run health checks on your setup. |

## Preferences

| Preference | Description |
|------------|-------------|
| **Omni Binary Path** | Leave empty to auto-detect. Set manually if omni is installed in a non-standard location. |
| **Default Stop Mode** | What happens when you stop via Toggle Transcription: insert at cursor, copy to clipboard, or just stop. |

## Tips

- Bind **Toggle Transcription** to a global hotkey (e.g. `⌘⇧Space`) for one-key transcription control.
- The extension auto-starts the omni daemon — no need to manage it manually.
- Use **Omni Doctor** to diagnose issues with your setup.
