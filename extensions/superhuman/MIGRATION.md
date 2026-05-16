# Migration Guide

Notes on renamed / replaced tools and fields. Wherever possible, old names are kept as deprecated aliases that delegate to the new equivalents so existing workflows continue to function. Two changes are intentionally breaking and called out below.

## Tool renames

| Before | After | Notes |
|---|---|---|
| `search-inbox` | `query-email-and-calendar` | The old name still works as a deprecated alias. The new name matches Superhuman's official MCP and reflects that this is the flagship cross-source search and Q&A endpoint. |

## Field renames (backward compatible)

These accept both old and new names. Internal mapping picks the new one when both are provided.

### `update-thread`

| Old | New | Status |
|---|---|---|
| `archived` | `markDone` | deprecated alias |
| `read` | `markRead` | deprecated alias |
| `starred` | `markStarred` | deprecated alias |
| `addLabels` | `addLabels` | unchanged |
| `removeLabels` | `removeLabels` | unchanged |

New fields with no prior equivalent: `markImportant`, `moveToFolder`, `lastMessageId`.

### `create-or-update-event`

| Old | New | Status |
|---|---|---|
| `allDay` | `isAllDay` | deprecated alias |

New required field: **`timezone`** (IANA, e.g. `America/Los_Angeles`). Calls that previously omitted it will now reject — pass an IANA timezone explicitly.

New optional fields: `calendarId`, `recurrence` (RRULE), `reminders[]`, `conference` (boolean — adds a video link).

### `get-availability`

| Old | New | Status |
|---|---|---|
| `attendees` | `participants` | deprecated alias |
| `start` | `startDate` | deprecated alias |
| `end` | `endDate` | deprecated alias |

New required field: **`timezone`** (IANA). New optional: `workingHoursOnly` (default `true`).

### `get-attachment`

| Old | New | Status |
|---|---|---|
| `attachmentId` | `attachmentName` | deprecated alias |

The old id-based selector remains accepted for backward compatibility but Superhuman's MCP prefers the filename-based selector.

### `list-threads`

| Old | New | Status |
|---|---|---|
| `label` (single) | `labels` (array) | deprecated alias; single value is mapped to a one-element array |

New optional fields (no prior equivalents): `from[]`, `to[]`, `subjectContains`, `bodyContains`, `split`, `startDate`, `endDate`, `isUnread`, `isStarred`, `hasAttachment`.

## Breaking changes

### `update-personalization`

The old typed fields (`fullName`, `signature`, `voice`, `greeting`) **have been removed**, not aliased. They were never the server's real schema — they were placeholders that happened to compile but did not map onto Superhuman's personalization endpoint correctly.

Replace with a single freeform `feedback` string:

```ts
// Before
{ signature: "Andrew Benson — andrew@hill.com" }

// After
{ feedback: "Set my signature to 'Andrew Benson — andrew@hill.com'" }
```

The server interprets the feedback and updates the appropriate personalization model. Examples:

```
"I prefer 'Hey' over 'Dear'"
"My title is now VP Engineering"
"Always sign off with 'Cheers, Andrew' on external emails"
```

### `send-draft` scheduling

The three scheduling options — `smartSend`, `sendAt`, `undoTimeout` — are **mutually exclusive**. Earlier client code that did not pass any scheduling field keeps working (default behavior is unchanged). Code that passes more than one now throws at validation time.

When `undoTimeout` is set (1–10 minutes), the response includes `undoToken` + `undoExpiresAt`. The new preferred input for `undo-send` is `undoToken`; the existing `messageId` fallback remains valid.

## New: Read-only mode

A new extension preference, **Read-only mode**, blocks every write tool. When enabled:

- Write tools throw `"Read-only mode is enabled. Disable …"` at the boundary.
- Write tools' confirmation dialogs surface the block before the user is asked to approve.
- Skills with `read_only: false` in their frontmatter (Meeting Scheduler, Batch Draft Writer) surface a banner and stop.

Disable from the extension's preferences pane to resume write operations.
