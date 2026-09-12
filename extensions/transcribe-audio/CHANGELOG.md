# Transcribe Audio Changelog

## [1.0.0] - 2026-08-25

### Added
- Initial release: transcribe audio and video files using OpenAI, Deepgram, or ElevenLabs.
- Native Raycast file picker with provider, audio type, output format, language, and speaker-label options.
- Speaker diarization support for Deepgram and ElevenLabs.
- Transcription history stored in Raycast LocalStorage.
- Save transcripts as Markdown, plain text, or SRT.
- Streamed uploads for Deepgram to avoid loading large files into memory.
- File-type validation and granular progress feedback during transcription.
