# Font Converter Changelog

## [OTF Conversion, Windows File Selection, and AI Tools] - {PR_MERGE_DATE}

- Added reliable OTF input conversion to TTF, WOFF, WOFF2, and EOT. Web formats preserve the source outlines and tables, with warnings when converting CFF outlines to TrueType.
- Added a font file picker for every command on Windows and a fallback when no font is selected in Finder on macOS.
- Added AI tools to convert fonts, inspect metadata, and generate CSS from explicit local file paths.
- Prevented conversion from overwriting existing font files and added actions to reveal the saved file or copy its path.
- Fixed previews and metadata for CFF-backed WOFF and WOFF2 files, and corrected CSS format descriptors and string escaping.

## [Windows Support] - 2026-05-26

- Added Windows Support
- Updated font preview to use a dark background so the text is visible

## [Added Font Converter] - 2026-01-23

Initial release.
