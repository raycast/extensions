# Figma Link Cleaner Changelog

## [1.0.0] - 2026-01-19

### Added

- Initial release
- Clean Figma URLs by removing tracking parameters (`t`, `fuid`, `share_link_id`, etc.)
- Aggressive URL shortening: removes `www.` prefix and file name slugs
- Optional URL shortening via fgma.cc for ultra-short links
- Works directly from Figma (sends Cmd+L to copy link)
- Works from clipboard (cleans any Figma URL already copied)
- Default hotkey: Control+L
- Graceful error handling with helpful toast messages
- Accessibility permission guidance
