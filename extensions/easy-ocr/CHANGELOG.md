# Tesseract OCR Changelog

## [Bug Fixes] - 2026-10-17

- Fixed screenshot capture failing when the path contains spaces

## [Apple Vision Engine] - 2026-10-14

- Added Apple Vision (the engine behind macOS Live Text) as an optional OCR engine that needs no Tesseract install
- Added an "Apple Vision Languages" preference, e.g. `ar-SA,en-US` for Arabic with English
- Apple Vision reads small Arabic captures that Tesseract returns empty for

## [Bug Fixes] - 2026-06-23

- Kept the first OCR result when autodetected languages are not installed in Tesseract

## [Enhancements] - 2025-04-15

- Added automatic language detection option with either Raycast AI, Franc, LanguageDetect or Tinyld
- Language used for OCR is now being displayed on successful OCR toast
- Added fallback language (english) if user types wrong language code in options

## [Bug Fixes] - 2025-03-26

- Fixed error when running command twice in short time (not visible to user)
- Updated extension description

## [Enhancements] - 2023-11-13

- Add support for additional Tesseract languages

## [Initial Version] - 2023-10-19
