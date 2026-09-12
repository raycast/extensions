# Changelog

## [Initial Release] - 2026-08-13

- Added shape-matched, pronounceable invented-word scrambling.
- Preserved whitespace, punctuation, token length, casing, and line breaks.
- Added selected-text and clipboard source priority with safe fallback behavior.
- Added replace-selection and copy-only output.
- Preserved the writing system and visual footprint of Unicode decimal digits.
- Added optional numeral preservation and clear no-op feedback.
- Preserved existing clipboard contents after replacing selected text.
- Protected unsupported rich clipboard items by stopping before an unsafe paste.
- Protected file-bearing clipboards whose text representation cannot be restored losslessly.
- Retried transient clipboard restoration failures and reported persistent failures with a recovery path.
- Stopped safely when clipboard access fails instead of acting on a different source.
- Preserved Unicode titlecase letters as uppercase-shaped invented copy.
- Kept composed and decomposed accented words consistent without cache-length mismatches.
- Kept all processing private and on-device.
