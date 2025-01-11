# Changelog

All notable changes to the MuteDeck Raycast extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-03-15

### Added

- Initial release of MuteDeck Raycast extension
- Core meeting control commands:
  - Toggle Microphone (⌘ M)
  - Toggle Video (⌘ ⇧ V)
  - Leave Meeting (⌘ ⇧ L)
  - Show Status (⌘ ⇧ S)
- Real-time status monitoring
- Customizable keyboard shortcuts
- User preferences:
  - Custom API endpoint
  - Status refresh interval
  - Confirmation dialogs
  - Toast notifications
- Enhanced error handling with troubleshooting steps
- Confirmation dialogs for potentially disruptive actions:
  - Leaving meetings
  - Toggling mic/video while presenting
  - Toggling mic/video while recording
- Comprehensive documentation:
  - Installation guide
  - Keyboard shortcut customization
  - Troubleshooting guide
  - Contribution guidelines

### Security

- Local-only API communication (http://localhost:3491)
- No external data transmission
- Secure preference handling

## [Unreleased]

### Planned

- Meeting platform detection
- Meeting duration tracking
- Custom notification sounds
- Meeting quick actions
- Meeting history view
- Status menu bar item
- Multi-platform support
