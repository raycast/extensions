# Changelog

## [Fix Empty History and Restore Copy Confirmation] - 2026-08-12

- Read the transcription table's columns before querying it, instead of assuming them from the selected database source
- Fix an empty history on current VoiceInk versions, which renamed the `powerModeName` and `powerModeEmoji` columns to `modeName` and `modeEmoji`
- Restore the copy and paste confirmation lost in the previous release, without putting transcription text back into the render tree

## [Render Stability] - 2026-08-03

- Prevent large transcription histories from overflowing Raycast's render payload
- Use Raycast's native SQLite utility and show database errors instead of silently returning an empty history
- Support the current database schemas used by both VoiceInk Official and VoiceInk CE

## [Initial Release] - 2026-02-20

- Browse and search through transcription history with multi-word matching
- Support for both VoiceInk Official and VoiceInk CE
- Configurable database source in preferences
