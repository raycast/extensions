# AI Extension: Microsoft Teams Status Tools (+ Presence consistency)

**Date:** 2026-06-28
**Status:** Approved

## Goal

Add Raycast AI Extension tools so the user can **get**, **set**, and **clear**
their own Microsoft Teams status message via Raycast AI. As part of this,
align the existing presence tools to the same get/set/clear pattern.

## Scope

- Own status message only: get + set + clear.
- `set-status` sets text, an optional expiry, and an optional `pinned` flag
  ("show when people message me") that **defaults to true**.
- `set-status` shows a **confirmation** before applying (the user reviews the
  AI-generated text); the other tools have no confirmation.
- Presence consistency: add `clear-presence`; remove the `"Reset"` value from
  the `set-presence` tool's enum.
- Cleanup of existing `setStatus`: stop writing the year-9999 "never" sentinel;
  omit `expiryDateTime` instead.
- **Out of scope:** other users' status, changing presence from within
  `set-status`.

## Background

Microsoft Graph exposes the status message as part of the **presence**
resource (`GET /me/presence`, v1.0 — already used by `getPresence()`):

- `statusMessage.message.content` — the text (`contentType: "text"`).
- `statusMessage.expiryDateTime` — `{ dateTime, timeZone }`; available only for
  one's own presence. *If not provided when setting, the status doesn't expire.*
- `statusMessage.publishedDateTime` — read-only ISO timestamp; own presence only.

The existing `src/api/status.ts` can only `setStatus` (via the `beta`
`setStatusMessage` action) and `clearStatus`. There is no read function.
`setStatus` currently appends a pinned marker `<pinnednote></pinnednote>` when
pinned, and writes a far-future expiry (`9999-12-30`, the `never` constant) when
no expiry is wanted.

Raycast AI tools live in `src/tools/<name>.ts` (default-exported async
function, optional `Input` type) and are registered in the `tools` array in
`package.json`.

## Tool landscape (after this work)

| Area     | get            | set                                  | clear            |
| -------- | -------------- | ------------------------------------ | ---------------- |
| Presence | `get-presence` | `set-presence` (enum **without** Reset) | `clear-presence` (new) |
| Status   | `get-status` (new) | `set-status` (new)               | `clear-status` (new) |

General principle followed: one clear intent per tool; parameters for genuine
variation; no "magic" sentinel values (e.g. `availability: "Reset"`) that
overload a tool's action.

## Presence changes

### `set-presence` tool (`src/tools/set-presence.ts`)

- Remove `"Reset"` from the `Input.availability` union; the union becomes the
  six real availabilities only.
- Remove the `"Reset" → undefined` mapping. The body becomes:
  `await applyAvailability(input.availability); return presenceResultMessage(input.availability);`
- Update the tool's `package.json` description to drop the "Reset" mention.

### `clear-presence` tool (`src/tools/clear-presence.ts`, new)

- No inputs.
- Calls the existing `applyAvailability(undefined)` (clears preferred presence).
- Returns `presenceResultMessage(undefined)` (i.e. "Reset availability to
  default").

No changes to `src/api/presence.ts` are needed — `applyAvailability` and
`presenceResultMessage` already exist from the prior presence work.

## Status API changes (`src/api/status.ts`)

`status.ts` stays self-contained (it does not depend on `presence.ts`). The
duplicated `"/me/presence"` endpoint string is an accepted trade-off for clean
module boundaries.

### Pinned marker constant

Extract the marker into a shared constant and reuse it in `setStatus`:

```ts
const PINNED_NOTE = "<pinnednote></pinnednote>";
```

### `setStatus` cleanup (existing behavior)

- When an expiry is provided, send `expiryDateTime`.
- When no expiry is provided, **omit `expiryDateTime` entirely** (do not send
  the year-9999 sentinel). Remove the `never` constant.
- From the user's perspective the view command behaves identically (no expiry =
  never expires); the request is just cleaner.
- When the expiry is sent, write it in **UTC** (`timeZone: "UTC"`, `dateTime`
  in UTC without offset). This is a small simplification over the current
  GB/"GMT Standard Time" zone and makes our own values round-trip cleanly.

### `getStatus` (new)

```ts
interface Status {
  message: string | null;    // text, pinned marker defensively stripped; null if no status
  expiry: string | null;     // absolute ISO timestamp; null = no expiry
  published: string | null;  // absolute ISO timestamp, when set (read-only)
}

export async function getStatus(): Promise<Status>
```

Behavior:

- `GET /me/presence` and read `statusMessage`.
- **message:** `statusMessage.message.content` or `null`. Defensively strip
  `PINNED_NOTE` if present (we are unsure whether Graph returns the marker on
  read), so the text is clean. No `pinned` field is returned.
- **expiry:** if `statusMessage.expiryDateTime` is absent or its `dateTime` is
  null → `null`. Otherwise convert `{ dateTime, timeZone }` to an absolute ISO
  timestamp. Timezone handling is intentionally minimal (this is an AI-only
  tool): interpret the `dateTime` with the returned `timeZone` if luxon
  understands it (`"UTC"` or an IANA name), otherwise fall back to UTC. No
  Windows-zone-name map is maintained. Statuses set through this extension are
  always written in UTC, so they round-trip exactly; only a status set
  externally (Teams app) with an unrecognized Windows zone could be off by its
  offset — acceptable. A defensive guard treats year ≥ 9999 (the legacy
  sentinel) and invalid dates as `null`.
- **published:** `statusMessage.publishedDateTime` (already an absolute
  DateTimeOffset string) or `null`.

## Status tools

### `get-status` (`src/tools/get-status.ts`, new)

- No inputs.
- Calls `getStatus()`, returns the `Status` object.

### `set-status` (`src/tools/set-status.ts`, new)

- `Input`:
  ```ts
  type Input = {
    /** The status message text. */
    message: string;
    /**
     * Optional absolute expiry as an ISO 8601 timestamp (e.g.
     * "2026-06-28T17:00:00Z"). Omit for a status that never expires.
     */
    expiry?: string;
    /**
     * Whether to also show the status above the compose box when people
     * message or @mention the user. Defaults to true.
     */
    pinned?: boolean;
  };
  ```
  The expiry field is named `expiry` to match `get-status`'s output (one
  consistent vocabulary for the AI across get and set).
- Parse `expiry` (if given) into a `Date`; if it is present but not a valid
  date, throw a clear error. `pinned` defaults to `true` when omitted. Call the
  existing `setStatus(message, pinned ?? true, expiry ?? null)`.
- Return a result message, e.g. `Set status message to "<text>"` plus an
  expiry hint (the expiry time, or "no expiry").
- **Confirmation:** export a `Tool.Confirmation<Input>` so Raycast asks the
  user to review before applying. The confirmation lists the message text, the
  expiry (or "Never"), and whether it will show when people message the user.

### `clear-status` (`src/tools/clear-status.ts`, new)

- No inputs.
- Calls the existing `clearStatus()`.
- Returns `"Cleared status"`.

## package.json

The `tools` array grows from 2 to 6 entries: existing `get-presence`,
`set-presence` (description updated); new `clear-presence`, `get-status`,
`set-status`, `clear-status`. Tool `name` values must match the
`src/tools/` file basenames.

## Error handling

Errors (auth, network, invalid expiry) are thrown and surfaced by Raycast in
the AI chat, consistent with the presence tools. `failIfNotOk` handles HTTP
errors; auth/token refresh is transparent via `api.ts` / `login.ts`. Only
`set-status` shows a confirmation; the other tools have none.
