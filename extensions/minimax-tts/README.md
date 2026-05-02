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

MiniMax documents two valid ways for Token Plan users to access speech generation:

- use the official `mmx-cli` for a ready-made terminal and agent workflow
- integrate directly against the MiniMax HTTP API as an application developer

This extension intentionally uses the direct HTTP API instead of requiring `mmx-cli`:

- No global `mmx` dependency for Raycast users.
- Credentials stay in Raycast extension preferences.
- The extension can be published, copied, or run on another Mac without reproducing a CLI login.
- Runtime errors map directly to MiniMax API responses.

So the design choice here is not "Token Plan versus API". It is "CLI wrapper versus direct API integration". For a Raycast extension, direct API integration is the better fit.

The CLI is still useful for local setup and smoke tests:

```bash
mmx auth status
mmx speech synthesize --text "测试。" --voice "Chinese (Mandarin)_Radio_Host" --out test.mp3
mmx speech voices --language chinese --output json
```

## Authentication Modes

MiniMax currently exposes two account-side key types for this workflow:

- **Token Plan Key**: tied to the Token Plan subscription and its quota model.
- **Open Platform API Key**: tied to the standard pay-as-you-go billing model.

For TTS, these are **not two different wire protocols**. Both use the same MiniMax HTTP API and the same `Authorization: Bearer <API Key>` scheme. The important difference is which key type you create in the MiniMax console and how usage is billed or quota-limited.

This extension now supports both explicitly in Raycast preferences:

- **Authentication Mode**: `Auto Detect`, `Token Plan Key`, or `Open Platform API Key`
- **Token Plan Key**
- **Open Platform API Key**

`Auto Detect` prefers the Token Plan key for HD speech models and automatically uses the Open Platform API key when you choose a Turbo speech model.

MiniMax's current Token Plan docs say Token Plan supports **TTS HD** models, specifically `speech-2.8-hd`, `speech-2.6-hd`, and `speech-02-hd`. Turbo speech models should be used with the Open Platform API key.

## Features

- Quick Read Selected Text: read selected text with the default voice, or clipboard text when no selection is available.
- Resume Last Reading: continue the previous text from the next unfinished chunk.
- Restart Last Reading: replay the previous text from the beginning.
- Read with Voice Selection: fetch MiniMax system, cloned, generated, and configured custom voice IDs; live per-row "Synthesizing N/M" / "Playing N/M" progress while the picker stays browsable.
- Select Quick Read Voice: choose and preview the voice used by Quick Read, including configured custom voice IDs; Active Configuration row warns when the chosen model is incompatible with the configured key.
- Clone Voice: upload source audio with inline form validation, create a cloned voice, and preview the returned demo audio.
- Stop Reading: stop the active `afplay` process; surfaces a "Resume Last Reading" action when nothing is playing but a paused session exists.
- Speed up Reading / Slow Down Reading: adjust the active or paused reading by 0.25×; the new speed applies from the next synthesized segment.
- Reading Status (menu-bar): persistent status item shows live `Synth N/M` / `Play N/M` or paused position with Stop / Resume / Restart / Speed Up / Slow Down / Read / Pick Voice controls.
- Smart chunking: splits medium-length selections into fast-start chunks around 1,400 characters.
- Region support: China endpoint (`api.minimaxi.com`) and Global endpoint (`api.minimax.io`).
- Voice shortcut: set any listed voice as the Quick Read voice without opening preferences.
- Voice list and clone-source uploads are cached locally to keep repeat opens instant and to skip re-uploads on retry.

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

MiniMax notes that Token Plan keys are separate from pay-as-you-go keys and cannot be used interchangeably. Use the key type that matches your account and choose the matching region in Raycast.

### Configure the Raycast Extension

Open the extension preferences in Raycast and set:

| Setting                 | Description                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Authentication Mode     | Auto detect, Token Plan, or Open Platform API key                                               |
| Token Plan Key          | Key created from **Create Token Plan Key**; Token Plan currently supports HD speech models only |
| Open Platform API Key   | Key created from **Create new secret key**                                                      |
| Region                  | China or Global API endpoint                                                                    |
| Model                   | HD models work with Token Plan; Turbo models require Open Platform API Key                      |
| Default Voice           | Built-in quick-read voice                                                                       |
| Default Custom Voice ID | Optional cloned/generated voice ID; overrides Default Voice and is tagged `Default` in pickers  |
| Extra Custom Voice IDs  | Comma-separated cloned/generated voice IDs to surface in voice pickers (tagged `Unverified` until MiniMax acknowledges them) |
| Language Boost          | `auto`, Chinese, English, etc.                                                                  |
| Speech Rate             | 0.5× to 2.0×                                                                                    |

The voice picked from "Read with Voice Selection" is stored as a local Quick Read override and takes precedence over the static Default Voice preference.

If you keep both key types configured, **Auto Detect** uses the right key for the selected speech model. If you force **Token Plan Key** mode while a Turbo model is selected, the extension stops and shows a configuration error instead of sending an invalid request.

