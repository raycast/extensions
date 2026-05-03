# Gemini TTS Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Reading

- Quick Read: select text and read aloud with one command.
- Clipboard fallback when selected text is unavailable.
- Resume Last Reading and Restart Last Reading commands.
- Chunk-level reading progress for medium-length text.
- Cross-command playback control via PID file.
- Speed up Reading and Slow Down Reading commands adjust active or paused readings by 0.25x for the next synthesized segment.
- Persistent reading-status menu-bar item with Stop / Resume / Restart / Speed Up / Slow Down / Read / Pick Voice controls.

### Gemini TTS

- Direct Gemini REST API integration with `x-goog-api-key` authentication.
- Supports `gemini-3.1-flash-tts-preview`.
- Supports `gemini-2.5-flash-preview-tts`.
- Wraps Gemini's base64 PCM response into a 24 kHz mono WAV file for `afplay`.
- Retries transient Gemini TTS failures, including occasional text-instead-of-audio responses.
- Reading Experience presets that generate Gemini-friendly Audio Profile, Scene, Director's Notes, and Transcript prompts.
- Smart Auto Reading Experience that infers Legal Scholar, English Paper Reader, Mandarin Lecture, or Bilingual Academic Reader from selected text.
- Expressiveness preference for subtle, balanced, or expressive delivery.
- Audio Tags preference for Smart Academic Pauses, exact text, respecting existing tags, or adding paragraph pauses.
- Custom Director Notes for advanced tone, accent, pacing, pronunciation, or role guidance.
- Language Handling preference for auto, Mandarin, English, or mixed Chinese/English reading.

### Voices

- Read with Voice Selection: browse Gemini's 30 prebuilt TTS voices.
- Select Quick Read Voice: choose and preview the voice used by Quick Read.
- Default academic-listening voice: `Sadaltager`.
- Voice picker marks `Sadaltager`, `Charon`, `Rasalgethi`, and `Iapetus` as Academic Pick.
- Voice preview and ad-hoc reading both survive view dismissal.

### Removed

- Removed MiniMax authentication modes, regions, models, language boost, custom voice IDs, and voice clone workflow.
