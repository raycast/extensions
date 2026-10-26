# FlowSpeech TTS Changelog

## [Public API v1] - {PR_MERGE_DATE}

- Migrate generation to asynchronous jobs and credential-free WAV downloads
- Preserve request IDs on retry and honor Retry-After and operation deadlines
- Report recoverable job IDs without exposing the API key or selected text
- Add contract tests for success, failure, timeout, retries and download security
- Sync the hardened client with strict result, UUID, WAV, and retry-cooldown checks
- Persist caller-known request IDs before submission and add Show Speech Recovery
- Add local stop actions without automatically cancelling paid server jobs
- Test actual wrappers, simulated host termination, and distribution commands

## [Initial Version] - 2026-09-29

- Speak selected text with FlowSpeech
- Speak copied text with FlowSpeech
- Choose from five available voices
