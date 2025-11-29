# Changelog

All notable changes to the Windows Audio Switcher extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of Windows Audio Switcher extension
- Switch between audio output/playback devices
- Switch between audio input/recording devices
- Set devices as default or communication devices
- Refresh audio devices list to detect new/removed devices
- Windows-specific PowerShell cmdlet integration for device management
- Local storage for device caching and persistence
- Device sorting by Index property for consistent ordering

### Features

- **Output Audio Switcher**: Quick access to all available playback devices
- **Input Audio Switcher**: Easy switching between recording devices
- **Device Refresh**: Rescan and update available audio devices
- **Device Status**: Visual indicators for default and communication devices
- **Device Management**: Set devices as default or communication device directly from Raycast

### Technical

- TypeScript with strict mode enabled
- React functional components with hooks
- ESLint configuration following Raycast standards
- Prettier formatting with 120 character line width
- CommonJS module system
- ES2023 target compatibility
