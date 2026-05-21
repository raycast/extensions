# AI Voice Studio Changelog

## [Unreleased]

### Changed
- Renamed the extension from `MiniMax TTS` to `AI Voice Studio`.
- Renamed the package slug from `minimax-tts` to `ai-voice-studio`.
- Kept Raycast Preferences focused on provider API keys instead of repeating provider tuning controls in every command sidebar.
- Moved MiniMax, MiMo, and OpenAI model/voice/speed/style/format defaults into a focused in-extension setup form.
- Updated `Setup Voice Defaults` so MiniMax, MiMo, and OpenAI common settings live in the in-extension setup flow, while MiniMax auth mode, region, custom voices, MiMo base URL, and OpenAI format/instructions stay outside the Preferences sidebar.
- Changed `Setup Voice Defaults` into a focused provider panel: users choose the default provider at the top, configure only one provider's fields at a time, and provider-specific commands open setup directly on MiniMax, MiMo, or OpenAI.
- Scoped the cross-command audio PID and stop files to `ai-voice-studio` and clear stale stop markers at command start.

### Fixed
- Build output is now cleaned before `ray build`, preventing stale deleted command artifacts from lingering in `dist`.
- Stop Reading now also stops MiniMax while it is still synthesizing a chunk, aborts the in-flight fetch when possible, and prevents long readings from continuing into the next segment after a stop request.
- Stopping MiniMax during chunk playback no longer advances the saved reading position, so Resume Last Reading does not skip partially played text.
- Resume Last Reading and Restart Last Reading now let an existing MiniMax run observe the stop request before the new run clears the marker and takes over.
- MiniMax long-form reading now starts synthesizing the next chunk while the current chunk is playing, reducing inter-chunk gaps while preserving stop/cancel behavior and discarding stale lookahead audio after speed changes or stop requests.
- Read with MiniMax Voice now uses the shared MiniMax reading runner, so manual voice playback gets the same lookahead, stop, speed, and resume-state safeguards as Quick Read.
- MiMo and OpenAI lookahead playback now have explicit stop-path verification so prepared next chunks are not played after a stop request.
- Audio playback now ignores stale stop markers from earlier runs when deciding whether an `afplay` failure was user-initiated.
- Shared MiMo/OpenAI speed commands now use a stable 1.0x fallback when no speed override exists, avoiding misleading reads from isolated command preferences.
- Test Voice Setup now reports slow synthesis/playback paths as a warning state instead of a silent success.

### Added
- Added Xiaomi MiMo as a second TTS provider.
- Added MiMo commands: TTS Studio, Quick Read with MiMo, Read with MiMo Voice, Set MiMo Quick Read Voice, and MiMo Reading Status.
- Added MiMo provider files for API calls, voices, expressive controls, chunking, status, voice override storage, and lookahead playback.
- Added MiMo extension icons.
- Added OpenAI as a third TTS provider through the Speech API.
- Added OpenAI commands: Quick Read with OpenAI, Read with OpenAI Voice, and Set OpenAI Quick Read Voice.
- Added OpenAI provider files for API calls, voices, chunking, status, voice override storage, and lookahead playback.
- Extended the shared audio player to support WAV playback, playback-rate arguments, and abort signals.
- Added `Setup Voice Defaults` plus setup actions inside TTS Studio, voice pickers, clone, read, and menu-bar commands.
- Added `Test Voice Setup` for a one-command real-provider smoke test that plays a short sample and reports synthesis latency plus returned audio size.
- Added `npm run verify:runtime` for local checks covering command entry points, provider routing, provider API contracts, stop semantics, lookahead playback, and chunk limits.
- Added `npm run verify:provider-settings` for dynamic checks that invalid preferences fall back safely, valid provider settings survive, text fields are trimmed, and quick setup overrides take precedence/reset cleanly.
- Added `npm run verify:provider-env` for dynamic checks that provider `.env` loading ignores live flags, respects allowlisted variables, and redacts secrets.
- Added `npm run verify:fast-paths` for dynamic local checks of chunk limits and speed parsing/clamping without calling provider APIs.
- Added `npm run verify:provider-contracts` for mock-fetch TTS checks of MiniMax, MiMo, and OpenAI request construction, audio decoding, API errors, and cancellation.
- Added `npm run verify:live-smoke-guardrails` for a no-network dynamic check that live smoke uses setup overrides for MiniMax, MiMo, and OpenAI, returns mocked provider audio, exercises mocked `AudioPlayer` playback, reports latency, and redacts provider keys on success and failure.
- Added `npm run verify:pipeline-lookahead` for dynamic checks that MiniMax, MiMo, and OpenAI start synthesizing the next chunk before current playback begins.
- Added `npm run verify:audio-player` with a fake `afplay` for playback arguments, temp-file cleanup, PID cleanup, empty audio rejection, stale stop-marker rejection, and fresh stop-marker graceful-stop behavior.
- Added `npm run verify:local-playback` for a real silent-WAV `afplay` smoke test through the shared audio wrapper.
- Added `npm run verify:live-env` to report provider-key readiness without printing secrets or calling provider APIs.
- Added `npm run verify:goal` to run a completion-audit checklist and exit non-zero until local checks, local playback, provider-key readiness, and real live smoke are all satisfied.
- Updated `verify:goal` to consume fresh direct-run evidence for `npm run verify` and `npm run verify:local-playback`, avoiding false failures from Raycast lint network checks or macOS `afplay` when launched from a nested Node parent process.
- Added `MINIMAX_API_KEY` as a legacy MiniMax env alias for live-env/live-smoke checks, mapped to the HD-compatible MiniMax route when no specific MiniMax key is present.
- Added opt-in `npm run verify:live-smoke` for real provider smoke tests using shell or `.env` provider keys, explicit playback, latency limits, and temporary-audio cleanup.
- Updated `verify:live-smoke` so it exercises the same focused setup override layer as `Setup Voice Defaults` before calling provider APIs.
- Updated `verify:live-smoke` playback so real returned audio goes through the shared `AudioPlayer` wrapper when `AI_VOICE_STUDIO_PLAY=1`.
- Updated `verify:live-smoke` to report synthesis, playback, and total elapsed time, and to fail if the end-to-end smoke path exceeds the configured latency limit.
- Fixed `verify:live-smoke` temp-audio cleanup so playback failures and timeouts do not leave `ai-voice-studio-live-*` files behind.
- Added `npm run verify` as a one-command local verification bundle for runtime checks, dynamic fast-path checks, provider contracts, build, lint, typecheck, and audit.

