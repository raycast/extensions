# Changelog

## [Sharper Scrambling] - 2026-07-18

- Preserved the writing system and visual footprint of Unicode decimal digits.
- Added clear no-op feedback for punctuation-only and non-scramblable selections.
- Ignored whitespace-only sources when choosing between selection and clipboard.
- Kept source fallback working when either selection or clipboard access fails.

## [Initial Release] - 2026-07-18

- Added shape-matched, pronounceable invented-word scrambling.
- Preserved whitespace, punctuation, token length, casing, and line breaks.
- Added selected-text and clipboard source priority.
- Added replace-selection and copy-only output.
- Added optional numeral preservation.
- Kept all processing private and on-device.
