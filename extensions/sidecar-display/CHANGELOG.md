# Sidecar Display Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Connect and disconnect an iPad over Sidecar from Raycast, forcing it to **extend** (or mirror) without ever writing or moving the main display.
- Two interchangeable engines: **BetterDisplay** (via `betterdisplaycli`) and a **Native** helper (macOS SidecarCore + CoreGraphics, no dependency), with an **Automatic** default that picks BetterDisplay when installed.
- **Fix Mirroring** command and menu-bar action to clear macOS Sidecar's own mirror mode by reconnecting the main BetterDisplay virtual screen, with an opt-in to run it automatically on a fresh connect.
- **Auto-Reconnect** background command that restores a link that dropped on its own (e.g. after waking from sleep), with fully configurable backoff, a heartbeat that never abandons a wanted link, a preference default, and a one-click menu-bar toggle to switch it on or off.
- **Sidecar Status** menu-bar item with a device picker, connect / disconnect / extend / mirror actions, and an Auto-Reconnect toggle, designed to stay friendly with menu-bar managers like Bartender.
