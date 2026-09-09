# Attio Changelog

## [Task Edit Fix] - 2026-09-09

- Fixed a React state-update warning when returning from the task edit or new-task form

## [2.0.0] - 2026-09-08

Full rewrite. Same commands, new engine — plus a set of new commands.

### Permissions & safety

- Scope-aware capability detection: the extension reads your token's granted scopes and shows only actions it can perform; read-only tokens see no write actions
- Per-command scope guidance in the README, with lock screens that name the exact missing scope (Try Again picks up scope edits without relaunching)
- Failure screens for every error class (network, invalid token, missing scope, rate limit, API errors) — no more silent blank lists
- All error copy actions redact secrets before they reach the clipboard

### New commands

- Search People, Search Companies, Search Deals — standalone commands with real workspace search (not just loaded-page filtering), server-side sorting, and per-object icons (company favicons included)
- My Tasks — your assigned tasks, pre-filtered

### Records

- Real titles, metadata sidebar with display names, resolved record references, friendly dates, colored status/category tags
- Schema-driven record editing (writable attributes only, diff-only saves, confirmation before clearing values) and record deletion
- Record screens carry the full action panel everywhere — related People/Companies traversal opens records in their home command via deeplinks
- Pin records (⌘⇧P) to float them above the list; Toggle Sidebar (⌘⇧D)
- Export any list as CSV, Markdown, or plain text

### Tasks

- Filter (All / Mine / Open / Completed), sort by due date, group by due date, edit tasks, assignee avatars
- New Task reachable from the empty list; clearer validation messages

### Notes

- No more blank rows (titles fall back to content), parent records shown and openable, markdown rendering, author avatars, newest-first, edit notes, copy as Markdown or plain text

### Webhooks

- Create and edit webhooks with an event-type picker (27 event types); subscriptions, status, and creation date shown in a detail pane; the one-time signing secret is offered for copy at creation

### Lists

- List deep links open the actual list view in Attio; instant loading

### Under the hood

- Replaced the SDK with a thin typed client generated from Attio's OpenAPI spec (−22 MB installed)
- Removed the Workspace Slug preference (derived from the API); added optional Verbose Logging
- Full unit-test suite plus import-cycle and Rules-of-Hooks lint gates

## [Edit Task] - 2026-01-21

- Edit Tasks

## [Use Attio Logo + Add Task] - 2025-11-03

- Attio Logo is now used with permission
- Add Tasks

## [Initial Version] - 2025-10-27

- View Objects
    1. View Object Records
    2. View Object Attributes
    3. Create New Custom Object
- View Tasks (grouped)
    1. Mark Task as Complete (or Incomplete)
    2. Delete Task
- View Webhooks
    1. Delete Webhook
- View Notes
- View Members and Teams
- View Lists
