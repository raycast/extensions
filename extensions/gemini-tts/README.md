# Gemini TTS for Raycast

Read selected macOS text aloud from Raycast with Gemini text-to-speech, tuned for papers, legal materials, bilingual notes, and long-form listening.

![Gemini TTS icon](assets/command-icon.png)

## Why This Extension

Gemini TTS is not just a voice endpoint. The official TTS guide emphasizes natural-language control over style, accent, pace, tone, audio tags, and transcript structure. This extension turns those Gemini strengths into Raycast controls so daily reading does not require hand-writing prompts.

Functional advantages:

- **Gemini-native director prompts**: every request is wrapped with Audio Profile, Scene, Director's Notes, and Transcript sections.
- **Smart Auto reading mode**: the extension infers whether selected text is professional legal text, English academic prose, Mandarin prose, or mixed Chinese-English material.
- **Research-first bilingual handling**: Chinese stays Chinese, English terms stay English, and TTS is not asked to translate while speaking.
- **Legal Text Mode**: adds guidance for statutes, article numbers, cases, courts, acronyms, citations, and quoted text.
- **Long-text friendly playback**: selections are chunked around readable boundaries so Gemini avoids the long-output drift described in the official limitations.
- **Smart Academic Pauses**: paragraph breaks can be converted into safe English `[short pause]` audio tags without treating bracketed citations as performance tags.
- **Academic voice recommendations**: `Sadaltager`, `Charon`, `Rasalgethi`, and `Iapetus` are highlighted as academic picks in the voice picker.
- **Raycast-native controls**: quick read, stop, resume, restart, speed changes, voice selection, and menu-bar status all stay inside Raycast.

Voice cloning is intentionally not included because the Gemini TTS API currently exposes prebuilt voices rather than a voice-clone endpoint.

## Supported Models

- `gemini-3.1-flash-tts-preview`: default, higher-quality current preview model.
- `gemini-2.5-flash-preview-tts`: lower-cost fallback model.

Both models accept text input and return audio output. Gemini TTS does not support streaming, so the extension uses chunked synthesis for faster starts, stop/resume, and more stable long selections.

## Commands

- **Quick Read Selected Text**: read selected text, or clipboard text if no selection is available. Trigger again to stop.
- **Read with Voice Selection**: browse Gemini's 30 prebuilt voices and read the current selection.
- **Select Quick Read Voice**: choose and preview the voice used by Quick Read.
- **Resume Last Reading**: continue from the next unfinished chunk.
- **Restart Last Reading**: replay the last text from the beginning.
- **Stop Reading**: stop active playback while preserving paused reading state.
- **Speed up Reading / Slow Down Reading**: adjust playback by 0.25x for the next segment.
- **Reading Status**: menu-bar controller with Stop, Resume, Restart, Speed, Read, and Pick Voice actions.

## Setup

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Run the extension in Raycast and open extension preferences.
3. Set **Gemini API Key**.
4. Choose a model:
   - **Gemini 3.1 Flash TTS Preview** for the newest Gemini TTS behavior.
   - **Gemini 2.5 Flash Preview TTS** for lower cost.
5. Keep the recommended defaults for academic reading:
   - Reading Experience: **Smart Auto**
   - Language Handling: **Mixed Chinese / English**
   - Expressiveness: **Balanced**
   - Audio Tags: **Smart Academic Pauses**
   - Voice: **Sadaltager**

## Reading Experience

**Smart Auto** is the default. It does not rewrite, translate, or summarize the selected text. It only chooses the director preset before sending the transcript to Gemini TTS.

Smart Auto routing:

- Legal signals -> **Legal Text Mode**
- Mostly English text -> **English Paper Reader**
- Mostly Chinese text -> **Mandarin Lecture**
- Mixed academic text -> **Bilingual Academic Reader**

Available manual presets:

