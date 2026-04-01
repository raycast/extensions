# Audio Device Changelog

## [Major Update] - 2026-03-27

### Default device enforcement
Press Cmd+Shift+D on any device to make it your default. If macOS switches away after sleep or Bluetooth reconnect, the extension switches back within 10 seconds. Manually switching gives you a 1-minute grace period before enforcement resumes.

### Pinned volumes
Press Cmd+Shift+V on any device to pin its volume. If macOS resets it, the extension restores it within 10 seconds. Changes under 2% are ignored.

### Volume control
See current volume level for each device in the list. Mute/unmute with Cmd+M. Set exact volume (0-100) via Set Output Volume / Set Input Volume commands. Devices that don't support volume control (HDMI monitors) show "Volume controlled by device".

### Performance
Device list loads instantly from cache on repeat opens. Volume data for all devices is fetched in a single call (~500ms) instead of per-device queries.

### Breaking change: priority ordering removed
The old system where you ranked multiple devices as fallbacks is gone. Replaced by a single default device per direction. On first run, your top-priority device is automatically migrated to the new default.

The `Customize Order` command has been removed. Use Cmd+Shift+D in Set Output Device or Set Input Device to set your default. A redirect command is available for users who had it pinned.

### New icons
Clean 512x512 monoline icons for all device types. Works properly with Raycast's tint system.

## [Update] - 2026-02-17
- Improve binary download for windows (downloads and checks if binary exists at runtime)

## [Update] - 2026-02-16
- Used https://github.com/Inovvia/go-win-audio-cli instead of cmdlet to prevent issues regarding powershell and administrator privileges
- Listing audio devices on windows is now a lot faster!

## [Fix] - 2026-02-10
- Improved windows requirement auto install logic
- Suppressed PowerShell warnings — Set $WarningPreference = 'SilentlyContinue' and -WarningAction SilentlyContinue on Import-Module to prevent warnings from corrupting JSON output.
- Stripped ANSI escape codes — PS7 outputs color codes in warnings; these are now stripped before JSON parsing.
- Handled both PS5 and PS7

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
