# Whisper - Share Secrets

## [Retrieve Secrets, Selection Sharing & Safer Defaults] - 2026-09-19

- New Retrieve Secret command: paste a Whisper link to fetch and decrypt the secret on your device, with a confirmation before a single-view link is consumed; Multiple Values secrets are shown as a list with per-value copy
- New Whisper Selected Text command: encrypt the selected text (or the clipboard) into a link with your default settings, ideal behind a hotkey
- Links and revealed secrets are copied as concealed so they never appear in Raycast's Clipboard History
- The quick command masks the secret while you type instead of showing it in the search bar
- New preferences for the default expiration and self-destruct behaviour, applied by every command and the AI tool
- Secrets larger than 64 KB are rejected before upload with a clear message, measured on the encrypted payload so the limit is exact
- Retrieval refuses plain-HTTP links to remote servers, and keeps any path prefix in a self-hosted server URL
- Breaking: the quick command now takes a single masked `secret` argument, replacing the old `text` argument and its trailing `1h false` syntax, so any Quicklink built on the old name needs updating. Expiration and self-destruct follow your preferences; use Create Secret when you want to choose them per secret

## [Zero-Knowledge Encryption & Multiple Values] - 2026-09-16

- Secrets are now encrypted on your Mac with AES-256-GCM before anything leaves it; the decryption key travels only in the link's `#` fragment and is never sent to any server
- Self-hosted servers without the zero-knowledge endpoint (older than Whisper 1.3) are rejected with a clear error instead of receiving the plaintext
- New Multiple Values mode in Create Secret: structured key/value entries with optional sections, encrypted locally and shared as one secret
- Multiple Values keyboard shortcuts work on both macOS and Windows; a trailing slash in the server URL preference no longer breaks requests

## [Initial Version] - 2026-03-27

- Quick command to create encrypted secret links directly from Raycast
- Form-based command with expiration and self-destruct options
- Configurable expiration: 30 minutes, 1 hour, 24 hours, or 7 days
- Self-destruct option to delete secret after first view
- Self-hosted server support via preferences
- AI tool integration for creating secrets
