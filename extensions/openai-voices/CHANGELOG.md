# OpenAI Voices Changelog

## [Initial Version] - {PR_MERGE_DATE}

🎉 **First release of OpenAI Voices extension for Raycast!**

### Features
- **Text-to-Speech Integration**: Convert any selected text or clipboard content to speech using OpenAI's TTS API
- **Interactive Text Editor**: Review and edit text before converting to speech
- **Direct Reading Mode**: Instant text-to-speech without confirmation dialogs
- **Latest OpenAI Models**: Support for `gpt-4o-mini-tts` (default), `tts-1-hd`, and `tts-1`
- **All 11 OpenAI Voices**: Choose from alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, and more
- **Advanced Speech Control**: Custom instructions for tone, accent, emotion, and speaking style
- **Multiple Audio Formats**: WAV (default), MP3, AAC, and FLAC support
- **Speed Control**: Adjustable playback speed from 0.25x to 4.0x (default 1.5x)
- **Audio File Management**: Option to save generated audio files for reuse
- **Native macOS Playback**: Reliable audio playback using built-in `afplay`
- **Comprehensive Error Handling**: Detailed feedback and troubleshooting information
- **User Onboarding**: Guided setup for OpenAI API key configuration

### Technical Implementation
- Built with TypeScript and React
- Uses official OpenAI SDK v4
- Raycast view command mode with form interface
- Intelligent audio playback fallback system
- Temporary and persistent file storage options