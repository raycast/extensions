# MiMo TTS Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Quick Read: speak the current text selection with the default MiMo voice; trigger again to stop.
- Read with Selected Voice: browse MiMo voices with details, inspect selected text, and read with the chosen voice.
- TTS Studio: compose speech from typed, pasted, or selected text with speech rate, opening style, rhythm, emotion, voice feature, and expression tags plus director prompts.
- Set Quick Read Voice: preview voices with selected or clipboard text and pin a per-user Quick Read voice.
- Stop Reading: stop the active playback from any command.
- Increase / Decrease Reading Speed: nudge playback speed in 0.25x steps from any command.
- MiMo TTS Status menu bar item: surface playback status, speed, and quick-launch controls.
- Natural-language style prompt preference sent as the MiMo `user` message.
- Audio-event tag prefix injected per assistant chunk for long-form continuity.
- Pipelined chunk playback: synthesize the next chunk while the current chunk plays.
- Cross-command stop via a validated PID file (only kills `afplay` owned by this extension).
- WAV audio requested from the MiMo Token Plan `/chat/completions` endpoint and played locally via `afplay`.
