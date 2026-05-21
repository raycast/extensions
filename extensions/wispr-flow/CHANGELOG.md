# Wispr Flow Changelog

## [Add Windows Support] - 2026-04-30

### Platform Support
- Added Windows
- Added platform-specific handling for the default database path, app detection, and opening Wispr Flow commands

### Database and Commands
- Updated write operations to use the shared async SQL helper
- Updated add, edit, delete, and archive actions to await database writes before refreshing UI state
- Updated start recording, stop recording, and open app commands to use the shared Wispr Flow opener

### Maintenance
- Updated Raycast and TypeScript-related dependencies

## [Update] - 2026-04-22

### Voice Control
- Added Toggle Recording command to start/stop dictation with a single hotkey

## [Update] - 2026-03-23

### Transcription History
- Added a Paste Last Transcript command to paste the latest unarchived Wispr Flow transcript into the active app

## [Initial Release] - 2026-03-04

### Transcription History
- Search and browse Wispr Flow transcription history with infinite scroll
- Time-grouped sections (Today, Yesterday, This Week, Last Week, Older)
- Filter transcripts by source app
- Sort by newest, oldest, longest duration, or most words
- Detail view with metadata (source, dictation time, words, duration, WPM)
- Copy to clipboard or paste to active app
- View original ASR transcription before Wispr's formatting
- Archive transcripts

### Dictionary Management
- Add custom words and phrases to Wispr Flow's vocabulary
- Manage dictionary entries (view, search, edit, delete)
- Support for replacement text (spoken word → output text)
- Sections for manual entries and learned words

### Voice Control
- Start and stop voice recording via Raycast commands
- Open Wispr Flow app
- Automatic install detection with download prompt
