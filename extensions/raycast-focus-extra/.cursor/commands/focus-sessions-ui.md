# Focus Sessions UI

## Goal

Implement or refine the focus sessions table/timeline UI.

## Steps

1. Resolve data source (e.g. `~/Library/Application Support/Raycast/`, SQLite via executeSQL, or plist/JSON).
2. Add or update command with view mode; use List or Detail (or Grid) for sessions.
3. Add day picker if needed (List.Dropdown or preference).
4. Show session times and “what’s done” per session; use List.Item.Detail or Detail view for richer layout.
