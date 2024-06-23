# Image Modification Changelog

## [Webp Image Quality Fix] - 2024-06-18

- Fixed an issue when converting to webp degrades the quality of the image

## [Bug Fix] - 2024-06-14

- Fixed a bug where the "Flip Images Vertically" command flipped the images horizontally

## [WebP Hotfix] - 2024-01-29

- Fixed some commands (e.g. convert) looking for WebP binaries in the wrong location

## [Strip EXIF Data, Filter Previews] - 2024-01-28

- Added "Strip EXIF Data" command
- Added real time filter previews
- Improved selection detection when Finder/Path Finder is not the frontmost application
- Fixed bug where converting from WebP to anything but PNG would change the file extension but not the file format

## [Bug Fix] - 2023-10-05

- Fixed a bug where the "Convert Images" command failed for image paths containing dots. (#8549)

## [Create Images, In-Clipboard Modification] - 2023-07-06

- Added settings to individually show/hide image formats from the list of conversion formats (#7023)
- Added settings for input source and output destination (e.g. clipboard, new file, replace original, etc.) (#6593)
- Made all commands work as expected regardless of input/output settings (i.e. you can rotate an image in the clipboard and immediately open it in Preview) (#7296)
- Added "Create Image" command to create image placeholders of various sizes, patterns, and colors
- Improved error handling for all commands, including copyable error messages
- Generally improved the code quality of the extension

## [Optimize Images, SVG Conversion, More Filters] - 2023-04-03

- Add "Optimize Images" command
- Add ability to convert SVG to various image types
- Add ability to convert images to SVG using Potrace
- Add ability to convert PDF to various other image types
- Add ability to rotate and flip PDFs
- Add 13 new filters:
  - Circular Screen
  - Circular Wrap
  - CMYK Halftone
  - Dither
  - Document Enhancement
  - Dot Screen
  - Hatched Screen
  - Kaleidoscope
  - Line Screen
  - Maximum Component
  - Minimum Components
  - Posterize
  - Sharpen Luminance
- Fix WebP operations failing due to insufficient permission

## [WebP Support] - 2023-03-29

- Add WebP conversion support
- Add support for running SIPS commands on WebP (via temp file)
- Add Path Finder support (As preference toggle)

## [Filters] - 2023-03-22

- Add "Apply Image Filter" command

## [Padding, Bug Fixes] - 2023-03-15

- Added "Pad Images" command.
- Fixed compatibility with HEIC images and other formats. (#5238)

## [Localization Fix] - 2023-03-07

- Updated the way the list of supported file types are handled.

## [Initial Version] - 2023-02-23
