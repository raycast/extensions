# Quick Quote Changelog

## [Initial Version] - 2026-08-25

- Quick Quote command: prefix every line of the current selection with `> ` and paste it back into the focused app
- Reads the selection via the macOS Accessibility API, with a Cmd+C clipboard fallback for terminals (handles auto-copy-on-select)
- Normalizes CRLF/CR line endings and always restores the original clipboard (text, HTML, or file), including when the Cmd+C fallback or paste fails
- Verifies the Cmd+C fallback via the pasteboard change count, so a stale clipboard is never quoted or pasted
