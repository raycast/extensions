# Superhuman Changelog

## [Parity + Skills Library] - {PR_MERGE_DATE}

### Tool parity with the official MCP

Brings every tool wrapper up to parity with Superhuman's official MCP surface.

- `draft-email` now accepts `instructions` (the preferred AI-writer path that composes in the user's voice), `type` (new / reply / reply_all / forward), `threadId`, `messageId`, and `from` (alias). `body` remains as the literal-HTML bypass. Forward drafts require `body` for the intro — the server appends the quoted message.
- `send-draft` now supports mutually-exclusive scheduling: `smartSend`, `sendAt` (RFC3339), or `undoTimeout` (1–10 min). When `undoTimeout` is set, the response includes `undoToken` + `undoExpiresAt`.
- `undo-send` now accepts `undoToken` (preferred) in addition to the existing `messageId` fallback.
- `update-thread` now exposes `markDone`, `markRead`, `markStarred`, `markImportant`, `addLabels`, `removeLabels`, `moveToFolder`, `lastMessageId`. Old field names (`archived`, `read`, `starred`) are accepted as deprecated aliases.
- `mark-spam` now supports `alsoBlockSender`, `alsoBlockDomain`, `alsoTrash` flags for background bulk-spam sweeps.
- `create-or-update-event` now requires `timezone` (IANA) and supports `recurrence` (RRULE), `reminders[]`, `conference` (adds a video link), `calendarId`, `isAllDay` (renamed from `allDay`; legacy alias kept). Description is treated as HTML; times RFC3339.
- `get-availability` now resolves participant names → emails, requires `timezone`, defaults `workingHoursOnly` to true, and uses `startDate`/`endDate` (legacy `start`/`end` still accepted).
- `list-threads` now supports the full structured filter set: `from[]`, `to[]`, `subjectContains`, `bodyContains`, `labels[]`, `split` (name or id), `startDate`, `endDate`, `isUnread`, `isStarred`, `hasAttachment`, plus capped `limit` (≤ 50).
- `get-thread` now supports `includeComments`, `includeDrafts`, `messageLimit` (≤ 100; "root + newest N-1" truncation).
- `get-message` now supports `includeRawHtml`.
- `get-attachment` accepts `attachmentName` (replaces the legacy id-based selector). Inline content for images/audio, download URL otherwise with 1h expiry.
- `get-read-status-feed` now supports `threadId`, `since` (ISO), `cursor` pagination, `limit` (≤ 200).
- **New tool `query-email-and-calendar`** — flagship cross-source search/Q&A across email + calendar + contacts. `search-inbox` becomes a deprecated alias that delegates to it.
- `update-personalization` now takes a single freeform `feedback` string (matches the server's actual API). The old `fullName` / `signature` / `voice` / `greeting` fields were never the server's real schema; they have been removed. See `MIGRATION.md`.

### Skills Library

Ports Superhuman's [official Skills Library](https://github.com/superhuman/mcp-mail/tree/main/skills) into the extension as bundled `SKILL.md` files and as Raycast commands.

- Five skills: **Morning Briefing**, **End-of-Day Wrap-up**, **Meeting Scheduler**, **Deal Tracker**, **Batch Draft Writer**.
- Each is a `mode: "view"` Raycast command that renders the skill prompt and one-shot copies it to the clipboard for Quick AI.
- Each `SKILL.md` declares `tools_used` and `read_only` in frontmatter; skills that write are blocked when Read-only mode is on.
- `npm run sync-skills` pulls the latest upstream content, diffs, and updates frontmatter SHAs. A weekly GitHub Action runs the same job and opens a PR if anything changed.

### Safety

- **New preference: Read-only mode.** When enabled, every write tool (`draft-email`, `send-draft`, `discard-draft`, `undo-send`, `mark-spam`, `trash-thread`, `unsubscribe`, `update-thread`, `update-personalization`, `create-or-update-event`) throws a clear error and short-circuits its confirmation dialog. Read tools keep working.

### Validation & tests

- Every tool input is validated against a Zod schema at entry. Mutually-exclusive rules (send scheduling), conditional rules (forward drafts require body), and field-range caps (limits, undo window) are enforced in one place.
- Vitest suite (47 tests) covers parameter validation, the read-only gate, and skill-file integrity (every `tools_used` entry maps to a real MCP tool; every skill has a matching Raycast command).
- AI evals updated for the new params; new evals cover `instructions`-based drafts, `undoTimeout` sending, and `query-email-and-calendar`.

## [MCP Integration] - 2026-05-13

- Connect to Superhuman's official MCP server (`https://mcp.mail.superhuman.com/mcp`) via OAuth 2.1 (PKCE + Dynamic Client Registration).
- `draft-email` now creates a real draft server-side and returns a draft id (was: deep link only).
- `search-inbox` now returns inline results from `query_email_and_calendar` (was: deep link only).
- Added 17 new AI tools: `send-draft`, `discard-draft`, `undo-send`, `get-thread`, `get-message`, `list-threads`, `list-labels`, `list-splits`, `get-attachment`, `get-read-status-feed`, `mark-spam`, `trash-thread`, `unsubscribe`, `update-thread`, `update-personalization`, `create-or-update-event`, `get-availability`.
- Confirmation dialogs on destructive/sending tools (`send-draft`, `discard-draft`, `mark-spam`, `trash-thread`, `unsubscribe`, `create-or-update-event` with attendees).
- Migrated `ai.yaml` (instructions + evals) into `package.json` under `ai.instructions` / `ai.evals`; expanded eval coverage to one happy-path per new tool.

## [Initial Version] - 2025-04-29
