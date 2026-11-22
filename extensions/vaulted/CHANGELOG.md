# Vaulted Raycast Changelog

## [Passphrase Link Compatibility] - 2026-11-06

- Passphrase-protected links created on vaulted.fyi now open in View Secret, and passphrase links created in Raycast now open on vaulted.fyi. Updates `@vaulted/crypto` to 1.1.0, which derives the passphrase key with 600,000 PBKDF2 iterations.
- Passphrase links created by earlier versions of the extension (100,000 iterations) still open.

## [Initial Version] - 2026-07-07

- Create Secret command — Form for textarea, max views, expiry, optional passphrase. Encrypts client-side, copies the share link to the clipboard.
- Create Secret from Clipboard command — No-view hotkey path. Encrypts current clipboard contents with default settings.
- View Secret command — Paste a Vaulted link to decrypt; confirms before consuming a view.
- Zero-knowledge end-to-end encryption via the published `@vaulted/crypto` package — same AES-256-GCM primitives as vaulted.fyi, the CLI, the MCP server, and the GitHub Action.
- Self-hosted host support via the `host` preference. HTTPS-only (with `http://localhost` allowed for development).
- Configurable defaults for max views, expiry, auto-copy, open-in-browser, and "confirm before consume."
- Identifies as `User-Agent: vaulted-raycast/{version}` and surfaces server-supplied error messages to the user.
