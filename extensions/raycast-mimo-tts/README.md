# MiMo TTS for Raycast

> **State-of-the-art Chinese & English TTS — directly from your keyboard, 100% free during the public beta.**

Read any selected or clipboard text aloud, design a brand-new voice from a single sentence, or clone any voice from a 10-second sample — without leaving Raycast.

---

## Why this extension

### 🆓 Free during MiMo's public beta — all four TTS models, no token meter

Xiaomi's MiMo platform launched **MiMo-V2.5-TTS Series + V2.5-ASR** as a single full-stack speech suite, and the entire TTS family is currently **limited-time free** on their billing page:

| Model                       | What it does                                          | Beta price |
| --------------------------- | ----------------------------------------------------- | ---------- |
| `mimo-v2.5-tts`             | Preset-voice synthesis with full style control        | **Free**   |
| `mimo-v2.5-tts-voicedesign` | Generate a new voice from one sentence of description | **Free**   |
| `mimo-v2.5-tts-voiceclone`  | Clone any voice from a small mp3/wav sample           | **Free**   |
| `mimo-v2-tts`               | Legacy voices                                         | **Free**   |

(Source: [platform.xiaomimimo.com/docs/zh-CN/price/pay-as-you-go](https://platform.xiaomimimo.com/docs/zh-CN/price/pay-as-you-go), as of 2026-05-27)

If you've been priced out of OpenAI Speech, ElevenLabs, or Azure Neural TTS for long-form reading or scripted character work, **MiMo is the cheapest path to top-tier TTS today**.

### 🚀 V2.5 series just got dramatically cheaper (effective 2026-05-27)

On **27 May 2026**, Xiaomi shipped a permanent price cut across the MiMo-V2.5 LLM line — **up to 99% off**, with Token Plan quotas multiplied by **5–8×** at the same price, plus a full credit reset for existing subscribers. ([Announcement](https://platform.xiaomimimo.com/docs/zh-CN/news/v2.5-price-update)) Even after the TTS free beta ends, the underlying inference stack and billing engine just got a generational cost reduction. SGLang HiCache with SWA dropped KV-cache traffic to **~1/7** and cacheable tokens up **~5×** — so unit cost is structurally lower, not just promotional.

### 🎭 Top-tier model capability, three creation modes

MiMo-V2.5-TTS is positioned by Xiaomi as a model that "doesn't just read — it _performs_." All three creation modes share the same instruction-following surface:

- **Director-style natural-language control** — write a one-line tone hint or a full director's brief (character / scene / direction). The model interprets pacing, breath, restraint, emotional arc.
- **Inline audio tags** — drop `(轻笑)`, `(深呼吸)`, `(粤语)`, `(唱歌)`, `(suppressed anger)` mid-text for surgical control. Mix Chinese and English tags. Singing mode included.
- **Plain-text emotional reading** — even without any prompt, the model picks up punctuation, sentence rhythm, and implied speaker identity (age, persona, mood).

### 🌏 Bilingual by design — Chinese **and** English, both native quality

Most "Chinese TTS" services are awful at English; most "English TTS" services give you mechanical Mandarin. MiMo trains both at native quality:

- 4 Chinese preset voices: 冰糖 (clear female), 茉莉 (soft female), 苏打 (bright male), 白桦 (steady male).
- 4 English preset voices: Mia, Chloe, Milo, Dean.
- Dialect tags: 东北话 / 四川话 / 河南话 / 粤语 / 台湾腔.
- Cross-lingual voice clone: clone a voice from a Chinese sample, read English in the same voice (and vice versa).

### 🎙 Voice Design — one sentence becomes a voice

Type a 1–4 sentence description and get a brand new voice synthesized on the spot:

> _"A weathered Northern Chinese grandfather, slow and steady pace, slightly raspy and time-worn, like he's telling old stories."_

Optional `optimize_text_preview` flag lets the model auto-rewrite your sample text to match the persona — you can submit with an empty text body and MiMo writes the script for you. Other commercial TTS services charge you per generated voice ID; here it's one HTTP call.

### 🪄 Voice Clone — mp3/wav in, _your_ voice out

Drop in any mp3 or wav (≤10 MB after base64). MiMo replicates the timbre **and** the cloned voice keeps the full control surface: director prompts, inline tags, dialect switching, singing mode. No upload step, no separate voice-management dashboard — each clone is a one-shot inline call.

### ⚡ Built for daily, long-form reading

- **Chunked long-text playback** — sentence- and clause-aware splitter (UTF-8 byte-safe, English word boundary aware), 4 KB per chunk.
- **Look-ahead synthesis** — the next chunk starts decoding while the current one plays; no audible gap.
- **Global speed override** (0.5×–2.0× in 0.25× steps) is one keystroke and persists across every command.
- **Cross-command stop** — Quick Read is a single keystroke that starts _and_ stops; menu-bar status and dedicated commands all hook the same `afplay` PID.

---

## Install

This extension is published on the Raycast Store as **MiMo TTS**. Search for it in Raycast → Store, then:

1. Get a **MiMo Token Plan API key** (`tp-...`) from <https://platform.xiaomimimo.com/>. (Pay-as-you-go `sk-` keys go to a different endpoint and are not used by this extension.)
2. Paste it into Raycast Preferences → Extensions → **MiMo TTS** → _MiMo Token Plan API Key_.
3. (Optional) Run **Setup Voice Defaults** to pick your default voice, model, baseline speed, and a project-wide style prompt.

---

## Commands

| Command                                  | Mode     | What it does                                                                                                                                                   |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quick Read**                           | no-view  | Read selected or clipboard text with your default voice. Trigger again to stop.                                                                                |
| **Read with Voice**                      | view     | Browse voices and read selection / clipboard with the chosen one.                                                                                              |
| **Set Quick Read Voice**                 | view     | Pick and preview the voice that Quick Read uses.                                                                                                               |
| **TTS Studio**                           | view     | Long-form composer with voice, speed, opening style, emotion / rhythm / vocal-texture / expression tags, performance presets, and a free-form director prompt. |
| **Design Voice**                         | view     | Generate a brand-new voice from a one-sentence description (MiMo-V2.5-TTS-VoiceDesign).                                                                        |
| **Clone Voice**                          | view     | Replicate any voice from an mp3/wav file (MiMo-V2.5-TTS-VoiceClone).                                                                                           |
| **Setup Voice Defaults**                 | view     | Persist a per-session override for model / voice / rate / style prompt / Token Plan base URL.                                                                  |
| **Stop Reading**                         | no-view  | Stop the current playback immediately.                                                                                                                         |
| **Speed up Reading / Slow Down Reading** | no-view  | Adjust playback speed by ±0.25× for the next chunk; persists globally.                                                                                         |
| **Reading Status**                       | menu-bar | Now-playing status with playback / speed controls.                                                                                                             |

---

## TTS Studio — the full style-control surface

The TTS Studio command exposes everything MiMo-V2.5-TTS supports:

- **Performance Preset** — curated director briefs: _Suppressed Anger_, _Tearful Smile_, _Gentle but Tired_, _Gentleness Amid Frenzy_, _Narration → Whisper → Roar_, …
- **Opening Style** — leading style tags (gentle, magnetic, ethereal, husky, …; `唱歌` overrides others to enter singing mode).
- **Custom Tags** — comma-separated free-form opening tags.
- **Pace and Rhythm** — 吸气 / 深呼吸 / 叹气 / 长叹一口气 / 喘息 / 屏息 / 沉默片刻 / 语速加快 / 放慢语速 / 提高音量喊话 / 小声 / …
- **Emotional State** — base emotions, compound emotions, and mixed states (压抑的愤怒, 带着哽咽的笑意, 温柔但疲惫, 狂躁中的温柔, …).
- **Vocal Texture** — 颤抖 / 声音颤抖 / 变调 / 破音 / 鼻音 / 气声 / 沙哑 / 哽咽.
- **Laughing and Crying** — 笑 / 轻笑 / 大笑 / 冷笑 / 抽泣 / 呜咽 / 哽咽 / 嚎啕大哭.
- **Director Prompt** — free-form natural-language direction, free-text and arbitrary length.
- **Speech Rate** — 0.5× to 2.0× in 0.25× steps; also exposed as menu-bar / Speed up / Slow Down actions and shared as a global override.

---

## Models — full coverage

| Model ID                    | Used by                                                          | What it does                                                                        |
| --------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `mimo-v2.5-tts`             | Quick Read · Read with Voice · Set Quick Read Voice · TTS Studio | Preset voices with style controls.                                                  |
| `mimo-v2.5-tts-voicedesign` | Design Voice                                                     | Generate a voice from a 1–4 sentence description. Optional `optimize_text_preview`. |
| `mimo-v2.5-tts-voiceclone`  | Clone Voice                                                      | Replicate a voice from a base64-encoded mp3/wav (≤10 MB).                           |
| `mimo-v2-tts`               | optional, via Setup Voice Defaults                               | Legacy V2 voices.                                                                   |

---

## Stop semantics & cross-extension safety

Quick Read uses **one keystroke to start _and_ stop**. When something is already playing, running Quick Read again terminates the `afplay` process, clears the now-playing state, and shows a stop HUD. The menu-bar status, dedicated Stop Reading command, and `cmd+.` from any view command all trigger the same stop path.

Cross-extension PID isolation: this extension uses `raycast-mimo-tts.pid` / `.stop` in `tmpdir` so it doesn't fight my multi-provider [AI Voice Studio](https://github.com/xwzhangSZU/raycast-ai-voice-studio) extension over the same `afplay` process.

---

## Permissions & privacy

The extension reads selected text and the clipboard only when **you** trigger a command. Synthesized audio plays via the system `afplay` binary. No data is persisted beyond per-session Raycast `LocalStorage` (voice override, speech-rate override, now-playing state). The API key never leaves Raycast Preferences. Voice-clone samples are sent inline to MiMo's endpoint for that single request — no upload service is used and nothing is cached server-side per their docs.

---

## Provenance

Originally part of [AI Voice Studio](https://github.com/xwzhangSZU/raycast-ai-voice-studio), a multi-provider Raycast TTS extension covering Qwen-TTS, MiniMax, MiMo, and OpenAI. This standalone version extracts the MiMo provider so users who only want MiMo TTS get a focused, smaller surface — no Qwen / MiniMax / OpenAI code paths.

Open source on GitHub: <https://github.com/xwzhangSZU/Raycast-Mimo-TTS>.

---

## References

- MiMo V2.5-TTS release notes: <https://platform.xiaomimimo.com/docs/zh-CN/news/v2.5-tts-release>
- V2.5 series price update (2026-05-27, up to 99% off LLMs, Token Plan 5–8× quotas): <https://platform.xiaomimimo.com/docs/zh-CN/news/v2.5-price-update>
- MiMo-V2.5-TTS API spec: <https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/speech-synthesis-v2.5>
- Pay-as-you-go pricing (showing TTS series listed as 限时免费 / free during beta): <https://platform.xiaomimimo.com/docs/zh-CN/price/pay-as-you-go>
- MiMo on Hugging Face: <https://huggingface.co/XiaomiMiMo>
