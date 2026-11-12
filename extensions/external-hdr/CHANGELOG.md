# External HDR Changelog

## [Store readiness] - 2026-11-11

- Set the author to the real Raycast handle, `jjuan`
- Added ESLint/Prettier and fixed the lint findings (action title case, common shortcut)
- Always use the extension's author for the "Open HDR on Connect" deeplink
- Commit `assets/hdrctl` so Store and clone builds ship a working binary
- Added `SECURITY.md` and a GitHub Actions build that recompiles the helper

## [Dynamic Subtitle] - 2026-11-11

- Toggle HDR now shows the next action and current state in its subtitle
  (`Disable HDR — LG HDR 4K`), refreshed after each toggle and every minute
- HDR Displays shows the live target state in its subtitle
  (`HDR on — LG HDR 4K`); HDR on Connect reports whether auto-apply is armed
- Background-refresh runs are guarded so they only update the label, never the display

## [Initial Version] - 2026-11-11

- `hdrctl` CLI: list displays, read HDR state, set/toggle HDR, watch display reconfiguration
- Toggle HDR command with preference-aware display targeting
- HDR Displays menu-bar command with live state
- HDR on Connect view with per-display rules and an opt-in launchd watcher
