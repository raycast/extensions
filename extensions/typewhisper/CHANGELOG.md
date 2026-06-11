# TypeWhisper Changelog

## [Improved Dictation Session Tracking] - 2026-04-24

- Updated Start Dictation and Show Last Transcription to use dictation session IDs for exact transcript lookup
- Prefer session-specific transcript polling over guessing the latest history entry
- Keep the existing history lookup as a fallback when no tracked session is available

## [Initial Version] - 2026-03-06

- Added Start Dictation command to toggle voice dictation
- Added Search History command to browse and search transcriptions
- Added Show Last Transcription command to quickly copy recent text
- Added Switch Profile command to manage TypeWhisper profiles
- Added Transcribe File command for audio file transcription
- Auto-discovery of TypeWhisper API port
