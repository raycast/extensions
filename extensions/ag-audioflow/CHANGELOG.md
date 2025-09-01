# AG AudioFlow Changelog

## [1.0.0] - 2025-08-07

### Added

- **Convert Audio Format** - Convert between MP3, WAV, AAC, FLAC, OGG formats with quality control
- **Trim Silence** - Remove silence from beginning and end of audio files with adjustable thresholds
- **Add Fade Effects** - Add professional fade-in and fade-out effects with custom durations
- **Normalize Audio** - Normalize audio levels using EBU R128 standards with industry presets
- **Adjust Volume** - Precise volume control with dB scaling (-60dB to +60dB range)
- **Split Stereo to Mono** - Extract left and right channels as separate mono files
- **Convert Stereo to Mono** - Convert stereo to mono with mixing options (mix, left only, right only)
- **Adjust Audio Speed** - Variable speed control (10%-1000%) with pitch preservation option
- **Process Audio Batch** - Apply any operation to multiple files simultaneously with progress tracking
- **Get Audio Info** - Display detailed audio file metadata and technical specifications
- **Setup FFmpeg** - Automated FFmpeg detection and installation guidance

### Features

- Automatic FFmpeg path detection for Apple Silicon and Intel Macs
- Professional audio processing using FFmpeg backend
- Intelligent file selection from Finder
- Custom output directory selection
- Real-time progress tracking for batch operations
- Comprehensive error handling and user feedback
- Professional UI with custom branding

### Technical

- Built with TypeScript and React
- Raycast API integration
- Support for multiple audio formats
- Cross-platform FFmpeg compatibility
- Optimized for macOS workflows
