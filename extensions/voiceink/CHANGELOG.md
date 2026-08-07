# Changelog

## [Fix Empty History and Silent Copy Actions] - {PR_MERGE_DATE}

- Read the transcription table's columns before querying it, instead of assuming them from the selected database source
- Fix an empty history on current VoiceInk versions, which renamed the `powerModeName` and `powerModeEmoji` columns to `modeName` and `modeEmoji`
- Confirm the copy and paste actions with a HUD, while still keeping the transcription text out of the render tree

## [Render Stability] - 2026-08-03

- Prevent large transcription histories from overflowing Raycast's render payload
- Use Raycast's native SQLite utility and show database errors instead of silently returning an empty history
- Support the current database schemas used by both VoiceInk Official and VoiceInk CE

## [Initial Release] - 2026-02-20

- Browse and search through transcription history with multi-word matching
- Support for both VoiceInk Official and VoiceInk CE
- Configurable database source in preferences
