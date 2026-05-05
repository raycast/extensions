# Large Clipboard History Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add **Watch Clipboard** background command that captures clipboard text above Raycast's 32,768-character clipboard history cap every 10 seconds.
- Add **Large Clipboard History** view command with substring search, paste-back, copy-back, full-content detail view, and delete actions. Captures the current clipboard on open so a freshly copied large clip is in the list instantly.
- Store clips locally in SQLite via Node's built-in `node:sqlite` under the extension's support directory, keyed on a SHA-256 fingerprint for atomic dedupe.
- Add **Max Entries** preference (default 500) for size capping with oldest-first eviction.
- Text-only by design — non-text clipboards (images, files copied from Finder without a text representation) are silently skipped.