### Verified
- `npm run verify`
- `npm run verify:runtime`
- `npm run verify:provider-settings`
- `npm run verify:provider-env`
- `npm run verify:fast-paths`
- `npm run verify:provider-contracts`
- `npm run verify:pipeline-lookahead`
- `npm run verify:audio-player`
- `npm run verify:local-playback`
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit`
- `npm audit`

## [Initial Version] - {PR_MERGE_DATE}

### Reading
- Quick Read: select text and read aloud with one command (toggle to stop)
- Clipboard fallback when selected text is unavailable
- Resume Last Reading and Restart Last Reading commands (always restart/resume; no surprise toggle)
- Chunk-level reading progress for medium-length text
- Smart text chunking for medium-length text (around 1,400 characters per non-streaming chunk)
- Cross-command playback control via PID file; external stop is treated gracefully
- Speed up Reading and Slow Down Reading commands adjust active or paused readings by 0.25× for the next synthesized segment
- Persistent reading-status menu-bar item showing live `Synth N/M` / `Play N/M` / paused state with Stop / Resume / Restart / Speed Up / Slow Down / Read / Pick Voice controls

### Voices
- Read with Voice Selection: browse MiniMax system, cloned, generated, and configured custom voice IDs
- Per-row "Synthesizing N/M" / "Playing N/M" progress while the picker stays browsable
- Select Quick Read Voice: choose and preview the voice used by Quick Read
- Active Configuration row surfaces the resolved auth mode + model + region with conflict warnings
- Set any listed voice as the Quick Read voice
- Paper-reading defaults include Mandarin and English MiniMax voices such as `Chinese (Mandarin)_Radio_Host`, `Chinese (Mandarin)_Sincere_Adult`, `Chinese (Mandarin)_Gentleman`, `hunyin_6`, `Chinese (Mandarin)_Wise_Women`, `Chinese_sweet_girl_vv1`, `English_CalmWoman`, `English_captivating_female1`, `English_AttractiveGirl`, and `English_nursery_teacher_vv2`
- Voice list cached locally for instant warm-start; refreshes in the background
- Voice preview and ad-hoc reading both survive view dismissal
- Default Custom Voice ID and Extra Custom Voice IDs appear at the top of every voice picker, tagged `Default` and `Unverified` until MiniMax voice lookup confirms them
- Clone Voice: upload source audio, optional prompt audio + prompt text, create a cloned voice, and preview the returned demo audio
- Inline form validation for Voice ID, audio, prompt text, and preview text
- Uploaded clone-source files are cached for 24h, so retries skip the re-upload step

### Models and Auth
- Support for MiniMax Speech 2.8, 2.6, and 02 model versions
- Token Plan Key and Open Platform API Key authentication modes (auto-detected by default)
- China and Global MiniMax API regions
- Adjustable speech rate (0.5× to 2.0×)
- Configuration and model-mismatch errors offer the relevant settings action as a primary action

### Commands
- Stop Reading: dedicated command; surfaces "Resume Last Reading" when nothing is active but a paused session exists
- Speed up Reading: increase the current reading speed by 0.25×, up to 2.0×
- Slow Down Reading: decrease the current reading speed by 0.25×, down to 0.5×
