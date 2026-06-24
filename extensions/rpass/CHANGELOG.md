# RPass Vault Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Add Vault command to browse, search, decrypt, copy, paste, edit, move, and delete password store entries
- Add New Entry command to generate and save passwords or passphrases
- Add Sync Vault command to inspect Git status and history, and run pull/push
- Add TOTP code generation with a live countdown for entries with an `otpauth` URI
- Add automatic setup flow to initialize the password store or add GPG recipients when missing
- Use `--passphrase-stdin` so GPG passphrases are never passed as command-line arguments
