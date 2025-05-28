# Media Converter Changelog

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
