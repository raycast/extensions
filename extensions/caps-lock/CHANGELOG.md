# Caps Lock Changelog

## [Document Shift Hotkey Workaround] - {PR_MERGE_DATE}

- Document the reported both-sided Shift hotkey failure when Caps Lock is enabled, the affected configuration, and the verified Control + Option + C workaround.

## [Initial Version] - 2026-10-13

- Toggle the macOS Caps Lock state independently of the physical key and its remapping.
- Show a brief confirmation of the verified Caps Lock state.
- Build the native helper from a Swift Package through Raycast's Swift bridge.
- Recover from stalled keyboard calls and serialize overlapping toggles.
