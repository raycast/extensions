# TinyPNG Changelog

## [Updated dependency] - 2025-03-04

- Updated `vitest` version to `^2.1.9`

## [Minor improvements] - 2024-09-20

- Update dependencies
- Make the `method` in `Resizing Images` a Dropdown instead of a Text Field
- Fix the resize method for `scale`, where width and height are not both required
- In case a user sets the `Destination Folder Path` to the same folder, but doesn't enable `Overwrite Original Image File`, add `.compressed` or `.resized` to the file name to avoid overwriting the original file

## [New Features] - 2023-04-22

Enabled the ability to set the destination folder path.

## [New Features] - 2023-02-11

Added options to overwrite images.

## [Improvement] - 2022-09-12

Changed API calls from serial to parallel.
Improved performance when compressing multiple images at once.

## [Initial Version] - 2022-08-29
