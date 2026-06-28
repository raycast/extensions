# AI Extension: Microsoft Teams Presence Tools

**Date:** 2026-06-28
**Status:** Approved

## Goal

Add Raycast AI Extension capabilities to the existing Microsoft Teams
extension so the user can **determine** and **set** their own Microsoft Teams
presence through Raycast AI (natural-language chat / AI commands).

## Scope

- Own presence only: get + set.
- Setting includes a `Reset` value to return to automatic presence.
- **Out of scope:** other users' presence, status messages (`setStatus`),
  confirmation dialogs.

## Background

The extension already exposes a clean API layer in `src/api/presence.ts`:

- `getPresence(entityId?)` → `{ id, availability, activity }`
- `getAvailability()` → `availability` string
- `setAvailability(availability?)` → sets preferred presence (or clears it when
  called with `undefined`) and shows a HUD
- `clearPreferredPresence()` → clears preferred presence

The existing `setPresence.tsx` view command lists the presence options,
including a "Clear Presence" entry, and shows the current presence as active.

Raycast AI Extensions are defined via a `tools` array in `package.json` plus
one file per tool under `src/tools/`. Each tool exports a `default` async
function and, when it needs parameters, an `Input` type. The function's return
value is surfaced to the AI as the tool result.

## Approach

Two thin tools wrapping the existing API — no new presence/API logic:

- **`get-presence`** — determines the user's current presence (no parameters).
- **`set-presence`** — sets the user's presence; enum parameter including
  `Reset` to return to automatic.

No confirmation dialogs. No access to other users.

## Refactor: decouple result message from HUD

`setAvailability` currently couples the set logic to `showHUD(...)`. For AI
tools a HUD is redundant (the AI reports the result itself) and a returned
string is useful instead.

Extract the human-readable result text into a pure function, e.g.:

```ts
export function presenceResultMessage(availability?: Availability): string
```

- `setAvailability` (used by the `setPresence` view command) keeps its current
  behavior: perform the set, then `showHUD(presenceResultMessage(availability))`.
- The `set-presence` AI tool uses the same set logic and **returns**
  `presenceResultMessage(availability)` as a string (no HUD).

This keeps the `setPresence` view command's behavior unchanged and lets both
paths share exactly the same logic and texts.

## Tool details

### `get-presence`

- Inputs: none.
- Calls `getPresence()`.
- Returns the current presence in a readable form, e.g. availability +
  activity (e.g. `availability: "Available", activity: "Available"`).

### `set-presence`

- `Input`: `{ availability: "Available" | "Busy" | "DoNotDisturb" |
  "BeRightBack" | "Away" | "Offline" | "Reset" }`
- `Reset` → `clearUserPreferredPresence` (via `setAvailability(undefined)`).
- All other values → `setUserPreferredPresence` (via `setAvailability(value)`).
- Returns the result message (including the existing expiry hint, e.g.
  "expires in 1 day" / "expires in 7 days").
- No confirmation dialog.

Note: `PresenceUnknown` is not exposed as a settable value.

## package.json

Add a `tools` array with the two tool definitions (`name`, `title`,
`description`). Raycast invokes these automatically when the user asks the AI
about their Teams presence.

## Error handling

Errors (auth, network) are thrown by `failIfNotOk` as today; Raycast surfaces
them in the AI chat. Auth and token refresh run transparently via the existing
`api.ts` / `login.ts`.
