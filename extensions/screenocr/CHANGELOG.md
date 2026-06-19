# ScreenOCR Changelog

## [Improvements] - 2026-01-19

- Added [cross-extension support](https://github.com/LitoMore/raycast-cross-extension-conventions) to enable OCR results to be used by other extensions
- Added documentation to include [cross-extension usage](docs/cross-extension-usage.md)
- Improved type safety for cross-extension callbacks by introducing `OCRResult` and `LaunchContext` types with `satisfies` validation
- Refactored code to use early returns for improved readability
- Modernized error handling using `@raycast/utils` while respecting user preferences
- Updated dependencies

## [Improvements] - 2026-01-17

- Fix caching issues

## [Improvements] - 2025-11-13

- Added option to hide toast messages
- Added option to mute shutter sound

## [Improvements] - 2025-07-13

- Added support for Arabic and Najdi languages
- Added support for detecting barcodes and QR codes

## [Improvements] - 2024-10-07

- Migrated codebase to use new Swift macros
- Replaced all HUDs with emojis with styled toast messages for user feedback
- Added list section to the `Select Recognition Languages` command
- Grouped checkbox preferences into a single section

## [Fixes & Improvements] - 2024-05-21

- Selecting an area for text recognition left the original image in the clipboard
- Users can choose whether to copy the original image to the clipboard or not

## [Improvements] - 2023-10-24

- Ignore line breaks feature
- Support for Thai and Vietnamese languages
- Custom words list
- Bug causing some languages not to work
- Formatting issues

## [Initial Version] - 2023-04-26
