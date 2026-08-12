# Changelog

## [Meeting Deck Overhaul] - 2026-08-12

Major overhaul, contributed by the MuteDeck team.

### New

- **Meeting Deck**: the Show Status command is now a live Stream Deck-style grid — tiles recolor with your real mute/camera/share/recording state (red = muted/recording, green = on, dimmed = unavailable) and refresh every second while open. Press ↵ on a tile to toggle it.
- **Toggle Screen Share** and **Toggle Recording** commands.
- **Bring to Front** action in the Meeting Deck to jump to your call window.
- The in-call platform (Zoom, Teams, Meet, Webex, …) is shown in the Meeting Deck header.
- New tile-style command icons matching MuteDeck's deck plugins.

### Improved

- Toggle commands now show a HUD with the state MuteDeck actually ended up in (the status API lags a moment behind an action, so the extension polls until the state flips instead of reporting a stale value).
- Microphone toggling now also works outside meetings (system-level mute).
- Friendlier offline state with a one-click "Open MuteDeck" action.
- Faster feedback: commands close the Raycast window immediately and confirm via HUD.

### Changed

- Removed the `node-fetch` dependency in favor of the built-in `fetch`.
- Removed the Status Refresh Interval, API Timeout and Show Toast Notifications preferences — the extension now uses sensible fixed values (1s refresh, 3s timeout) and always confirms actions via HUD.
- Kept the confirmation preferences (leave meeting, mute/video while presenting) and the API Endpoint preference.

## [Fix commands failing when not in a meeting] - 2026-08-03

- Fixed all four commands failing with "Invalid API response format" whenever no meeting was active. MuteDeck 4.x reports `call: "inactive"`, but the status validator only accepted `call` being absent or `"active"`, so `getStatus()` threw before any command could run.
- Unrecognized `control` platforms are now logged and allowed through instead of failing validation, so a future MuteDeck release adding a conference app cannot break every command the same way. A non-string `control` is still rejected.

## [Initial Version] - 2025-03-02

- Initial version of the MuteDeck extension
