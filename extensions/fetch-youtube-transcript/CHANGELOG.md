# Fetch Youtube Transcript Changelog

## [1.1.5] - 2024-12-18

### Fixed

- Now extension shows clear error if no transcript is found

## [1.1.4] - 2024-12-14

### Added

- Added support for all major languages:

1. Arabic (ar)
2. Bengali (bn)
3. Chinese (zh)
4. English (en)
5. French (fr)
6. German (de)
7. Hindi (hi)
8. Italian (it)
9. Japanese (ja)
10. Korean (ko)
11. Marathi (mr)
12. Portuguese (pt)
13. Russian (ru)
14. Spanish (es)
15. Tamil (ta)
16. Urdu (ur)

## [1.1.3] - 2024-12-10

### Fixed

- Fixed issue due to ytdl-core

## [1.1.2] - 2024-12-04

### Changed

- Improved transcript filename generation to use video title instead of video ID
- Added filename sanitization to handle special characters in video titles
- Fixed issue where words from adjacent transcript lines were incorrectly joined together
- Improved transcript formatting with proper line spacing and word boundaries
- Added debug logging for better troubleshooting

## [1.1.1] - 2024-11-26

### Added

- Initial project setup
- Basic functionality for fetching YouTube transcripts

## [1.0.0] - 2024-09-18

### Initial Version

- Project initialization
- Core transcript fetching mechanism implemented
