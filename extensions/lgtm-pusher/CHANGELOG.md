# Changelog

All notable changes to LGTM Pusher will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-19

### Added
- Initial release of LGTM Pusher
- AI-powered LGTM image generation using Google Gemini 2.5 Flash
- Two command modes: Generate LGTM (view) and Quick LGTM (no-view)
- Simple prompt mode with 5 preset styles:
  - Pixel Heart Boy
  - Pixel Galaxy
  - Pixel Office
  - Pixel Cat Programmer
  - Pixel Celebration
- Template mode for structured image generation
- Custom text overlay support with adjustable font sizes
- Style reference mode for consistent aesthetics
- Edit mode for custom image inputs
- Automatic fallback to gradient background on API failure
- Instant clipboard copy functionality
- Support for 512x512 and 1024x1024 image sizes
- Secure API key storage in Raycast preferences
- Comprehensive error handling and user feedback

### Technical Features
- 8-bit pixel art aesthetic
- Text overlay using Jimp for reliable text rendering
- Central negative space preservation for text readability
- Automatic contrast optimization
- Local temporary storage for generated images

---

[1.0.0]: https://github.com/YuminosukeSato/lgtm-pusher/releases/tag/v1.0.0