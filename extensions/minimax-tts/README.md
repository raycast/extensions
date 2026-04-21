# MiniMax TTS - Raycast Extension

Read selected macOS text aloud from Raycast using MiniMax Speech 2.8.

## Why MiniMax TTS?

MiniMax is a strong fit for a modern Raycast reading workflow:

- **Chinese and English support**: MiniMax Speech works well for both Chinese and English, making it practical for bilingual articles, papers, web pages, and notes.
- **Multilingual reading**: the current MiniMax speech models are built for multilingual speech generation and include language hints such as Chinese, Cantonese, English, Japanese, and Korean.
- **Modern model family**: MiniMax is an active multimodal model platform with current speech, text, video, image, and agent-oriented model offerings. This extension uses the Speech 2.8 family by default.
- **Good value for daily reading**: the model quality is strong enough for long-form listening, while the pricing makes it a practical choice for frequent Raycast use.
- **Current TTS stack**: many older TTS extensions still depend on models and APIs that have not kept pace. MiniMax keeps the reading experience closer to the current generation of speech models.

The goal is not just to "play audio", but to make 1,000-5,000 character selections pleasant to listen to: quick start, voice selection, chunk-level resume, and a simple stop/restart workflow.

## Why This Uses the HTTP API

MiniMax Token Plan users can synthesize speech through the official `mmx-cli`, but this extension calls the MiniMax T2A HTTP API directly:

- No global `mmx` dependency for Raycast users.
- Credentials stay in Raycast extension preferences.
- The extension can be published, copied, or run on another Mac without reproducing a CLI login.
- Runtime errors map directly to MiniMax API responses.

The CLI is still useful for local setup and smoke tests:

```bash
mmx auth status
mmx speech synthesize --text "测试。" --voice "Chinese (Mandarin)_News_Anchor" --out test.mp3
mmx speech voices --language chinese --output json
```

## Features

- Quick Read Selected Text: read selected text with the default voice, or clipboard text when no selection is available.
- Resume Last Reading: continue the previous text from the next unfinished chunk.
- Restart Last Reading: replay the previous text from the beginning.
- Read with Voice Selection: fetch available MiniMax system, cloned, and generated voices.
- Select Quick Read Voice: choose and preview the voice used by Quick Read.
- Stop Reading: stop the active `afplay` process.
- Smart chunking: splits medium-length selections into fast-start chunks around 1,400 characters.
- Region support: China endpoint (`api.minimaxi.com`) and Global endpoint (`api.minimax.io`).
- Voice shortcut: set any listed voice as the Quick Read voice without opening preferences.

## MiniMax Setup

### Get an API Key

1. Open the MiniMax API Platform:
   - Global users: [platform.minimax.io](https://platform.minimax.io/)
   - China region users should use the MiniMax account/API platform that matches the `api.minimaxi.com` endpoint.
2. Register or log in.
3. Open **API Keys**.
4. Create the key that matches your billing mode:
   - **Pay-as-you-go**: choose **Create new secret key**.
   - **Token Plan**: choose **Create Token Plan Key**.
5. Copy the key and keep it private.
6. Make sure the account has an active subscription or balance before using the extension.

MiniMax notes that Token Plan keys are separate from pay-as-you-go keys. Use the key type that matches your account and choose the matching region in Raycast.

### Configure the Raycast Extension

Open the extension preferences in Raycast and set:

| Setting | Description |
| --- | --- |
| API Key | MiniMax Token Plan or API key |
| Region | China or Global API endpoint |
| Model | Default is `speech-2.8-hd` |
| Default Voice | Built-in quick-read voice |
| Custom Default Voice ID | Optional cloned/generated voice ID |
| Language Boost | `auto`, Chinese, English, etc. |
| Speech Rate | 0.5x to 2.0x |

The voice picked from "Read with Voice Selection" is stored as a local Quick Read override and takes precedence over the static Default Voice preference.

## Usage

### Quick Read

1. Select text in any macOS app.
2. Run **Quick Read Selected Text** in Raycast.
3. If text selection is unavailable, the command reads clipboard text instead.
4. Run **Quick Read Selected Text** again, or run **Stop Reading**, to stop playback.

### Choose a Voice

1. Run **Read with Voice Selection** to browse MiniMax system, cloned, and generated voices.
2. Pick a voice to read the current selection.
3. Use **Use as Quick Read Voice** from the action panel to make that voice the default for future Quick Read sessions.

### Manage Medium-Length Reading

- **Resume Last Reading** continues the previous text from the next unfinished chunk.
- **Restart Last Reading** replays the previous text from the beginning.
- **Stop Reading** stops the active audio process without deleting the saved reading session.

This is designed for short papers, article excerpts, documentation pages, and other medium-length selections rather than full audiobook production.

## Next Steps

After setup:

1. Bind a hotkey to **Quick Read Selected Text** for one-keystroke reading.
2. Use **Select Quick Read Voice** to audition voices and set a comfortable default.
3. Keep `Language Boost` on `auto` for mixed Chinese/English text, or set it manually when a document is mostly one language.
4. Use **Resume Last Reading** when you stop in the middle of a longer article.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Technical Notes

- API: MiniMax T2A HTTP `POST /v1/t2a_v2`
- Voice lookup: MiniMax Voice Management `POST /v1/get_voice`
- Audio response: hex-encoded MP3 converted to base64, then played through macOS `afplay`
- Reading state: the most recent text, chunks, progress, and TTS options are stored in Raycast local storage
- Playback stop: PID file in `$TMPDIR/minimax-tts.pid`

## References

- [MiniMax API Overview](https://platform.minimax.io/docs/api-reference/api-overview)
- [MiniMax API Prerequisites](https://platform.minimax.io/docs/guides/quickstart-preparation)
- [MiniMax T2A HTTP API](https://platform.minimax.io/docs/api-reference/speech-t2a-http)
- [MiniMax CLI](https://github.com/MiniMax-AI/cli)
- [MiniMax Token Plan Quick Start](https://platform.minimax.io/docs/token-plan/quickstart)
- [Raycast Extension Docs](https://developers.raycast.com/)
