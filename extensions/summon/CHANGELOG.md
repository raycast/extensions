# Changelog

## [Browser Tabs & Async Loading] - {PR_MERGE_DATE}

- **Browser Tabs** — Tabs from Chrome, Brave, Safari, Edge, and Arc appear as searchable items grouped by browser window. Jump directly to any tab.
- **Async loading** — Window and tab discovery runs asynchronously in the background. The group list is interactive immediately — no more UI freezes.
- **Instant display** — Previously fetched windows and tabs are cached and shown on first render, then refreshed in the background.
- Stale cached tabs are cleared when a browser is no longer running
- Tab switch failures now show an error toast instead of silently proceeding

## [Layout Restore, App Relaunch & Snapshot] - {PR_MERGE_DATE}

- **Open Windows** — The Summon Group list now shows all open windows below your groups, doubling as a universal app/window switcher. Search by app name or window title to jump to any window instantly.
- **Layout Restore** — Opt-in per group: save window positions and sizes, restore them on summon
- **App Relaunch** — Opt-in per group: offer to relaunch closed apps when summoning
- **Snapshot Layout** — Quick action (`Cmd+S`) to re-capture current window positions without editing the group
- **Reorder Groups** — Move groups up/down in the list with `Cmd+Opt+Arrow`
- Monitor disconnect detection: falls back to raise-only when a saved display is no longer connected
- Relaunched apps are polled for readiness and positioned after launch (5s timeout)
- Removed hotkey slots in favor of group list ordering (bind double-Cmd to "Summon Group" for fast access)

## [Initial Version] - {PR_MERGE_DATE}

- Create window groups by selecting from open windows
- Summon groups to raise all associated windows to the front
- Assign groups to hotkey slots (1–5) for instant summoning
- Smart window matching: window ID → title substring → bundle ID fallback
- Data migration support across storage format versions