## Usage

### Quick Read

1. Select text in any macOS app.
2. Run **Quick Read Selected Text** in Raycast.
3. If text selection is unavailable, the command reads clipboard text instead.
4. Run **Quick Read Selected Text** again, or run **Stop Reading**, to stop playback.

### Choose a Voice

1. Run **Read with Voice Selection** to browse MiniMax system, cloned, generated, and configured custom voices.
2. Pick a voice to read the current selection.
3. Use **Set as Quick Read Voice** from the action panel to make that voice the default for future Quick Read sessions.

If a cloned/generated voice does not appear in MiniMax's voice lookup response, add its `voice_id` to **Default Custom Voice ID** or **Extra Custom Voice IDs** in preferences. The extension sends that ID directly as `voice_setting.voice_id`. Manually added IDs surface at the top of the voice pickers under a `Custom` section and carry an `Unverified` tag until MiniMax's voice lookup confirms them.

### Clone a Voice

1. Run **Clone Voice** in Raycast.
2. Choose a source audio file in `mp3`, `m4a`, or `wav` format.
3. Optionally add a short prompt audio file and its matching prompt text to improve similarity.
4. Enter a custom `voice_id` and a preview text sample.
5. Submit the form to upload the audio, call MiniMax voice cloning, and receive a demo audio URL.
6. Use the result screen to preview the clone, copy the `voice_id`, or set it as the Quick Read voice.

MiniMax's current docs say the source clone audio should be 10 seconds to 5 minutes and under 20 MB. Optional prompt audio should be under 8 seconds and under 20 MB. If the extension is effectively using Token Plan, the clone form only shows HD-compatible preview models.

### Manage Medium-Length Reading

- **Resume Last Reading** continues the previous text from the next unfinished chunk.
- **Restart Last Reading** replays the previous text from the beginning.
- **Stop Reading** stops the active audio process without deleting the saved reading session.
- **Speed up Reading** and **Slow Down Reading** change the reading speed in 0.25× steps from 0.5× to 2.0×.
- Speed changes apply to the next segment because each segment is synthesized separately; paused readings remember the adjusted speed when resumed.

This is designed for short papers, article excerpts, documentation pages, and other medium-length selections rather than full audiobook production.

Recommended Mandarin voices for paper listening:

- `Chinese (Mandarin)_Radio_Host`: relaxed long-form host tone, now the built-in default for new installs.
- `Chinese (Mandarin)_Sincere_Adult`: sincere peer-style explanation.
- `Chinese (Mandarin)_Gentleman`: warmer, more scholarly mentor tone.
- `hunyin_6`: bright, brisk male voice for a more energetic paper walkthrough.
- `male-qn-jingying`: clear younger professional voice.
- `Chinese (Mandarin)_Wise_Women`: knowledgeable female voice for a senior-guide tone.
- `Chinese (Mandarin)_Gentle_Senior`: warm storytelling female voice for soft lecture-style listening.
- `Chinese (Mandarin)_Warm_Bestie`: soft, clear, comforting female voice for relaxed listening.
- `Chinese_sweet_girl_vv1`: bright, expressive young female voice for lighter notes and short passages.

Recommended English voices for paper listening:

- `English_CalmWoman`: warm, clear, guided voice for audiobooks, documentaries, and education.
- `English_captivating_female1`: bright, clear, energetic voice for explainers and knowledge sharing.
- `English_AttractiveGirl`: natural, conversational voice for lighter articles and notes.

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
- Voice clone upload: File Management `POST /v1/files/upload`
- Voice clone creation: `POST /v1/voice_clone`
- Authentication: `Authorization: Bearer <API Key>` for both Token Plan keys and Open Platform API keys
- Token Plan model scope: TTS HD only (`speech-2.8-hd`, `speech-2.6-hd`, `speech-02-hd`)
- Audio response: hex-encoded MP3 converted to base64, then played through macOS `afplay`
- Reading state: the most recent text, chunks, progress, and TTS options are stored in Raycast local storage
- Playback stop: PID file in `$TMPDIR/minimax-tts.pid`

## References

- [MiniMax API Overview](https://platform.minimax.io/docs/api-reference/api-overview)
- [MiniMax API Prerequisites](https://platform.minimax.io/docs/guides/quickstart-preparation)
- [MiniMax T2A HTTP API](https://platform.minimax.io/docs/api-reference/speech-t2a-http)
- [MiniMax Voice Clone Guide](https://platform.minimaxi.com/docs/guides/speech-voice-clone)
- [MiniMax File Upload API](https://platform.minimaxi.com/docs/api-reference/file-management-upload)
- [MiniMax Voice Clone API](https://platform.minimaxi.com/docs/api-reference/voice-cloning-clone)
- [MiniMax CLI](https://github.com/MiniMax-AI/cli)
- [MiniMax Token Plan Quick Start](https://platform.minimax.io/docs/token-plan/quickstart)
- [Raycast Extension Docs](https://developers.raycast.com/)
