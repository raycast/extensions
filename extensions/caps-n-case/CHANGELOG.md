# Caps N Case Changelog

## [2.0.0] - 2025-01-10

### Breaking Changes

- Migrated from `no-view` to `view` mode - Commands now show a preview interface instead of instant execution
- Text is no longer copied automatically - User must press Enter to copy

### New Features

- Interactive preview interface showing original and converted text side-by-side
- Multiple action buttons with keyboard shortcuts:
  - Copy to Clipboard (Enter)
  - Paste to Active App (⌘ + Enter)
  - Copy Original Text (⌘ + O)
- Visual feedback with toast notifications for all actions
- Ability to cancel without copying (Esc key)

### Improvements

- Updated command titles to follow Raycast conventions (Action + Extension Name format)
- Better user control with preview before committing to copy/paste
- Enhanced user experience with clear action buttons
- More intuitive workflow for text conversion

## [1.0.0] - 2025-01-10

Initial release of Caps N Case extension.

### Features

- Convert text to UPPERCASE
- Convert text to lowercase
- Convert text to Sentence case
- Convert text to Title Case (following English grammar rules)
- Smart text detection - Works with both selected text and clipboard content
- Support for macOS and Windows platforms