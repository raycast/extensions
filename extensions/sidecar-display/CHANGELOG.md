# Sidecar Display Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Connect and disconnect an iPad over Sidecar from Raycast, forcing it to **extend** (or mirror) without ever writing or moving the main display.
- Two interchangeable engines: **BetterDisplay** (via `betterdisplaycli`) and a **Native** helper (macOS SidecarCore + CoreGraphics, no dependency), with an **Automatic** default that picks BetterDisplay when installed.
- **Fix Mirroring** command and menu-bar action to clear macOS Sidecar's own mirror mode by reconnecting the main BetterDisplay virtual screen, with an opt-in to run it automatically on a fresh connect.
- **Auto-Reconnect** background command that restores a link that dropped on its own (e.g. after waking from sleep), with a preference default and a one-click menu-bar toggle to switch it on or off.
- **Presence detection.** Each background tick first runs a silent check for whether the iPad is actually within reach, and only attempts a connection when it is. macOS posts a system notification for every _failed_ Sidecar connect, so an iPad that is away or asleep would otherwise produce one of those every retry, indefinitely; instead it costs nothing, and the link is restored on the first tick after the iPad returns. A configurable **Give Up After** window stops chasing an iPad that looks present but will not connect, and its clock only runs while the iPad is detected nearby, so time genuinely away never counts against it.
- **Sidecar Status** menu-bar item with a device picker, connect / disconnect / extend / mirror actions, and an Auto-Reconnect toggle, designed to stay friendly with menu-bar managers like Bartender. The icon shows three states at a glance — connected (green), nearby and ready to connect, or out of reach (greyed) — and refreshes both on a schedule and immediately whenever the link changes.
