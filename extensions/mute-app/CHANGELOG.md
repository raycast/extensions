# Changelog

## [Initial Release] - 2025-01-11

### Features

**Browse Mode:**
- View all applications with audio output on Windows
- Toggle mute status for individual applications
- Visual indicators for muted applications (🔇 icon)
- Real-time active/inactive status display (green tag for active apps)
- Active applications automatically sorted to top of list
- Configurable auto-refresh interval (1s, 2s, 3s, 5s, 10s, or manual)
- Optimistic UI updates for instant feedback
- File icon display for each application
- Two toggle modes:
  - Quick toggle with window close (Enter)
  - Toggle and keep window open (Cmd + Enter)

**Quick Toggle Mode:**
- Custom quick-action command (Toggle Mute for App 1)
- Configure process name for instant toggling
- Optional toast notifications (can be disabled for silent operation)
- Perfect for keyboard shortcuts
- No-view mode for seamless experience

**Platform:**
- Windows-only support using NirSoft SoundVolumeView utility

### Technical Details

- Uses SoundVolumeView CLI for audio control
- Automatic refresh every 3 seconds (default)
- Support for both light and dark themes
- Built with Raycast API and TypeScript
