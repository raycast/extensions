# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Initial release.

## [1.0.1] - 2025-05-11
### Changed
- Clears clipboard after successful image merge or user cancellation to prevent re-merging the same images.

## [1.0.0] - 2025-05-11
### Added
- Initial release of the Clipboard Image Merge extension.
  - Fetches up to 6 sequential images from clipboard history.
  - Executes a user-specified macOS Shortcut to merge the images.
  - Configurable preferences for shortcut name, maximum clipboard history depth, image merge order (newest/oldest first), and shortcut execution timeout.