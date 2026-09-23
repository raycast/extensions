# Cobalt Changelog

## [Added contributor] - 2026-09-07

## [Windows support] - 2026-09-06

- Added Windows support
- Generated video thumbnails with ffmpeg off macOS, falling back to the status icon when it is not installed
- Replaced the AppleScript download notification with the success toast on Windows
- Expanded `~` in the download directory preference so the default resolves on both platforms
- Fixed `cmd` shortcuts that had no Windows mapping
- Padded the history grid when it shows status icons rather than thumbnails
- Kept the download notification preference meaningful on Windows by showing a HUD
- Fixed thumbnails colliding when two downloads shared a name but not an extension

## [Download History command and improvements] - 2025-06-27

- Added `Download History` command (Thanks @ripgrim!)
- Minor under-the-hood improvements

## [General improvements, API update] - 2024-11-20

- Updated dependencies
- Updated default API instance URL to `cobalt.aelew.dev` (see [imputnet/cobalt#860](https://github.com/imputnet/cobalt/discussions/860))
- Updated download logic to be compatible with the latest API version (v10.3.3)
- Added a toast notifying the user if they are using an old API instance URL
- Added `API Instance Key` preference
- Added `Always Proxy` preference
- Added `Disable Metadata` preference
- Added `YouTube: Use HLS` preference
- Removed `Mute Video Audio` preference (now under `Mode`)

## [Bug fixes and improvements] - 2024-08-16

- Updated dependencies
- Updated default API instance URL to `api.cobalt.tools`
- Fixed file names not being parsed properly sometimes
- Added `144p` and `240p` video quality options
- Added `Twitter: Convert GIFs to .gif` preference
- Added `TikTok: Prefer H.265/HEVC Videos` preference
- Removed `Vimeo Download Type` preference (no longer supported)
- Removed `Remove TikTok and Douyin Watermarks` preference (no longer supported)

## [Improvements] - 2023-10-30

- Added new `File name style` preference
- Added additional error handling
- Updated dependencies

## [Initial release] - 2023-07-30

Cobalt for Raycast is here!
