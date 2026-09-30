# Gemini TTS Changelog

## [Initial Version] - 2026-05-27

### Reading

- Quick Read: select text and read aloud with one command.
- Clipboard fallback when selected text is unavailable.
- Resume Last Reading and Restart Last Reading commands.
- Chunk-level reading progress for medium-length text.
- Cross-command playback control via PID file.
- Speed up Reading and Slow Down Reading commands adjust active or paused readings by 0.25x for the next synthesized segment.
- Persistent reading-status menu-bar item with Stop / Resume / Restart / Speed / Slow / Read / Pick Voice controls.

### Performance

- Lead-chunk synthesis: the first audio segment is intentionally short (~60-260 chars at the nearest sentence boundary) so playback starts in roughly 1-2 seconds instead of waiting for a full 1400-char chunk.
- Producer/consumer pipeline: chunk N+1 begins synthesizing in parallel with playback of chunk N, eliminating the silent gap between chunks.
- Disk audio cache keyed on text + voice + experience preset: replays, restarts, voice previews, and re-reads of the same paragraph become instant, with an LRU sweep capped at 200 MB inside the extension's support directory.
- Menu-bar status refreshes within ~1 second of a phase transition via background `launchCommand`, instead of waiting for the 1-minute interval tick.
- Stop, voice switching, and preview switching now abort in-flight Gemini synthesis requests instead of waiting for stale network calls to finish.

### Fixes

- Session lock prevents two readings from running in parallel: a Quick Read trigger that lands during the lead chunk's synthesis (before any `afplay` process exists) now stops the running session cleanly instead of starting a parallel reader.
- Voice preview now writes playback state, so the menu bar reflects in-progress previews and Stop Reading interrupts them at the next chunk boundary.
- Menu-bar status no longer fires a redundant background launch on every elapsed-time tick — only on actual synthesizing/playing/stopped/completed transitions.
- Quick Read's "Nothing to read" hint now points users at Resume only when a paused reading actually exists, instead of advertising a non-existent option.
- Reverted the `systemInstruction` split: Gemini's TTS preview models reject it with `HTTP 400 — Developer instruction is not enabled for this model`. The director profile is back inline in `contents`. Verified directly against `gemini-3.1-flash-tts-preview` (HTTP 200, audio returned).
- Invalid stored voice preferences fall back to the built-in default voice before hitting the Gemini API.
- Resume Last Reading now reports when the previous text is already complete instead of silently restarting from the beginning.
- Restart Last Reading and Resume Last Reading wait for the previous session to release its lock before clearing the stop signal, so retriggering during lead-chunk synthesis stops the old reading instead of silently failing with a lock-contention toast.
- Session lock and stop-poll interval always release in a `finally` block, so a transient failure during reading startup can no longer leak the lock and block all subsequent readings.
- Transient `fetch` network errors (DNS hiccups, ECONNRESET, dropped TLS sockets) are now retried alongside HTTP 429/5xx, so a single packet loss during a long reading no longer aborts the session.

### Menu Bar

- Audio Cache row shows current cache size and entry count; click clears all cached audio (a fresh re-synth will repopulate as you read).

### Gemini TTS

- Direct Gemini REST API integration with `x-goog-api-key` authentication.
- Supports `gemini-3.1-flash-tts-preview`.
- Supports `gemini-2.5-flash-preview-tts`.
- Supports `gemini-2.5-pro-preview-tts`.
- Wraps Gemini's base64 PCM response into a 24 kHz mono WAV file for `afplay`.
- Retries transient Gemini TTS failures, including occasional text-instead-of-audio responses.
- Reading Experience presets that generate Gemini-friendly Audio Profile, Scene, Director's Notes, and Transcript prompts.
- Smart Auto Reading Experience that infers Legal Text Mode, English Paper Reader, Mandarin Lecture, or Bilingual Academic Reader from selected text.
- Optional Auto Two-Speaker Dialogue mode uses Gemini `multiSpeakerVoiceConfig` when the selected text contains exactly two speaker labels.
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
