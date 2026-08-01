# Tunnel List Keyboard Interaction Design

## Summary

Update the Raycast tunnel list so keyboard interaction matches the requested workflow:
- `Space` toggles the selected tunnel between start and stop
- `Enter` opens a submenu containing the rest of the tunnel actions, such as edit and logs

This keeps the fast operational shortcut on a single key while reserving `Enter` for discovery of additional actions.

## Current State

File: `src/manage-tunnels.tsx`

Today each `List.Item` exposes a standard `ActionPanel` where the first action is start/stop. In Raycast, the first action becomes the primary action and is triggered by `Enter`. That means `Enter` currently runs start/stop instead of opening a menu of actions. There is also no `Space` shortcut assigned to tunnel toggling.

## Goals

- Make `Space` the direct toggle shortcut for the selected tunnel
- Make `Enter` open a grouped action menu for the selected tunnel
- Keep edit, logs, restart, copy address, and delete available from that menu
- Preserve existing explicit power-user shortcuts where they still make sense

## Non-Goals

- Redesign the tunnel list layout or item accessories
- Change tunnel start/stop logic in `src/lib/process.ts`
- Add new persistence or config fields

## Recommended Approach

Use an `ActionPanel.Submenu` as the first action for every tunnel row.

### Why this approach

Raycast maps `Enter` to the first action in the `ActionPanel`. A submenu can serve as that first action, so pressing `Enter` opens the submenu rather than immediately executing start/stop. The existing start/stop handler can stay intact and simply move inside the submenu with an explicit `Space` shortcut.

### Alternatives considered

1. Keep start/stop as the first action and assign only `Space`
   - Simpler, but `Enter` would still trigger start/stop and would not match the requested behavior.
2. Make edit the first action
   - Fast for editing, but the user asked for `Enter` to expose the rest of the actions, not jump straight into edit.
3. Add a second screen or detail view for actions
   - Unnecessary complexity for a small interaction change.

## Detailed Design

### Action ordering

For each tunnel row in `src/manage-tunnels.tsx`:

1. First action: `ActionPanel.Submenu` titled something like `Tunnel Actions`
2. Inside the submenu, include:
   - Start/Stop Tunnel with `Space`
   - Edit Tunnel with existing `Cmd+E`
   - Show Logs with existing `Cmd+L`
   - Restart Tunnel with existing `Cmd+R`
   - Copy Local Address with existing `Cmd+.`
   - Delete Tunnel with existing `Ctrl+X`
3. Keep `Add Tunnel` available outside the submenu as a top-level action so global creation remains easy to access

### Interaction flow

- User moves selection to a tunnel row
- Pressing `Space` executes the start/stop action immediately for that row
- Pressing `Enter` opens the submenu for that row
- Inside the submenu, the user can choose edit, logs, restart, copy, or delete

### State handling

No new state is required. The existing `toggle`, `restart`, and `remove` functions remain the source of truth. The change is only how actions are exposed in the `ActionPanel`.

## Error Handling

Existing toast-based success and failure handling should remain unchanged:
- Toggle errors still surface via the current failure toast
- Restart errors still surface via the current failure toast
- Delete still uses the existing confirmation alert

No new error paths are introduced by the keyboard mapping change.

## Testing Strategy

Because this project currently has no UI tests around Raycast action wiring, verification will focus on:

1. Type and lint validation for `src/manage-tunnels.tsx`
2. Manual behavioral validation in Raycast:
   - `Space` toggles a stopped tunnel to running
   - `Space` toggles a running tunnel to stopped
   - `Enter` opens the submenu instead of directly toggling
   - Edit and logs remain reachable from the submenu
   - Existing shortcuts such as `Cmd+E` and `Cmd+L` still work

If implementation starts later, the plan can decide whether to add targeted tests or rely on lint plus manual validation, depending on what is realistic in Raycast’s UI environment.

## Files Affected

- Modify: `src/manage-tunnels.tsx`
- No other source files should require changes for this feature

## Acceptance Criteria

- Selecting a tunnel and pressing `Space` starts or stops it
- Selecting a tunnel and pressing `Enter` opens a submenu of actions
- Edit and logs are available from the submenu
- Existing tunnel process behavior remains unchanged
- The command still passes project verification checks
