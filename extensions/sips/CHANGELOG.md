# Image Modification Changelog

## [1.11.2 — QSpace Bug Fixes] - 2026-03-01

- Added support for regular QSpace (the Mac App Store version), not just QSpace Pro
- Fixed failure to operate on clipboard image copies of files with names containing spaces
- Fixed selection detection in QSpace failing for files with names containing special characters or spaces
- Fixed commands involving temporary files not working in QSpace

## [Security Updates] - 2026-03-01

- Upgraded `tar` to `7.5.7` to address dependency security advisories.

## [1.11.1 — Bug Fixes] - 2025-07-07

- Added support for detecting file selection in ForkLift's List and Icon views
- Improve performance of "Apply Filter" AI Tool by supplying filter definitions
- Fix vignette filter never getting applied
- Fixed AVIF installation appearing to fail on the first try
- Fixed AVIF encoder/decoder failing to run due to not following symlinks
- Fixed selection detection scripts not raising Automation permission dialogs (and thus failing without reason)
- Fixed ForkLift script not raising Accessibility permission dialog (and thus failing without reason)

## [1.11.0b — Bug Fix] - 2025-06-29

- Removed `-lossless` flag from `dwebp` command

## [1.11.0 — Improved Selection Detection] - 2025-05-12

- Added full support for QSpace Pro
- Added experimental support for ForkLift
- Rewrote file selection detection scripts to improve performance

## [1.9.1 — Remove Background] - 2025-02-24

- Added 'Remove Background' command to remove the background from selected images
- Added two new metadata images showcases AI Tools and `Remove Background` command
- Set 'Strip EXIF Data' command to be disabled by default
- Updated to ExifTool version 13.21
- Fixed ExifTool failing to install or not recognizing current install (Resolve #16884)
- Fixed crash when trying to generate live preview for filters on PDFs (Resolve #16971)

## [1.9.0b — ✨ AI Enhancements] - 2025-02-21

- Add AI tool support for all image operations

## [1.9.0 — Bug Fixes & New Filters] - 2025-01-30

- Improved memory management when previewing filters, reducing the likelihood of out-of-memory errors
- Added setting to disable live filter previews
- Added setting to hide specific filters/filter categories from the filter list
- Added 28 new filters

## [1.8.3 — Fix WebP optimization] - 2025-01-29

- Fixed the cwebp path being incorrectly set when Optimizing WebP images

## [1.8.2 – Fix avifenc Installation] - 2024-09-11

- Fixed an issue where the `avifenc` and `avifdec` binaries were not being installed correctly

## [1.8.1 – Lossless Setting & Improved PNG Optimization] - 2024-07-08

- Added a "Lossless Conversions" setting for WebP and AVIF image operations, disabled by default
- Improved PNG optimization by using PNGOUT
- Fixed a bug where intermediate files were not being deleted after various operations

## [1.8.0 — AVIF, More File Managers, & Bug Fixes] - 2024-06-26

- Added support for NeoFinder and HoudahSpot
- Added support for AVIF images
- Added support for several new conversions: PDF->SVG, PDF->WebP, SVG->PDF, SVG->WebP
- Added ability to create QuickLinks to specific conversion and image creation operations
- Added "Generate Image Previews" toggle for the "Create New Image" command
- Added "JPEG Extension" setting for the "Convert Images" command
- Added an alert for when automation permissions have not been granted
- Fixed "Strip EXIF Data" failing when using the "Replace Original" result handling option
- Fixed images not getting saved to the correct location when using the clipboard as the image source
- Fixed PDF->JPEG conversion not actually using JPEG as the output format
- Fixed "command not found" bug when optimizing WebP images

## [1.7.3 – Webp Image Quality Fix] - 2024-06-18

- Fixed an issue when converting to webp degrades the quality of the image

## [1.7.2 — Bug Fix] - 2024-06-14

- Fixed a bug where the "Flip Images Vertically" command flipped the images horizontally

## [1.7.1 – WebP Hotfix] - 2024-01-29

- Fixed some commands (e.g. convert) looking for WebP binaries in the wrong location

## [1.7.0 — Strip EXIF Data, Filter Previews] - 2024-01-28

- Added "Strip EXIF Data" command
- Added real time filter previews
- Improved selection detection when Finder/Path Finder is not the frontmost application
- Fixed bug where converting from WebP to anything but PNG would change the file extension but not the file format

## [1.5.1 — Bug Fix] - 2023-10-05

- Fixed a bug where the "Convert Images" command failed for image paths containing dots. (#8549)

## [1.5.0 — Create Images, In-Clipboard Modification] - 2023-07-06

- Added settings to individually show/hide image formats from the list of conversion formats (#7023)
- Added settings for input source and output destination (e.g. clipboard, new file, replace original, etc.) (#6593)
- Made all commands work as expected regardless of input/output settings (i.e. you can rotate an image in the clipboard and immediately open it in Preview) (#7296)
- Added "Create Image" command to create image placeholders of various sizes, patterns, and colors
- Improved error handling for all commands, including copyable error messages
- Generally improved the code quality of the extension

## [1.4.1 – Optimize Images, SVG Conversion, More Filters] - 2023-04-03

- Added "Optimize Images" command
- Added ability to convert SVG to various image types
- Added ability to convert images to SVG using Potrace
- Added ability to convert PDF to various other image types
- Added ability to rotate and flip PDFs
- Added 13 new filters:
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

## [1.4 — WebP Support] - 2023-03-29

- Added WebP conversion support
- Added support for running SIPS commands on WebP (via temp file)
- Added Path Finder support — As preference toggle)

## [1.3 — Filters] - 2023-03-22

- Added "Apply Image Filter" command

## [1.2 — Padding, Bug Fixes] - 2023-03-15

- Added "Pad Images" command.
- Fixed compatibility with HEIC images and other formats. (#5238)

## [1.1 — Localization Fix] - 2023-03-07

- Updated the way the list of supported file types are handled

## [1.0 — Initial Version] - 2023-02-23
