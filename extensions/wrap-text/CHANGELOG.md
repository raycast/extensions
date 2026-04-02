# Wrap Text Changelog

## [Fix] - 2026-03-30

- Fix clipboard race condition: add delay before restoring previous clipboard content
## [Initial Version] - 2026-03-23

- Added 6 individual wrap commands: Brackets, Single Quotes, Double Quotes, Curly Brackets, Parentheses, and Wrap with Custom Characters
- Each command can be assigned its own hotkey in Raycast
- Clipboard is preserved after wrapping
- Shared `wrap` and `wrapSelectedText` utilities to reduce code duplication
