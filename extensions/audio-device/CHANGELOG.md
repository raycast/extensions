# Audio Device Changelog

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
