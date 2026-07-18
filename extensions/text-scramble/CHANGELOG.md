# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Added shape-matched, pronounceable invented-word scrambling.
- Preserved whitespace, punctuation, token length, casing, and line breaks.
- Added selected-text and clipboard source priority with safe fallback behavior.
- Added replace-selection and copy-only output.
- Preserved the writing system and visual footprint of Unicode decimal digits.
- Added optional numeral preservation and clear no-op feedback.
- Preserved existing clipboard contents after replacing selected text.
- Protected unsupported rich clipboard items by stopping before an unsafe paste.
- Kept composed and decomposed accented words consistent without cache-length mismatches.
- Kept all processing private and on-device.
