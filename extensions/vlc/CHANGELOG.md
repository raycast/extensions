# VLC Changelog

## [Speed Controls & Playlist] - 2025-11-12

- Added playback speed controls:
  - Speed Up: Increase speed by 0.25x increments (up to 4.0x)
  - Speed Down: Decrease speed by 0.25x increments (down to 0.25x)
  - Normal Speed: Reset playback to 1.0x
  - Set Playback Speed: Custom speed with form interface
- Added Playlist viewer to browse and play VLC playlist items
- Fixed VLC capitalization consistency across the extension

## [Initial Version] - 2025-08-04

- Initial release of VLC Raycast extension.
- Control VLC Media Player directly from Raycast.
- Features:
  - Play, Pause, Stop, Next, Previous
  - Volume Up, Volume Down, Mute, Unmute
  - Set Volume by Percentage (0–100%)
  - Seek Forward, Seek Backward
  - Toggle Fullscreen, Loop, Random/Shuffle
  - Eject current media
  - Open video with optional subtitle file
  - Trigger VLsub (subtitle search) via AppleScript
- Secure password authentication for VLC HTTP interface
- All commands available as quick Raycast actions
