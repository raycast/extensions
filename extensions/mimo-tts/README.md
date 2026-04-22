# MiMo TTS

Create expressive speech with Xiaomi MiMo TTS, directly from Raycast.

MiMo TTS is built for people who want more than plain text reading. It uses Xiaomi MiMo's speech synthesis API and exposes Raycast-native controls for voice, speaking style, rhythm, emotion, speech texture, and pace. The goal is simple: type, paste, or select text, choose how it should be performed, and listen without leaving your current workflow.

## Why MiMo

### Broad AI Ecosystem

Xiaomi MiMo is part of a fast-growing AI model ecosystem. The official MiMo documentation lists support for mainstream agent and coding tools, including OpenCode, OpenClaw, Claude Code, Cline, Kilo Code, Roo Code, Codex, Cherry Studio, Zed, and Qwen Code. Xiaomi has also announced an official Hermes Agent integration, positioning MiMo as a practical model family for serious agent workflows.

For Raycast users, that matters because MiMo is not an isolated TTS endpoint. It belongs to a broader model platform with OpenAI-compatible access, Token Plan credentials, and a tool ecosystem designed for frequent daily use.

### Expressive TTS Quality

MiMo-V2.5-TTS supports natural and fluent speech synthesis with built-in Chinese and English voices. This extension focuses on making those expressive capabilities easy to use from Raycast:

- read selected text immediately with a default voice;
- browse and preview MiMo built-in voices;
- keep long text readable through chunked playback;
- stop playback from any command;
- request WAV audio and play it locally with macOS audio tools.

The largest difference from a basic TTS extension is control. Instead of only sending text to be read aloud, MiMo TTS can send natural-language performance direction to the model. You can ask for a warmer tone, a slower narration pace, a tense whisper, a more energetic delivery, or a tired but gentle reading style.

### Deep Performance Control

Xiaomi's MiMo-V2.5-TTS documentation supports two control paths, and this extension uses both:

- **Natural-language control** is sent as a `user` message. It adjusts tone, pacing, emotion, and performance style without becoming part of the spoken text.
- **Audio tag control** is inserted into the `assistant` message with the target text. It can guide rhythm, emotion, voice texture, laughter, breath, pauses, and other speech events.

The **MiMo Studio** command turns those capabilities into a Raycast form that does not require a text selection. You can type or paste text, load the current selection, then preset speech rate, opening style tags, rhythm events, emotion states, voice features, expressive tags, and director-style prompts before synthesis starts. This is the core advantage of the extension: it treats TTS as performance direction, not just plain playback.

## Features

- **Quick Read**: select text anywhere, run the command, and listen immediately.
- **Read with Voice**: browse MiMo voices, inspect voice details, and read with the selected voice.
- **MiMo Studio**: compose speech from typed, pasted, or selected text with speaking rate, style tags, rhythm events, emotion states, voice texture, expressive tags, and director prompts.
- **Natural Style Prompt**: define reusable tone and pacing guidance in preferences.
- **Voice Preview**: audition voices before setting the default Quick Read voice.
- **Chunked Playback**: synthesize long selections in smaller chunks and play them sequentially.
- **Global Stop**: stop the current playback from the dedicated Stop Reading command.

## Commands

| Command | Purpose |
| --- | --- |
| Quick Read Selected Text | Read the current text selection with the default voice. Run again to stop current playback. |
| Read with Voice | Browse voices, inspect details, and read the current selection with a chosen voice. |
| MiMo Studio | Type, paste, or load selected text, then tune speech rate, style tags, audio events, mixed emotions, voice texture, and director-mode instructions. |
| Select Quick Read Voice | Preview and save the voice used by Quick Read. |
| Stop Reading | Stop the active playback process. |

## Setup

1. Subscribe to Xiaomi MiMo Token Plan and open the [Subscription](https://platform.xiaomimimo.com/#/console/plan-manage) page.
2. Open Raycast extension preferences for **MiMo TTS**.
3. Fill **Token Plan API Key** with your `tp-...` key.
4. Keep **Token Plan Base URL** as `https://token-plan-cn.xiaomimimo.com/v1`, or replace it with the Singapore/Europe URL shown on your subscription page.
5. Keep **MiMo-V2.5-TTS** unless you need the legacy MiMo-V2 voices.
6. Optionally set a default voice, speech rate guidance, and speaking style.

## Preferences

| Preference | Description |
| --- | --- |
| Token Plan API Key | Sent as the `api-key` header. Token Plan keys start with `tp-` and cannot be mixed with pay-as-you-go `sk-` keys. |
| Token Plan Base URL | OpenAI-compatible Token Plan base URL. Defaults to `https://token-plan-cn.xiaomimimo.com/v1`; change it if your subscription page shows another cluster. |
| TTS Model | `mimo-v2.5-tts` by default; `mimo-v2-tts` is available for legacy voices. |
| Default Voice | Voice used by Quick Read unless overridden in Select Quick Read Voice. |
| Speech Rate | Converted into a natural-language speed instruction for MiMo. |
| Speaking Style | Optional free-form direction sent as the `user` message. |

## Implementation Notes

- API transport: `POST {Token Plan Base URL}/chat/completions`.
- The extension uses Xiaomi MiMo Token Plan credentials: `tp-...` API Key plus the Token Plan OpenAI-compatible Base URL.
- The text to synthesize is sent as an `assistant` message, per MiMo's TTS rules.
- Optional natural-language style direction is sent as a `user` message.
- In **MiMo Studio**, opening style tags are injected as `(tag1 tag2)` and audio-event tags as `（tag1，tag2）` at the beginning of each synthesized chunk.
- Natural presets and director prompts are sent as `user` messages; selected audio tags are sent inside the `assistant` text.
- If `singing` is selected, the extension forces the singing tag to be the only opening tag so it remains at the very beginning.
- The extension requests WAV audio and plays the returned base64 data through `afplay`.
- Stop control uses a shared PID file at `$TMPDIR/mimo-tts.pid`.

## References

- [Speech synthesis (MiMo-V2.5-TTS Series)](https://platform.xiaomimimo.com/static/docs/usage-guide/speech-synthesis-v2.5.md)
- [Token Plan Quick Access](https://platform.xiaomimimo.com/static/docs/tokenplan/quick-access.md)
- [MiMo Agent Tool Integrations](https://platform.xiaomimimo.com/static/docs/integration/tools-overview.md)
- [MiMo Hermes Agent Integration](https://platform.xiaomimimo.com/static/docs/news/hermes-free.md)
