# Audio Device Changelog

## [Major Update] - {PR_MERGE_DATE}

### Merged Sound Control features
- Volume control: see current volume level for each device in the list
- Toggle Mute action (Cmd+M) directly from the device list
- New standalone commands: Toggle Mute, Set Volume, Set Input Volume
- Full input volume and mute support via integrated sound-control binary

### Pinned Volume Levels
- Pin any device's volume to prevent macOS from resetting it (Cmd+Shift+V)
- "Pinned: X%" tag shown on devices with pinned volumes
- Background enforcer automatically resets volume if macOS changes it

### Simplified auto-switch UX (Option B)
- Default (sticky) device: star any device as your default (Cmd+Shift+D)
- Priority ordering: reorder devices with Cmd+Arrow keys directly in the main list
- Background enforcer always active -- no separate toggle commands
- If default device is connected, always use it; otherwise fall back to priority order
- Removed separate "Toggle Auto Switch" and "Customize Order" commands

### New icons
- All device icons replaced with clean 512x512 Lucide/Iconify monoline icons
- New headphones icon for wired headphones
- Icons work properly with Raycast's tint system

## Chore - 2026-02-07
- Fix issues in lint due to newer ESlint package

## [Fix] - 2026-02-04

- Hidden devices tracked per input/output and shared across manual lists and auto-switch

## [Update] - 2026-02-06

- Add Windows support via platform abstraction
- Refactor audio handling into a platform abstraction layer.
- Moves macOS binary logic to src/platform/macos and adds
- Windows support via PowerShell AudioDeviceCmdlets.
- Update raycast package

## [Update] - 2026-02-02

- Added auto-switch commands with device order customization and toggles

## [Fix] - 2025-09-11

- Remove problematic "airplay support" toggle

## [Update] - 2025-08-04

- Added frecency sorting to the devices list

## [Update] - 2025-06-26

- Added support for device name for quick links

## [Update] - 2025-06-11

- Added combo commands to simultaneously change input and output device

## [Update] - 2025-02-25

- Added icons for AirPods, AirPlay, and Bluetooth devices

## [Update] - 2024-06-26

- Added keywords for better discovery

## [Update] - 2024-05-06

- Added the option to hide/show a device

## [Update] - 2024-02-05

- Added green tint color for icon of current input/output device
- Shortened action and toast titles for better readability
- Added icons for all actions
- Disabled some lesser used commands by default

## [Update] - 2023-07-04

- Added the option to create quick-links from audio-devices

## [Update] - 2023-05-19

- Change dependencies to one which creates universal binary to be executable on intel and mac chips.

## [New command] - 2023-02-07

- Added toggle favourites command

## [Added screenshots] - 2022-11-17
