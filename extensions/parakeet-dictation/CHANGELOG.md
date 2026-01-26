# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-26

### Added
- Initial release
- Offline voice-to-text dictation using NVIDIA Parakeet model
- Auto-start recording when command is invoked
- Auto-paste transcribed text at cursor location
- Support for Apple Silicon (M1/M2/M3) Macs
- Setup checker for dependency validation
- Configurable audio quality and decoding methods
- Auto-capitalization and auto-punctuation
- Support for 25 European languages
- Progress indicator for long transcriptions
- Privacy-focused: all processing happens locally

### Technical
- Uses parakeet-mlx via pipx for easy installation
- Supports both SoX and FFmpeg for audio recording
- Enhanced PATH resolution for Raycast environment
- Automatic cleanup of temporary audio and JSON files
