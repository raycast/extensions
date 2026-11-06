# Caps Lock Changelog

## [On, Off & Menu Bar Indicator] - {PR_MERGE_DATE}

- Turn Caps Lock On / Turn Caps Lock Off commands that set an exact state (great for hotkeys and Quicklinks).
- Caps Lock Indicator menu bar item that appears while Caps Lock is on, with a one-click toggle.
- The HUD now shows ⇪ so the state is obvious at a glance.
- New icon.

## [Initial Version] - 2026-10-13

- Toggle the macOS Caps Lock state independently of the physical key and its remapping.
- Show a brief confirmation of the verified Caps Lock state.
- Build the native helper from a Swift Package through Raycast's Swift bridge.
- Recover from stalled keyboard calls and serialize overlapping toggles.
