# DNB Book Lookup Changelog

## Initial release — 2026-05-11

### Added

- Look up book contents from Deutsche Nationalbibliothek (DNB) by ISBN-10 or ISBN-13
- Automatic ISBN-to-IDN conversion via DNB SRU API
- Availability check for table of contents (/04) and content text (/34)
- Auto-fill ISBN from selected text when the command argument is empty
- Configurable preference: open table of contents, content text, or both
- Automatic fallback to catalog entry when no digitized content is available
- Optional AI Klappentext generation (max. 150 words) with source verification
  - TOC quality assessment before generation
  - Google Books and Wikipedia as external sources
  - Confidence scoring (0–100%) with source transparency
  - Anti-hallucination: returns "insufficient data" instead of inventing content
- 5 search keywords generated alongside Klappentext
- Fallback to PDF when AI is unavailable or generation fails
