# Whisper - Share Secrets

## [Multiple Values mode] - {PR_MERGE_DATE}

- Added **Multiple Values** mode to the Create Secret form
- Build structured secrets as JSON key-value pairs, optionally grouped into named sections
- Tab between Key and Value fields; add entries and sections via the Actions menu (⌘K)
- Remove individual entries or entire sections contextually based on focus
- Full validation: partial rows, duplicate keys, empty sections surface as toast errors

## [Initial Version] - 2026-03-27

- Quick command to create encrypted secret links directly from Raycast
- Form-based command with expiration and self-destruct options
- Configurable expiration: 30 minutes, 1 hour, 24 hours, or 7 days
- Self-destruct option to delete secret after first view
- Self-hosted server support via preferences
- AI tool integration for creating secrets
