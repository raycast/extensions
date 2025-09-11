# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release preparation

## [1.0.0] - 2025-01-27

### Added
- Initial release of Turbo Speedo Video
- Support for video speed adjustment from 0.25x to 40x
- Smart audio handling for different speed ranges
- Support for multiple video formats (MP4, MOV, AVI, MKV, WebM, FLV, WMV, M4V, 3GP, OGV)
- Simple dropdown interface for speed selection
- File picker for input video selection
- Output path selection
- Comprehensive test suite
- GitHub Actions for CI/CD
- Complete documentation and contributing guidelines
- Security policy and code of conduct

### Features
- **Speed Range**: 0.25x to 40x speed adjustment
- **Audio Quality**: 
  - 0.25x - 2x: Full audio quality maintained
  - 2.5x - 40x: Audio speed adjusted for optimal playback
- **Format Support**: Wide range of video formats supported
- **User Experience**: Intuitive Raycast interface
- **Performance**: Powered by FFmpeg for reliable processing

### Technical Details
- Built with TypeScript and React
- Uses Raycast API for UI components
- FFmpeg integration for video processing
- Comprehensive error handling
- Input validation and sanitization
- Memory-efficient processing

---

## Version History

- **1.0.0** - Initial release with core functionality

## How to Read This Changelog

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

## Contributing

When adding entries to this changelog, please follow these guidelines:

1. Add entries in reverse chronological order (newest first)
2. Use clear, descriptive language
3. Group changes by type (Added, Changed, Fixed, etc.)
4. Include issue/PR numbers when relevant
5. Follow the existing format and style