- **Bilingual Academic Reader**: Chinese-English papers, research notes, and mixed-language material.
- **Legal Text Mode**: statutes, cases, citations, doctrinal analysis, and professional legal prose.
- **Mandarin Lecture**: Chinese academic notes and long-form Mandarin prose.
- **English Paper Reader**: English papers, reports, and technical material.
- **News Briefing**: updates, newsletters, and policy briefs.
- **Longform Audiobook**: essays, books, and reflective prose.
- **Neutral Recitation**: direct, low-style reading.

## Language Handling

Gemini TTS detects input language automatically; there is no separate `language_boost` API parameter. This extension therefore uses prompt guidance instead of hidden language switches.

Best practice:

- Keep Chinese text in Chinese.
- Keep English terms, author names, acronyms, citations, and quotations as written.
- Do not ask TTS to translate while speaking. Translate or rewrite with another model first, then read the final transcript.

Preference options:

- **Mixed Chinese / English**: Chinese is read as Mandarin and embedded English stays English.
- **Mandarin Chinese**: stronger standard Mandarin guidance.
- **English**: stronger English delivery guidance.
- **Auto Detect**: lets Gemini infer language mostly from the transcript.

## Audio Tags

Gemini supports English inline audio tags such as `[short pause]`, `[serious]`, `[slowly]`, and `[whispers]`. The official guide recommends English tags even when the transcript is not English.

This extension exposes that as a preference:

- **Smart Academic Pauses**: default; inserts `[short pause]` between paragraphs for long papers and essays.
- **Off (Exact Text)**: sends the transcript literally.
- **Respect Existing Tags**: use when you manually add Gemini-style performance tags.
- **Add Paragraph Pauses**: always inserts paragraph pause tags.

The prompt explicitly tells Gemini that bracketed citations, footnote markers, and legal references remain content unless they are clear performance tags.

## Voice Recommendations

Academic picks:

- `Sadaltager`: knowledgeable, default in this extension.
- `Charon`: informative.
- `Rasalgethi`: informative.
- `Iapetus`: clear.

Other useful long-listening voices:

- `Erinome`: clear.
- `Schedar`: even.
- `Sulafat`: warm.
- `Vindemiatrix`: gentle.

More expressive voices:

- `Puck`: upbeat.
- `Achird`: friendly.
- `Aoede`: breezy.
- `Fenrir`: excitable.
- `Leda`: youthful.
- `Gacrux`: mature.

## Usage

Quick Read:

1. Select text in any macOS app.
2. Run **Quick Read Selected Text** in Raycast.
3. If no text is selected, the command reads clipboard text.
4. Trigger the command again, or run **Stop Reading**, to stop playback.

Choose a voice:

1. Run **Read with Voice Selection**.
2. Pick a Gemini voice to read the current selection.
3. Use **Set as Quick Read Voice** to make it the default for Quick Read.

Manage long readings:

- **Resume Last Reading** continues from the next unfinished chunk.
- **Restart Last Reading** starts again from chunk one.
- **Speed up Reading** and **Slow Down Reading** change playback speed from 0.5x to 2.0x.
- **Reading Status** keeps controls available from the menu bar.

## Technical Notes

- API: Gemini REST `POST /v1beta/models/{model}:generateContent`
- Authentication: `x-goog-api-key: <Gemini API Key>`
- Request config: `responseModalities: ["AUDIO"]` plus `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`
- Prompt structure: Audio Profile, Scene, Director's Notes, and Transcript
- Audio response: base64 PCM from Gemini, wrapped into a 24 kHz mono 16-bit WAV file before playback
- Playback: temporary WAV files played through macOS `afplay`
- Playback speed: `afplay -r <speed>`
- Reading state: the most recent text, chunks, progress, and TTS options are stored in Raycast local storage
- Playback stop: PID file in `$TMPDIR/gemini-tts.pid`

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## References

- [Gemini Text-to-Speech Guide](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini 3.1 Flash TTS Preview](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-tts-preview)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Raycast Extension Docs](https://developers.raycast.com/)
