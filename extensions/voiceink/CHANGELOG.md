# Changelog

## [Render Stability] - 2026-08-03

- Prevent large transcription histories from overflowing Raycast's render payload
- Use Raycast's native SQLite utility and show database errors instead of silently returning an empty history
- Support the current database schemas used by both VoiceInk Official and VoiceInk CE

## [Initial Release] - 2026-02-20

- Browse and search through transcription history with multi-word matching
- Support for both VoiceInk Official and VoiceInk CE
- Configurable database source in preferences
