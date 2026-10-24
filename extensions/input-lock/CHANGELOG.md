# Input Lock Changelog

## [Initial Version] - 2026-10-14

- Lock keyboard and trackpad until a secret key sequence is typed
- "Lock Keyboard Only" command that keeps the trackpad working
- Optional per-lock auto-unlock duration argument (e.g. `5m`, `90s`, `1h30m`)
- On-screen overlay with typing progress, unlock sound and "Unlocked" confirmation
- Safety nets: auto-unlock timer, release on secure keyboard entry
