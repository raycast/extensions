# Resize Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Resize the front Chrome window so its **viewport** matches a device preset, measured live rather than guessed — the window chrome delta is computed from `innerWidth`/`innerHeight` on every run, so bookmarks bars, zoom state, and always-visible scrollbars stay accounted for.
- 14 built-in presets across MacBooks, iPads, iPad Split View widths, and iPhones, using the same dimensions Chrome DevTools reports for each device.
- **Cycle Breakpoints** command for stepping through a three-slot rotation on a single hotkey, configurable in extension preferences.
- **Phone Presets** preference to either resize the window directly or hand off to Chrome DevTools device mode for touch, DPR 3, and safe-area testing.
- Custom presets in `~/.config/resize/presets.json`, merged over the built-ins by id.
- **Measure Viewport** command for inspecting the current viewport, window bounds, chrome delta, and zoom state.
- Guards against silently wrong results: aborts when Chrome zoom is not 100%, clamps presets taller than the display and says so, and distinguishes a disabled Apple Events setting from an internal `chrome://` tab.
