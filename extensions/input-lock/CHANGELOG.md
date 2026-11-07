# Input Lock Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Lock keyboard and trackpad until you unlock with Touch ID or a secret key sequence
- Falls back to your Mac password if Touch ID is locked out after failed attempts
- 10-minute cooldown after 3 failed sequence attempts
- "Lock Keyboard Only" command that keeps the trackpad working
- Optional per-lock auto-unlock duration argument (e.g. `5m`, `90s`, `1h30m`)
- On-screen overlay (key presses are never shown), unlock sound and "Unlocked" confirmation
- Safety nets: auto-unlock timer, release on secure keyboard entry
