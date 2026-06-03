# Voxtral Dictation

A Raycast extension for speech-to-text dictation powered by [Mistral's Voxtral](https://mistral.ai/news/voxtral/) API. Speak into your microphone and have the transcription pasted wherever your cursor is.

## Features

- **Dictate** — Toggle recording with a single shortcut. Press once to start, press again to stop and paste the transcription at your cursor.
- **Reformulate** — Open a comparison view showing the raw transcription alongside a cleaned-up version (via Mistral Chat). Choose which to paste.
- **Customizable reformulation prompt** — Configure the system prompt used for reformulation in the extension preferences.

## Prerequisites

- [Raycast](https://raycast.com)
- [SoX](http://sox.sourceforge.net/) for microphone recording:
  ```
  brew install sox
  ```
- A [Mistral AI API key](https://console.mistral.ai/)
- Microphone permission for Raycast (System Settings > Privacy & Security > Microphone)

## Setup

1. Clone this repo and install dependencies:
   ```
   git clone https://github.com/chloedia/voxtral-dictation.git
   cd voxtral-dictation
   npm install
   ```

2. Start in development mode:
   ```
   npm run dev
   ```

3. In Raycast, search for **Dictate** — it will prompt for your Mistral API key on first use.

4. Assign keyboard shortcuts in Raycast:
   - **Dictate** — e.g. `Cmd+Shift+Space` (toggle recording on/off)
   - **Reformulate Last Dictation** — e.g. `Cmd+Shift+R` (review & choose version)

## Commands

| Command | Mode | Description |
|---------|------|-------------|
| **Dictate** | no-view | Toggle: start recording, or stop and paste transcription |
| **Reformulate Last Dictation** | view | Compare raw vs reformulated text, then paste your choice |

## How it works

1. **Recording** — Uses SoX (`rec`) to capture 16-bit mono WAV audio at 16kHz via a detached background process.
2. **Transcription** — Sends the audio to `POST https://api.mistral.ai/v1/audio/transcriptions` using the `voxtral-mini-latest` model.
3. **Pasting** — Uses Raycast's `Clipboard.paste()` to insert text at the current cursor position.
4. **Reformulation** — Sends the raw transcription to `POST https://api.mistral.ai/v1/chat/completions` using `mistral-small-latest` with a configurable system prompt.

## Project structure

```
src/
  shared.ts        # Shared constants, types, and helpers
  dictate.tsx       # Dictate command (record + transcribe + paste)
  reformulate.tsx   # Reformulate command (compare + choose + paste)
assets/
  icon.png          # Extension icon
package.json        # Raycast manifest, preferences, and dependencies
```

## License

MIT
