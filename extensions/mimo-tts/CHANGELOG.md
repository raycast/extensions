# MiMo TTS Changelog

## [Update] - {PR_MERGE_DATE}

- Switch the synthesis backend to Xiaomi MiMo's OpenAI-compatible TTS API.
- Use Xiaomi MiMo Token Plan credentials, with a configurable Token Plan Base URL.
- Replace the large legacy voice catalog with the official MiMo built-in voices.
- Add Raycast detail panels for voice browsing and current selection context.
- Add natural-language speaking style support through the MiMo `user` message.
- Add TTS Studio for typed, pasted, or selected text with structured speech rate, style tags, rhythm events, emotion states, and voice features.
- Inject assistant-side control tags per chunk so long-form playback keeps the selected style.
- Request WAV audio and play returned base64 audio through the existing macOS playback pipeline.
- Rename package metadata, commands, preferences, temp files, and documentation to MiMo TTS.

## [Initial Version] - 2026-03-05

- Quick Read: select text and read aloud with one command, with toggle-to-stop behavior.
- Voice selection and preview command.
- Dedicated Stop Reading command.
- Smart text chunking for long text.
- Cross-command playback control via PID file.
