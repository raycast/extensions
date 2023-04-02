# Image Modification Changelog

## [Optimize Images, SVG Conversion, More Filters] - 2023-04-03

- Add "Optimize Images" command
- Add ability to convert SVG to various image types
- Add ability to convert images to SVG using Potrace
- Add ability to convert PDF to various other image types
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