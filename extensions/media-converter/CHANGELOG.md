# Media Converter Changelog

## [1.5.1] - 2025-08-25

### Fixed

- Simple quality not being properly applied

## [1.5.0] - 2025-08-12

### Added

- Video conversion quality settings
- "More Conversion Settings (Advanced)": by default, video and audio will only show "lowest", "low", "medium", "high" and "highest" quality settings. By enabling "More Conversion Settings (Advanced)" in the extension preferences, the user will be shown a more fully-featured quality settings page, including CRF/VBR/VBR-2-PASS encoding mode, bitrate and more for video; bitrate, sample rate, bit depth, and more for audio
- Added lots more of supported formats as inputs

### API Changes

- New type system for centralized values

## [1.4.2] - 2025-06-27

### Added

- Specify custom FFmpeg path from the Raycast app's extension preferences (optional)

### Removed

- FFmpegInstallPage.tsx: a page for specifying a custom FFmpeg path. Replaced by the proper handling of user preferences.

### API Changes

- Re-flowed the lost FFmpeg handling to HelloPage.tsx, previously at FFmpegInstallPage.tsx

## [1.4.1] - 2025-06-26

Publish on windows

## [1.4.0] - 2025-06-25

Major rework of the installation of FFmpeg (way more streamline for non-brew users), future-proof (for when Raycast will support more platforms than MacOS)

### Added

- New auto-installation of FFmpeg (extension dependency)
- Auto-detect and auto-use of system FFmpeg if found on system and version 6.0+
- Possibility to give the extension a custom path to a FFmpeg 6.0+ binary executable (on the Welcome page, under actions, &#9881; Specify Local FFmpeg Path (Advanced))
- Icons for all actions

### Removed

- The previous 'NotInstalled.tsx' page, where the user would be guided to install FFmpeg via Homebrew. This has been replaced by the auto-detection or auto-installation
- Converting to .HEIC is now only possible on MacOS (not an issue since at the time of writing, Raycast is MacOS only). This is because HEIC is patent-encumbered and MacOS is the only OS (that we know of) that has a built-in utility containing libvips compiled with support for libheif, libde265 and x265

### API Changes

- Custom FFmpeg installation to environment.supportPath using a customised version of the [ffmpeg-static npm package](https://www.npmjs.com/package/ffmpeg-static)
- Added more categories to the extension

## [1.3.0] - 2025-05-27

### Added

- Support for .jpeg, .tif, .bmp files as input (not to be mistaken with .jpg and .tiff which were already supported)
- Quality options for all image formats

### Removed

- Quick Convert
  - Now replaced by the main "Convert Media" command
  - Since Convert Media now auto-selects the selected Finder files, no need for the Quick Convert action anymore
  - The main "Convert Media" command is just as fast as was "Quick Convert". If you don't know what quality setting to choose, defaults are good.

### Fixed

- Converting from and to .heic now works from and to any formats.

### API Changes

- Rewrote nearly the whole extension
  - Centralised convert-media.ts tool
  - Centralised types in converter.ts
  - Rewrote the file handling logic in ConverterForm.tsx
  - Added quality handling logic for images
  - Many more. See pull request for more info.

## [Enhanced README and added new metadata images] - 2025-03-10

## [✨ AI Enhancements] - 2025-02-21

## [1.2.0] - 2024-12-27

### Added

- Added support for AVIF file format conversion.
- Added support for multiple file selection in Quick Convert command.

## [1.1.0] - 2024-12-24

### Added

- Add support for webm file format conversion

## [1.0.1] - 2024-12-13

### Fixed

- Fix HEIC file format conversion not working as expected.

### Changed

- Refactor image conversion to use the sips command.

## [1.0.0] - 2024-12-11

### Added

- Added support for HEIC file format conversion using the sips command.
- Fixed a bug where the Convert Media command would not work as expected.

## [0.2.0] - 2024-12-10

### Added

- Added a new **Quick Convert** command that allows users to select a file in Finder, choose the desired format from a list, and convert it instantly.
- Integrated Finder selection for seamless file conversion:
  - Automatically detects and pre-selects media files currently highlighted in Finder.
  - Supports batch processing for multiple files
  - Retains manual file selection as a fallback.

## [0.1.1] - 2024-11-15

### Changed

- Added improvements to the ffmpeg installation check.

## [0.1.0] - 2024-11-15

### Initial Release
