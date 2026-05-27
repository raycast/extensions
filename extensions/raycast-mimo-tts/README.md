# Raycast MiMo TTS

Read selected or clipboard text aloud with Xiaomi MiMo TTS, directly from Raycast.

Chinese and English voices, fine-grained style controls, chunked long-text playback, menu-bar status, and per-session speed override — all without leaving the keyboard.

## Setup

1. Get a MiMo **Token Plan** API key — it starts with `tp-`. (Pay-as-you-go `sk-` keys are not supported by the Token Plan endpoint this extension talks to.)
2. Install this extension and open Raycast Preferences → Extensions → **MiMo TTS**.
3. Paste the key into **MiMo Token Plan API Key**.
4. (Optional) Run **Setup Voice Defaults** to pick a default voice, model, baseline speed, and style prompt.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| Quick Read | no-view | Read selected or clipboard text with your default voice. Trigger again to stop. |
| Read with Voice | view | Browse voices and read selection / clipboard with the chosen voice. |
| Set Quick Read Voice | view | Pick and preview the voice that Quick Read uses. |
| TTS Studio | view | Compose long-form TTS with voice, speech rate, opening style, emotion, rhythm, vocal texture, expression, and director prompt. |
| Design Voice | view | Generate a custom voice from a one-sentence description (MiMo-V2.5-TTS-VoiceDesign). Optional auto-optimize sample text. |
| Clone Voice | view | Replicate any voice from an mp3/wav sample (≤10 MB) and read your text aloud (MiMo-V2.5-TTS-VoiceClone). |
| Setup Voice Defaults | view | Save a per-session override for model, voice, rate, style prompt, and Token Plan base URL. |
| Stop Reading | no-view | Stop the current playback immediately. |
| Speed up Reading / Slow Down Reading | no-view | Adjust playback speed by ±0.25× for the next chunk. |
| Reading Status | menu-bar | Show what is playing, current speed, and quick controls. |

## Models

The extension covers the full MiMo-V2.5-TTS series:

| Model ID | Used By | What it does |
| --- | --- | --- |
| `mimo-v2.5-tts` | Quick Read, Read with Voice, TTS Studio | Preset voice synthesis with style controls. |
| `mimo-v2.5-tts-voicedesign` | Design Voice | Generates a custom voice from a 1–4 sentence text description. Supports `optimize_text_preview` to let MiMo auto-rewrite the sample text. |
| `mimo-v2.5-tts-voiceclone` | Clone Voice | Replicates the voice in an mp3/wav sample (≤10 MB after base64) and reads new text in that voice. |
| `mimo-v2-tts` | optional | Legacy V2 voices, available via Setup Voice Defaults. |

## Voices

Built-in voice catalog (MiMo-V2.5-TTS):

- **Default** — MiMo Default (platform-picked)
- **Chinese** — Bingtang (冰糖), Moli (茉莉), Soda (苏打), Baihua (白桦)
- **English** — Mia, Chloe, Milo, Dean

Legacy MiMo-V2 voices are also available when you switch to the older model.

## Style controls (TTS Studio)

The TTS Studio command exposes the full MiMo prompt-engineering surface:

- **Performance Preset** — picks a curated director prompt (e.g., *Suppressed Anger*, *Tearful Smile*).
- **Opening Style** — leading style tags such as gentle / tired / breathy / 唱歌 (overrides others when present).
- **Custom Tags** — comma-separated free-form opening tags.
- **Pace and Rhythm / Emotional State / Vocal Texture / Laughing and Crying** — audio-event tags injected before the text.
- **Director Prompt** — free-form natural-language direction.
- **Speech Rate** — 0.5× to 2.0× in 0.25× steps; also exposed as Speed up / Slow down menu actions and persisted as a global override.

## Long-text playback

Long passages are chunked at sentence/clause boundaries (default 4 KB max per chunk) and synthesized with look-ahead so the next chunk starts decoding while the current one plays. Chunking is byte-aware (UTF-8) and respects English word boundaries.

## Stop semantics

Quick Read uses a single keystroke to start *and* stop. When something is already playing, running Quick Read again terminates the `afplay` process, clears the now-playing state, and shows a stop HUD. The menu-bar status and the dedicated Stop Reading command do the same.

## Permissions

This extension reads selected text and the clipboard (only when triggered by you) and spawns `afplay` to play the synthesized audio. No data is persisted beyond per-session Raycast `LocalStorage` (voice override, speech-rate override, now-playing state).

## Provenance

Originally part of [AI Voice Studio](https://github.com/xwzhangSZU/raycast-ai-voice-studio). This standalone extension extracts the MiMo provider so users who only want MiMo TTS can install a focused, smaller surface.
