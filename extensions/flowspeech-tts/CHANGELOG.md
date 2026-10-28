# FlowSpeech TTS Changelog

## [Fix Forgotten Recovery] - 2026-10-28

- Keep explicitly forgotten recovery IDs removed when running speech finishes or is interrupted

## [Public API v1] - 2026-10-27

- Migrate generation to asynchronous jobs and credential-free WAV downloads
- Preserve request IDs on retry and honor Retry-After and operation deadlines
- Report recoverable job IDs without exposing the API key or selected text
- Sync the hardened client with strict result, UUID, WAV, and retry-cooldown checks
- Persist caller-known request IDs before submission and add Show Speech Recovery
- Add local stop actions without automatically cancelling paid server jobs
- Keep stop and recovery-copy controls in command views for closed-window launches
- Bound completed recovery history, protect unresolved IDs, and confirm manual removal

## [Initial Version] - 2026-09-29

- Speak selected text with FlowSpeech
- Speak copied text with FlowSpeech
- Choose from five available voices
