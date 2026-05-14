# Gemini TTS for Raycast

Read selected macOS text aloud from Raycast with Gemini text-to-speech, tuned for papers, legal materials, bilingual notes, and long-form listening.

![Gemini TTS icon](assets/command-icon.png)

## Store Status

Submitted to the Raycast Store — review pending. Track progress at [raycast/extensions#27612](https://github.com/raycast/extensions/pull/27612). Until it ships in the Store, install locally with `npm install && npm run dev`.

## Why This Extension

Gemini TTS is not just a voice endpoint. The official TTS guide emphasizes natural-language control over style, accent, pace, tone, audio tags, and transcript structure. This extension turns those Gemini strengths into Raycast controls so daily reading does not require hand-writing prompts.

Functional advantages:

- **Gemini-native director prompts**: every request is wrapped with Audio Profile, Scene, Director's Notes, and Transcript sections.
- **Smart Auto reading mode**: the extension infers whether selected text is professional legal text, English academic prose, Mandarin prose, or mixed Chinese-English material.
- **Research-first bilingual handling**: Chinese stays Chinese, English terms stay English, and TTS is not asked to translate while speaking.
- **Legal Text Mode**: adds guidance for statutes, article numbers, cases, courts, acronyms, citations, and quoted text.
- **Long-text friendly playback**: selections are chunked around readable boundaries so Gemini avoids the long-output drift described in the official limitations.
- **Snappy first audio**: a small lead chunk is synthesized first so playback usually begins in 1-2 seconds; the next chunk is synthesized in parallel with playback so there is no silent gap between chunks.
- **Disk audio cache**: replays, restarts, voice previews, and re-reads of the same paragraph hit a local 200 MB LRU cache and play instantly. Speed changes reuse cached audio because `afplay -r` applies speed at playback time.
- **Smart Academic Pauses**: paragraph breaks can be converted into safe English `[short pause]` audio tags without treating bracketed citations as performance tags.
- **Optional two-speaker dialogue**: when enabled, transcripts with exactly two speaker labels use Gemini's official multi-speaker TTS configuration.
- **Academic voice recommendations**: `Sadaltager`, `Charon`, `Rasalgethi`, and `Iapetus` are highlighted as academic picks in the voice picker.
- **Raycast-native controls**: quick read, stop, resume, restart, speed changes, voice selection, and menu-bar status all stay inside Raycast.

Voice cloning is intentionally not included because the Gemini TTS API currently exposes prebuilt voices rather than a voice-clone endpoint.

## Supported Models

- `gemini-3.1-flash-tts-preview`: default, low-latency current preview model with expressive audio tags.
- `gemini-2.5-flash-preview-tts`: lower-cost fallback model.
- `gemini-2.5-pro-preview-tts`: studio-quality option for long-form or higher-fidelity narration when latency and cost matter less.

These models accept text input and return audio output. Gemini TTS does not expose REST streaming for this workflow, so the extension uses chunked synthesis for faster starts, stop/resume, and more stable long selections.

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
   - **Gemini 3.1 Flash TTS Preview** for the newest low-latency Gemini TTS behavior.
   - **Gemini 2.5 Flash Preview TTS** for lower cost.
   - **Gemini 2.5 Pro Preview TTS** for studio-quality long-form narration.
5. Keep the recommended defaults for academic reading:
   - Reading Experience: **Smart Auto**
   - Language Handling: **Mixed Chinese / English**
   - Expressiveness: **Balanced**
   - Audio Tags: **Smart Academic Pauses**
   - Speaker Mode: **Single Speaker**
   - Voice: **Sadaltager**

## API Key, Quota, and Billing

The Gemini API key is created in **Google AI Studio** and belongs to a Google Cloud project. The key itself does not carry a separate balance; it inherits the quota, billing tier, and billing status of its project.

For this extension:

- Start with the Gemini API **Free Tier** if it is available for your account and region.
- Gemini TTS model access, pricing, and free-tier availability depend on the AI Studio project, region, and model tier.
- If requests fail because quota is exhausted or the free tier is unavailable, open **AI Studio Billing** and set up billing or prepaid credits for the project that owns the API key.
- Google AI Pro / Google One benefits may include AI credits for supported Google products and developer tools, but those benefits are not the same thing as an automatically funded Gemini API key. Check AI Studio **Usage** and **Billing** for the actual API project.

Useful search keywords:

- `Google AI Studio API key`
- `Gemini API billing AI Studio`

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

## Dialogue Mode

Gemini TTS supports multi-speaker audio for transcripts with up to two speakers. This extension keeps **Single Speaker** as the default for papers and legal material, and exposes **Auto Two-Speaker Dialogue** as an opt-in preference.

Use dialogue mode when the selected text already has exactly two clear speaker labels, for example:

```text
Host: Today we are looking at Article 20.
Guest: The hard part is how courts apply it.
```

The first detected label uses the selected Quick Read voice. The second detected label uses **Second Dialogue Voice** (default fallback: `Puck`). If the text has zero, one, or more than two labels, the extension safely falls back to single-speaker narration.

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
- Request config: `responseModalities: ["AUDIO"]` plus either `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` or, for opt-in two-speaker transcripts, `speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs`
- Prompt structure: synthesis preamble + Audio Profile + Scene + Director's Notes + Transcript, all inline in `contents` (the TTS preview models reject `systemInstruction` with HTTP 400)
- Audio response: base64 PCM from Gemini, wrapped into a 24 kHz mono 16-bit WAV file before playback
- Playback: WAV files played through macOS `afplay`
- Playback speed: `afplay -r <speed>` — applied at playback time, so cached audio is reusable across speed changes
- Audio cache: SHA-256 over `(text, voice, model, language, experience, expressiveness, audio-tag mode, speaker mode, second voice, director notes, sample rate)` plus a cache version. LRU sweep at 200 MB inside `environment.supportPath/audio-cache/`. Clear from the menu-bar **Audio Cache** row.
- Pipeline: chunk N+1 begins synthesis while chunk N plays. Lead chunk (~60-260 chars) is carved at the nearest sentence boundary so first-audio latency is bounded by a small synthesis instead of a full chunk.
- Cancellation: Stop, Quick Read toggle-stop, voice switching, and preview switching abort in-flight Gemini requests so stale synthesis does not keep the reader locked or spend quota after playback is stopped.
- Reading state: the most recent text, chunks, progress, and TTS options are stored in Raycast local storage
- Stop semantics: PID file in `$TMPDIR/gemini-tts.pid` for active `afplay`; session lock in `$TMPDIR/gemini-tts.session.lock` covers the synthesis-only window before the first `afplay` is launched, so a Quick Read trigger during the lead chunk's synthesis still toggle-stops the running session.

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
- [Gemini 2.5 Flash TTS](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-preview-tts)
- [Gemini 2.5 Pro TTS](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro-preview-tts)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Raycast Extension Docs](https://developers.raycast.com/)
