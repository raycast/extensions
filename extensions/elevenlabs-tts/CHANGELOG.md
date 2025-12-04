# Raycast ElevenLabs TTS Changelog

## [1.2.0] - 2025-11-27

### Added
- Dynamic chunk scheduling based on text length for better short text support
- Voice display name mapping for improved toast readability

### Fixed
- Audio playback cutoff issue by implementing non-blocking playback
- Short text (< 100 chars) not generating audio due to chunk size threshold
- API error handling to prevent duplicate error messages
- WebSocket error tracking with proper error flag system
- Race condition between audio streaming and playback

### Changed
- Migrated to `eleven_turbo_v2_5` model for free tier compatibility
- Streamlined toast notifications for compact HUD display
- Adopted `showFailureToast` utility from `@raycast/utils` for better error UX
- Simplified error messages to be concise and actionable
- Improved error handling with specific messages for quota, API key, and model issues

### Technical
- Added completion tracking for both stream and playback states
- Implemented non-blocking audio playback to allow chunk writing during playback
- Enhanced error detection and propagation throughout the audio pipeline
- Updated validation error messages to be more user-friendly

## [1.1.0] - 2025-01-19

### Added
- Playback speed control with options from 0.5x to 2.0x speed
- New preferences dropdown for playback speed selection
- Integration with macOS afplay command for speed-adjusted playback

## [1.0.0] - 2025-01-12

### Added
- Text-to-speech conversion using ElevenLabs API
- Support for multiple premium AI voices
- Voice customization with stability and similarity boost settings
- Automatic playback control (stop/start)
- Progress feedback with word count and text preview
- Error handling with user-friendly messages
- Automatic cleanup of temporary audio files

### Features
- Speak selected text from any application
- Configure voice settings through preferences
- Stop playback by running command again
- Support for long-form text
- Real-time audio streaming

### Technical
- WebSocket-based streaming for efficient audio delivery
- Temporary file management for audio chunks
- Event-based architecture for audio processing
- Comprehensive error handling and user feedback
- Unit tests for core functionality
