# Clean Text Changelog

## [Fix Active App Paste] - 2026-07-07

- Fixed a crash that could occur when pasting cleaned text if Raycast couldn't resolve the active app bundle.
- Falls back to copying the cleaned text when pasting to the active app fails.

## [Initial Version] - 2025-10-09

- Initial release of Clean Text Raycast Extension
- Features:
	- Normalize whitespace into single spaces
	- Unify quotes (single, double, or smart)
	- Remove invisible characters (e.g., zero-width spaces)
	- Standardize line breaks
	- Merge text into one paragraph
	- Remove numbering and bullets
	- Capitalize sentences with abbreviation handling
- Configuration:
	- Quote style selection
	- Whitespace type selection
	- Line break options
	- Abbreviation list
	- Text source preference
	- Action: copy or paste
- Combo setup for quick repeated tasks
