# Raycast ElevenLabs TTS Changelog

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
