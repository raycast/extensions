# Vaultcast Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search, copy and paste passwords, usernames, emails and TOTP codes from CLI-based password managers.
- Built-in Proton Pass adapter with session PIN support.
- External adapters: add any password manager through a script and a `pwm-adapter.json` manifest.
- Search one or all configured password managers at once.
- Optional extension session that re-unlocks password managers until it times out, with Touch ID to resume on macOS.
- Copied credentials stay out of clipboard history and are cleared from the clipboard after 2 minutes.
