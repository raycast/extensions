# Raycast Backup & Sync Changelog

## [Initial Version] - 2026-06-30

- Back up Raycast's local data to Google Drive as a versioned, compressed archive.
- Restore a chosen backup onto the same machine, with an automatic pre-restore safety copy and SHA-256 integrity check.
- Manage backups: browse details, delete, and disconnect the Google account.
- Quits/checkpoints Raycast for a consistent snapshot; warns on cross-device restore (encrypted databases are bound to the original Mac's Keychain key).
- Per-device retention policy and optional exclusion of clipboard history.
