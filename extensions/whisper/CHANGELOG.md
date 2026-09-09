# Whisper - Share Secrets

## [Zero-Knowledge Encryption & Multiple Values] - {PR_MERGE_DATE}

- Secrets are now encrypted on your Mac with AES-256-GCM before anything leaves it; the decryption key travels only in the link's `#` fragment and is never sent to any server
- Automatic fallback to the previous behavior for older self-hosted servers
- New Multiple Values mode in Create Secret: structured key/value entries with optional sections, encrypted locally and shared as one secret

## [Initial Version] - 2026-03-27

- Quick command to create encrypted secret links directly from Raycast
- Form-based command with expiration and self-destruct options
- Configurable expiration: 30 minutes, 1 hour, 24 hours, or 7 days
- Self-destruct option to delete secret after first view
- Self-hosted server support via preferences
- AI tool integration for creating secrets
