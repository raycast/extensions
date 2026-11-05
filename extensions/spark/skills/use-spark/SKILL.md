---
name: use-spark
description: >-
  Use the Spark MCP server to access and act on the user's Spark email
  data - list emails, search by topic, read threads, check calendar events,
  find availability, look up contacts, view team info, draft messages (from
  scratch or saved templates), send drafts, share drafts with teammates, post
  team comments, triage threads, create/update/delete calendar events and
  manage attendees, and manage contacts. Use when the user asks about their
  emails, calendar, contacts, meetings, scheduling, or wants to send, reply,
  archive, snooze, assign, comment, categorize, or schedule.
metadata:
  version: 1.4.1
  requires:
    mcp:
      - spark
---

# Using Spark

The Spark MCP server exposes the user's mailbox, calendar, contacts, meetings, and team data as tools. Use it to answer questions about their Spark data and, when the account allows it, to act on it - draft messages, post team comments, triage threads, and manage contacts.

## Access levels

Each account and shared inbox has its own **access level**, configured by the user in Spark Desktop under **Settings > AI Agents**. The `accounts` tool reports the current level for every account and shared inbox.

| Level | Allowed operations |
|-------|-------------------|
| **read-only** | List, search, and read emails, threads, folders, events, contacts, meetings, teams |
| **triage** | Everything in read-only plus all write operations: `draft`, `comment`, `action`, `contact-action` |
| **send** | Everything in triage plus mail-emitting operations: sending drafts (`action` with `send`, including scheduled "Send Later") and the entire `event` tool (create / update / delete / rsvp, including inviting or removing attendees) |

Shared inboxes can have a different access level than the parent account - for example, a personal account may have triage access while a shared inbox under the same team is read-only or disabled.

If a write tool is invoked against an account with insufficient access, the call returns a descriptive error explaining how to raise the level. Pass that on to the user verbatim and offer to retry once they have updated the setting, or perform the action in Spark Desktop directly.

## Calling tools

Each tool is an MCP tool exposed by the `spark` server. Examples below use the notation:

```
tool_name { "param": "value", ... }
```

Map this to your runtime's tool-call syntax - the left side is the MCP tool name, the right side is the JSON arguments object.

Always call `accounts` once at the start of any non-trivial task to discover available accounts, calendars, teams, shared inboxes, and access levels. Call `folders` before passing folder identifiers to `emails` or `search`.

## Tools

| Tool | Access | Description |
|------|--------|-------------|
| `accounts` | read-only | List accounts, calendars, teams, shared inboxes, and access levels |
| `folders` | read-only | List folders/labels with message counts |
| `emails` | read-only | List emails with filters and pagination |
| `search` | read-only | Topic search (full bodies), or list emails by filter across all folders |
| `thread` | read-only | Read full thread - headers, bodies, attachments |
| `attachment` | read-only | Read a single email attachment by ID (auto-downloads) |
| `events` | read-only | List calendar events for a time range |
| `event` | send | Create, update, delete, or RSVP to a calendar event; invite or remove attendees |
| `availability` | read-only | Find free time slots, optionally with attendees |
| `contacts` | read-only | Search contacts by name or email, or list the most-used ones |
| `contact` | read-only | Show one contact's details and settings |
| `team` | read-only | Show team info, members, shared inboxes, assignments |
| `meetings` | read-only | List meeting transcripts |
| `meeting` | read-only | Read a single meeting transcript |
| `templates` | read-only | List saved message templates (personal and team) |
| `template` | read-only | Show a single template by ID or name with its placeholders |
| `draft` | triage | Create or edit a draft (new, reply, reply-all, forward, from template); delete a draft; list account signatures; share with team |
| `comment` | triage | Post a team comment on a thread |
| `action` | triage (send for `send` / `unschedule`) | Perform actions on emails (archive, pin, snooze, assign, etc.); send a draft or manage a scheduled send at the **send** level |
| `contact-action` | triage | Perform actions on contacts (block, accept, categorize, etc.) |

### accounts

List all configured accounts with their aliases, calendars, teams, and shared inboxes. Output reports each account's and shared inbox's **access level** - check this before attempting any write tool. Takes no parameters.

```
accounts {}
```

Run first to discover what is available and which accounts allow triage actions.

### folders

List folders with message counts. Output includes folder identifiers in parentheses - use those as the `folder` parameter for `emails` and as scope for `search`. Mailboxes backed by a Google account show `(Gmail labels)` on the **Email Account** or **Shared Inbox** header. Teams show the team name as a usable identifier for `emails`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | no | Filter by email address (account or shared inbox). All accounts if omitted. |

```
folders {}
folders { "account": "user@example.com" }
```

### emails

List emails with metadata (ID, From, Date, Subject, Flags). Supports pagination and Gmail-style filters. Does **not** return bodies - use `search` or `thread` when you need content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `folder` | string | no | Folder identifier. Unified Inbox if omitted. |
| `filter` | string | no | Gmail-style filter (see operators below). |
| `page` | integer | no | Page number, 1-based (default `1`). |
| `page_size` | integer | no | Results per page (default `50`). |
| `order` | string | no | `ascending` or `descending`. |
| `new_senders` | boolean | no | Show only new-sender emails (GateKeeper). |

```
emails {}                                                                         # Unified Inbox
emails { "folder": "user@example.com:Archive" }                                   # specific folder
emails { "folder": "My Team" }                                                    # team's shared threads
emails { "filter": "from:alice@co.com is:unread" }
emails { "filter": "newer_than:7d has:attachment" }
emails { "page": 2, "page_size": 20 }
emails { "order": "ascending" }
emails { "new_senders": true }
```

**GateKeeper:** When viewing the Inbox with GateKeeper in explicit mode, new-sender emails are filtered out and a "New Senders" count is shown at the top. Set `new_senders: true` to view them. Use `contact-action` with `acceptContact` or `blockContact` to accept or block a sender (requires triage).

**Folder identifier formats** (call `folders` to see available ones):

| Format | Example | Meaning |
|--------|---------|---------|
| Bare name | `Inbox`, `Archive` | Unified folder (cross-account) |
| Email | `user@example.com` | Account inbox shorthand |
| `email:Folder` | `user@example.com:Archive` | Specific account folder |
| Team name | `My Team` | All shared threads in a team |
| `shared@email:Inbox` | `shared@co.com:Inbox` | Shared inbox open items (conversation view, matches Desktop) |
| `shared@email:Archive` | `shared@co.com:Archive` | Shared inbox done/archived items (conversation view) |
| `shared@email:Folder` | `shared@co.com:Label` | Other shared inbox folder / label |

**Filter operators** (combine space-separated inside the `filter` string):

| Operator | Example |
|----------|---------|
| `from:<addr>` | `from:alice@co.com` |
| `to:<addr>` | `to:bob@co.com` |
| `cc:<addr>` | `cc:team@co.com` |
| `subject:<text>` | `subject:"quarterly report"` |
| `before:yyyy/MM/dd` | `before:2026/03/01` |
| `after:yyyy/MM/dd` | `after:2026/01/01` |
| `newer_than:Xd` | `newer_than:7d` (also `w`, `m`, `y`) |
| `older_than:Xd` | `older_than:30d` |
| `has:attachment` | also `document`, `spreadsheet`, `presentation`, `reminder` |
| `is:unread` | also `read`, `starred`, `pinned`, `unreplied` |
| `is:shared` | emails shared to any team (alias for `is:shared_email`) |
| `is:shared_inbox_open` | open items in shared inbox |
| `is:shared_inbox_done` | completed/closed items in shared inbox |
| `category:<name>` | `priority`, `personal`, `notification`, `newsletter`, `invitation`, `invitation_response` |
| `assigned_to:<who>` | `me`, `<email>`, `unassigned`, `other` |
| `assigned_by:me` | emails you delegated |
| `filename:<name>` | `filename:report.pdf` |

### search

Two modes, selected by whether you pass `query`:

- **Topic mode** (`query` set): hybrid keyword + semantic search returning up to 20 emails **with full bodies**, sorted by relevance. Use this when the user asks about a topic and you need content to answer.
- **List mode** (`query` omitted): a paged, compact table of every email matching `filter`/`in` across **all folders in all accounts**, newest first (same columns as `emails`). Trash, Spam, and Blocked are excluded unless `in` targets one of them. Use this to filter by metadata (especially `from:`) beyond the Unified Inbox that `emails` is limited to.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | no | Search topic (keyword + semantic matching). Omit to switch to list mode. |
| `filter` | string | no | Gmail-style filter to narrow results (same operators as `emails`). |
| `in` | string | no | Scope: account, folder, team, or shared inbox. All folders if omitted. |
| `page` | integer | no | Page number, 1-based (default `1`). List mode only. |
| `page_size` | integer | no | Results per page (default `50`). List mode only. |
| `order` | string | no | `ascending` or `descending`. List mode only. |

```
search { "query": "quarterly report" }
search { "query": "API integration", "filter": "from:alice@co.com" }
search { "query": "budget", "in": "user@example.com:Archive" }
search { "query": "vacation", "in": "user@example.com" }
search { "filter": "from:alice@co.com" }                       # list mode: every email from alice, all folders
search { "filter": "is:unread newer_than:7d", "page": 2 }
```

Use `search` with a `query` when the user asks about content (you need bodies). Use `search` without a `query` to filter across every folder - `emails` only sees the Unified Inbox, so it can't answer "every email from alice, anywhere". Use `emails` for plain browsing of the Inbox or a single folder.

### thread

Read every message in a conversation - headers, plain-text bodies, attachment info. After the thread summary line, lists custom (non-system) folder labels once for the whole thread.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message_id` | string | yes | Message ID from `emails`/`search`, or a Spark deep link (the `Link:` line of a previous result). |
| `download_attachments` | boolean | no | Fetch attachments that aren't yet local. |

```
thread { "message_id": "1114" }
thread { "message_id": "1114", "download_attachments": true }
```

A `Reply-To:` line appears only when that header points somewhere other than `From` - mailing lists and website contact forms carry the real correspondent there. `draft { "reply_to": ... }` already addresses the reply to it, so don't pass `to` yourself.

Each message's `Attachments:` block is a table with columns `ID`, `Name`, `Size`, and `MIME Type`. The `ID` is a stable integer - pass it to the `attachment` tool to read the file's bytes (images, PDFs, text, audio). Local filesystem paths are deliberately omitted because sandboxed MCP clients can't follow them; the `attachment` tool is the only path to attachment contents through this connection.

Find IDs with `emails` or `search` first, then call `thread` to read the full conversation.

### attachment

Read a single email attachment by its ID and receive the file content directly through MCP - the server reads the bytes off disk and returns them as image, audio, text, or embedded-resource (binary blob) content blocks depending on the MIME type. Auto-downloads the file via IMAP if it isn't cached locally yet, so this works even for attachments whose `thread` row showed `(not downloaded, ...)`.

This is the sandbox-friendly way to read attachments: clients never need to touch the local filesystem path printed in the `thread` output.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | yes | Attachment ID from the `thread` Attachments table. |

```
attachment { "id": 42 }
```

Returns a leading text block summarizing the attachment (name, size, MIME type, message ID), followed by the file content as one of:

- **Image** (`image/*`) - inline `image` content block, ready for vision.
- **Audio** (`audio/*`) - inline `audio` content block.
- **Text** (`text/*`, plus JSON/XML/NDJSON) - inline `text` content block with the file's UTF-8 contents.
- **Anything else** (PDF, ZIP, Office documents, etc.) - embedded `resource` content block with a base64 `blob` and the original MIME type.

Files larger than the configured cap (default 50 MB; override with the `SPARK_ATTACHMENT_MAX_BYTES` env var on the MCP server) are rejected with a clear error - ask the user to open the attachment in Spark Desktop instead.

Typical flow:

1. `thread { "message_id": "<id>" }` - find the attachment's ID in the `Attachments:` table.
2. `attachment { "id": <attachment-id> }` - read its bytes.

### events

List calendar events for a time range. Defaults to today's remaining events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `today` | boolean | no | From now until end of today. |
| `tomorrow` | boolean | no | Tomorrow, full day. |
| `week` | boolean | no | From now until end of this week. |
| `start` | string | no | Start date (`yyyy-MM-dd` or `yyyy-MM-ddTHH:mm`). |
| `end` | string | no | End date (same formats). |
| `in` | string | no | Calendar account (`user@example.com`) or specific calendar (`user@example.com:Work`). A named calendar is listed even when hidden. |
| `include_hidden` | boolean | no | Include calendars switched off in Spark's calendar view. |

```
events {}
events { "tomorrow": true }
events { "week": true }
events { "week": true, "in": "user@example.com" }
events { "week": true, "in": "user@example.com:Work" }
events { "start": "2026-03-16", "end": "2026-03-20" }
events { "week": true, "include_hidden": true }
```

Call `accounts` to see available calendar accounts and calendar names.

**Hidden calendars:** `accounts` marks a calendar `(hidden)` when the user switched it off in Spark's calendar view. `events` leaves hidden calendars out, the same way Spark's calendar view does. Pass `include_hidden` to add them, or name one with `in` (`user@example.com:Name`) to list just that calendar. If the user expects events that aren't listed, check `accounts` for hidden calendars before concluding the calendar is empty or unsupported.

### event

**Requires send access** on the target calendar's owning account. Every mode can emit mail through the calendar service (invitations on create/update, iTIP UPDATE/CANCEL on update/delete of attendee-bearing events, an iTIP REPLY on rsvp), so the whole tool sits at the **send** level.

Create, update, delete, or RSVP to a calendar event, including managing its attendees. Use `add` / `remove` on `create` or `update` to invite or remove attendees; adding or removing attendees sends invitations / cancellations through the calendar provider (CalDAV / Google / Exchange).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | yes | `create`, `update`, `delete`, or `rsvp`. |
| `event_id` | string | for `update`/`delete`/`rsvp` | For `update`/`delete`: a calendar event ID (use `events`). For `rsvp`: a calendar event ID **or** the message ID of the invitation email (use `emails` / `thread`). |
| `status` | string | for `rsvp` | RSVP status: `accept`, `decline`, or `maybe`. |
| `title` | string | no | Event title / summary. |
| `start` | string | yes (for `create`) | Start date/time (`yyyy-MM-dd`, `dd/MM/yyyy`, `yyyy-MM-ddTHH:mm`, or `yyyy-MM-ddTHH:mm:ssXXX`). |
| `end` | string | no | End date/time (same formats). |
| `all_day` | boolean | no | Mark the event as all-day. |
| `description` | string | no | Event description / notes. |
| `alerts` | string | no | Comma-separated alert offsets (`Ns` for N seconds before, e.g. `300s,600s`) or absolute dates. |
| `location` | string | no | Event location. |
| `video_conference` | string | no | Attach a video conference: `auto` (account default), or `meet` / `zoom` / `teams`. |
| `calendar` | string | no | Target calendar for `create` (`email@domain.com` or `email@domain.com:Name`). Hidden calendars work too, and saving an event in one switches it back on in Spark's calendar view. |
| `add` | array of string | no | Attendee email address(es) to invite (create / update). New attendees receive an invitation. |
| `remove` | array of string | no | Attendee email address(es) to remove (update). Removed attendees receive a cancellation. The organizer cannot be removed. |

```
event { "mode": "create", "title": "Sync", "start": "2026-07-01T12:00", "end": "2026-07-01T13:00" }
event { "mode": "create", "title": "OOO", "start": "2026-07-01", "all_day": true }
event { "mode": "create", "title": "Standup", "start": "2026-07-01T09:00", "end": "2026-07-01T09:15", "video_conference": "auto" }
event { "mode": "create", "title": "1:1", "start": "2026-07-01T14:00", "end": "2026-07-01T14:30", "calendar": "user@co.com:Work" }
event { "mode": "create", "title": "Sync", "start": "2026-07-01T12:00", "add": ["alice@co.com", "bob@co.com"] }   # create + invite
event { "mode": "update", "event_id": "ABC-123", "title": "New title" }
event { "mode": "update", "event_id": "ABC-123", "video_conference": "meet" }
event { "mode": "update", "event_id": "ABC-123", "add": ["alice@co.com"], "remove": ["bob@co.com"] }   # swap attendees
event { "mode": "delete", "event_id": "ABC-123" }
event { "mode": "rsvp", "event_id": "ABC-123", "status": "accept" }   # calendar event ID
event { "mode": "rsvp", "event_id": "44268", "status": "maybe" }      # invitation email message ID
```

**Attendees (`add` / `remove`):** valid only on `create` and `update`. Combine both on one `update` to swap attendees (removals run before additions). Adding or removing attendees always emits invitation / cancellation mail; an event with no attendees stays local.

**`update` / `delete` semantics:** an event with **no attendees** is a local change (no mail). An event **with attendees** sends an iTIP UPDATE (on update) or CANCEL (on delete) to all attendees. An alerts-only edit is a personal reminder and notifies nobody.

**`rsvp` semantics:** sets *your own* status on an invitation and emits an iTIP REPLY to the organizer. The id can be a calendar event ID or the invitation email's message ID - when a user asks you to respond to an invite, look it up with `emails` / `thread` and pass that message ID, since many providers leave an unanswered invite in the inbox without adding it to the calendar.

Typical flow when scheduling a new meeting: `event { "mode": "create", ... }` to lay down the event, confirm the time with the user, then `event { "mode": "update", "event_id": "...", "add": [...] }` to push invitations - so the user can review before any external mail goes out. When you already have the attendees, create with `add` in one step.

Run `accounts` to see writable calendars and the access level on each account.

### availability

Find free time slots. Without `attendees`, shows the user's own availability. With `attendees`, computes mutual free windows. Working hours are 08:00-20:00, weekends skipped, events marked "free" are ignored.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `today` | boolean | no | From now until end of today. |
| `tomorrow` | boolean | no | Tomorrow, full day. |
| `week` | boolean | no | From now until end of this week. |
| `start` | string | no | Start date (`yyyy-MM-dd` or `yyyy-MM-ddTHH:mm`). |
| `end` | string | no | End date (same formats). |
| `attendees` | string | no | Comma-separated email addresses. |

```
availability {}
availability { "tomorrow": true }
availability { "week": true, "attendees": "alice@co.com" }
availability { "start": "2026-03-16", "end": "2026-03-20", "attendees": "a@co.com,b@co.com" }
```

### contacts

Search contacts by name or email. Strict match first, then fuzzy fallback. Without a query, lists the contacts the user writes to most, most-used first.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | no | Name or email to search for. Omit to list the most-used contacts. |
| `limit` | integer | no | Maximum number of contacts, 1-1000 (default: 25). |

```
contacts { "query": "john" }
contacts { "query": "example.com" }
contacts { "limit": 100 }
```

### contact

Show one contact's details: name, other addresses, and each setting `contact-action` changes. Check a sender's state before changing it - e.g. whether they are already Priority or blocked. An unknown address is an error.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | yes | The contact's email address. |

```
contact { "email": "bob@example.com" }
```

| Field | Changed by (`contact-action`) |
|-------|-----------|
| Category (`personal` / `notification` / `newsletter`) | `changeCategory*` |
| Priority | `markContactAsPrimary` / `unmarkContactAsPrimary` |
| Notifications | `markContactAsImportant` / `unmarkContactAsImportant` |
| GateKeeper: blocked / accepted (neither for a new sender) | `blockContact` / `acceptContact` |
| Grouped (in Inbox or by category) | `groupEmailsFromContact[AndShowInInbox]` / `ungroupEmailsFromContact` |
| Auto-summary | `enableAutosummaryForContact` / `disableAutosummaryForContact` |

### team

Show team info - metadata, shared inboxes with members, full member list, assigned emails, and assignment summary. Call without `name` to list available teams.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | no | Team name (or partial match). Lists all teams if omitted. |

```
team {}
team { "name": "My Team" }
```

### meetings

List meeting transcripts, newest first. Supports filtering and pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | string | no | Filter expression (operators below). |
| `page` | integer | no | Page number, 1-based. |
| `page_size` | integer | no | Results per page (default `50`). |

```
meetings {}
meetings { "filter": "newer_than:30d" }
meetings { "filter": "subject:standup", "page_size": 10 }
```

Filter operators for `meetings`: `subject:<text>`, `before:yyyy/MM/dd`, `after:yyyy/MM/dd`, `newer_than:Xd`, `older_than:Xd`.

### meeting

Read a single meeting transcript's summary. Optionally include the full transcript and/or user notes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `meeting_id` | string | yes | Meeting ID (from `meetings`) or a Spark deep link. |
| `transcript` | boolean | no | Include the full transcript text. |
| `notes` | boolean | no | Include user notes. |

```
meeting { "meeting_id": "42" }
meeting { "meeting_id": "42", "transcript": true }
meeting { "meeting_id": "42", "notes": true }
meeting { "meeting_id": "42", "transcript": true, "notes": true }
```

### templates

List saved Spark message templates - the drafts you can apply via `draft`'s `template` parameter. Personal and team templates both appear; they round-trip from Spark Desktop.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `personal` | boolean | no | Show only personal templates. |
| `team` | string | no | Show only the named team's templates. |
| `page` | integer | no | Page number, 1-based (default `1`). |
| `page_size` | integer | no | Results per page (default `50`). |

```
templates {}
templates { "personal": true }
templates { "team": "Marketing" }
templates { "page": 2, "page_size": 20 }
```

Output columns: `ID`, `Scope` (Personal or team name), `Name`, `Subject`, `Modified`. Use the `ID` or `Name` with the `template` tool and with `draft`'s `template` parameter.

### template

Show a single template's full contents and its placeholder requirements. Run this before `draft { "template": ... }` so you know which placeholders to fill.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ref` | string | yes | Template ID (numeric) or name (case-insensitive). |

```
template { "ref": "123" }
template { "ref": "Welcome reply" }
```

Output includes scope, recipients, subject, body (HTML stripped to text), attachments, and a `Placeholders:` section listing every placeholder:

- `[auto]` - auto-fillable (recipient/self name), resolved from `to`/`account` when applied. **Not** overridable via `placeholder`.
- `[manual]` - free-form; **must** be passed as `placeholder: ["<name>=<value>"]` to `draft`.

If a name matches more than one template, the call errors with the matching IDs - disambiguate by ID.

### draft

**Requires triage access.**

Create a new email draft or edit an existing one. The body is markdown and is converted to HTML. Seed a draft from an existing message with `reply_to`, `reply_all`, or `forward`, update an existing draft with `edit`, apply a saved template with `template`, list account signatures with `mode`, delete a draft with `delete`, and collaborate with teammates with the sharing parameters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | no | Pass `"signatures"` to list the signature each account appends instead of touching a draft. Must be the only parameter. |
| `to` | array of string | no | Recipient addresses. |
| `cc` | array of string | no | CC addresses. |
| `bcc` | array of string | no | BCC addresses. |
| `subject` | string | no | Subject line. |
| `body` | string | no (yes for new) | Body content in markdown. Required for a new draft unless a template supplies one. `![alt](file name)` shows an attached image in the text - see [Images in the body](#images-in-the-body). |
| `account` | string | no | Account email to send from. Personal accounts, aliases, and shared-inbox emails are all valid - any account that has triage access. |
| `edit` | string | no | Message ID (or Spark deep link) of an existing draft to update. |
| `reply_to` | string | no | Message ID (or deep link) to reply to. Addresses the sender alone (or the `Reply-To:` address when the message carries one). |
| `reply_all` | string | no | Message ID (or deep link) to reply to while keeping everyone else on the thread: the other `To:` recipients land in To, the original `Cc:` in CC, minus your own address. Mutually exclusive with `reply_to`; `to` / `cc` override the lists it builds. |
| `forward` | string | no | Message ID (or deep link) to forward. |
| `delete` | string | no | Message ID (or deep link) of a draft to delete **permanently**. Must be the only parameter. Drafts have no Trash, so the deletion cannot be undone. A scheduled draft and a draft shared with teammates are both refused - `action { "action_name": "unschedule", ... }` or `draft { "edit": "<pk>", "unshare": true }` first. |
| `attach` | array of string | no | Absolute paths to files on the user's computer. See [Files from a sandbox](#files-from-a-sandbox). |
| `template` | string | no | Apply a saved template by ID or name. Combine with `edit` to overlay it onto an existing draft. |
| `placeholder` | array of string | no | Fill manual template placeholders, each `"<name>=<value>"`. Auto placeholders (recipient/self name) resolve from `to`/`account` and are not addressable here. |
| `no_signature` | boolean | no | Send without a signature, suppressing the account's default for this draft. On `edit` it strips a signature already on the draft, keeping the body and quoted thread. |
| `team` | string | no | Team to share the draft with. Required when you belong to multiple teams; on an already-shared draft, must match the owning team. |
| `user` | array of string | no | Teammate emails to share with. On an already-shared draft this **adds** collaborators - use `remove_user` to remove. |
| `remove_user` | array of string | no | Teammate emails to **remove** from a shared draft, preserving the share, its comments, and remaining collaborators. Requires `edit` of a shared draft. Cannot remove yourself - use `unshare`. |
| `allow_send` | boolean | no | Let teammates send the shared draft on your behalf. New share defaults to off; on edit, omit to leave the current value unchanged. |
| `disallow_send` | boolean | no | Revoke teammates' send-on-behalf permission. (This is the parameter for the `--no-allow-send` flag - note the name.) |
| `unshare` | boolean | no | Revert a shared draft back to a personal draft. Requires `edit`; cannot be combined with sharing params or content edits. |

```
draft { "to": ["alice@example.com"], "subject": "Hello", "body": "Hi Alice, ..." }
draft { "to": ["alice@co.com", "bob@co.com"], "cc": ["carol@co.com"], "subject": "Meeting", "body": "..." }
draft { "edit": "1234", "subject": "Updated subject", "body": "Updated body" }
draft { "reply_to": "5678", "body": "Thanks for the update!" }
draft { "reply_all": "5678", "body": "Thanks everyone!" }
draft { "forward": "5678", "to": ["manager@co.com"], "body": "FYI" }
draft { "account": "john@gmail.com", "to": ["alice@co.com"], "subject": "Hi", "body": "..." }
draft { "mode": "signatures" }
draft { "to": ["alice@co.com"], "subject": "Quick note", "body": "...", "no_signature": true }
draft { "edit": "1234", "no_signature": true }
draft { "to": ["alice@co.com"], "subject": "Report", "body": "See attached", "attach": ["/path/to/report.pdf"] }
draft { "to": ["alice@co.com"], "subject": "Files", "body": "Two files", "attach": ["/path/to/a.pdf", "/path/to/b.xlsx"] }
draft { "to": ["alice@co.com"], "subject": "Q3", "body": "Revenue is up:\n\n![Q3 revenue](chart.png)", "attach": ["/path/to/chart.png"] }
draft { "delete": "1234" }
```

#### Images in the body

To put an image in the text instead of the attachment list, attach it and show it with markdown image syntax by its file name: `"attach": ["/path/to/chart.png"], "body": "![Q3 revenue](chart.png)"`. The file can come from `attach` or already be on the draft. An `https://` image address is left as it is. A local image that matches no attached file, or a file that isn't an image, is an error, so a draft never goes out with a broken image. On `edit` with `body`, the new body decides which images stay: show an image already on the draft by its name (as `thread` on the draft lists it) to keep it, leave it out to remove it.

#### Files from a sandbox

`attach` takes paths on the user's computer - MCP has no way to send the file's bytes. A file that exists only in your sandbox (an upload, or a file you created in a Cowork session) can't be read from there: save a copy to `~/Downloads` first and attach that path. Spark can read `~/Downloads` on every build, and an error for an unreadable path says the same.

Apply a saved template (run `template` first to learn its manual placeholders):

```
draft { "template": "Cold outbound v3", "to": ["alice@co.com"], "placeholder": ["Project name=Acme Q3", "Deadline=Friday EOD"] }
draft { "template": "124", "edit": "9821", "placeholder": ["Project name=Acme Q3"] }
```

Share a draft and manage collaborators:

```
draft { "to": ["client@co.com"], "subject": "Proposal", "body": "...", "team": "Engineering", "user": ["alice@co.com", "bob@co.com"] }
draft { "edit": "1234", "team": "Engineering", "user": ["carol@co.com"], "allow_send": true }
draft { "edit": "1234", "remove_user": ["alice@co.com"], "user": ["dave@co.com"] }   # swap collaborators in one call
draft { "edit": "1234", "disallow_send": true }                                       # revoke send-on-behalf
draft { "edit": "1234", "unshare": true }
```

Use `emails` to find message IDs for `edit`, `reply_to`, `reply_all`, and `forward`. Use `accounts` to find account emails for `account` - personal accounts, their aliases, and shared inboxes are all listed there, and any of them can be used as the from address when the account has triage access. Use `team` to list teams and members for `team`/`user`.

**Templates.** Run `template { "ref": "<id|name>" }` before `draft { "template": ... }` to discover required manual placeholders - a missing manual placeholder is a hard error before any draft is created. Explicit fields always win over template fields.

**The signature is added for you - never write your own sign-off.** Spark appends the mailbox's default signature to every draft body. `draft { "mode": "signatures" }` prints what each mailbox appends. When the user wants a closing that differs from their signature, pass `no_signature: true` and write the whole closing yourself. The response echoes the composed body under `Body:` - read it back to confirm the draft says what you meant, and to catch a sign-off of your own standing next to the account's.

**Threading is critical.** When a message belongs to an existing conversation, you **must** pass `reply_to` with the **last message in that thread** - that is what attaches the draft to the conversation (correct In-Reply-To/References headers, same thread in the recipient's mailbox). Without `reply_to` the draft starts a brand new thread, which is almost always wrong when the user said "reply", "respond", "follow up", or "ping" within an existing conversation. Use `thread` to inspect the conversation and pick the most recent message's ID. On a thread with several participants, use `reply_all` unless the user wants a private answer to the sender.

**Follow-ups (no reply yet).** When following up on a thread whose most recent message is your own outgoing one (e.g. "nudge Alice - she never replied"), use that outgoing message's ID as `reply_to` so the follow-up stays attached as a bump rather than a new cold email.

**Sharing.** Sharing is triggered by the presence of `team` or `user`; teams with exactly one other active member auto-share with everyone, otherwise `user` is required. To change collaborators or the send-on-behalf setting on an existing shared draft, pass `edit` together with the sharing params - the change is applied to the existing share. Content edits (`to`/`cc`/`bcc`/`subject`/`body`/`attach`) and sharing updates (`team`/`user`/`remove_user`/`allow_send`/`disallow_send`) must be issued as **separate** calls, and `unshare` cannot be combined with either.

**Deleting a draft is final.** `delete` removes the draft outright - unlike a received email there is no Trash to recover it from. Only delete a draft the user asked you to discard, and say so plainly in your response rather than implying it can be restored. To throw away just the *text* of a draft while keeping the draft itself, edit it (`draft { "edit": "<pk>", "body": "..." }`) instead.

### comment

**Requires triage access.**

Post a team comment (chat message) on a thread. If the thread isn't yet shared, it is shared automatically. Supports text comments, file attachments, or both. Use `edit` to update an existing comment.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message_id` | string | yes (post) | Message ID (or Spark deep link) of a message in the thread to comment on. Required when posting a new comment; omit when using `edit`. |
| `body` | string | when no `attach` | Comment text. Required when using `edit`. |
| `attach` | array of string | when no `body` | Absolute paths to files on the user's computer. Each file is sent as a separate message. Cannot be combined with `edit`. See [Files from a sandbox](#files-from-a-sandbox). |
| `edit` | string | no | Message ID of an existing comment to edit. Requires `body`. |
| `team` | string | when >1 team | Team name. Required when the user belongs to multiple teams. |
| `user` | array of string | when team >2 members | Teammate emails to share with. Only used when auto-sharing an unshared thread. For teams with 2 or fewer members, the whole team is shared with automatically. |

```
comment { "message_id": "1234", "body": "Looks good, let's proceed." }
comment { "message_id": "1234", "body": "Please review this", "team": "Engineering" }
comment { "message_id": "1234", "body": "FYI", "team": "Engineering", "user": ["alice@co.com", "bob@co.com"] }
comment { "message_id": "1234", "attach": ["/path/to/screenshot.png"] }
comment { "message_id": "1234", "body": "See attached", "attach": ["/path/to/report.pdf", "/path/to/data.csv"] }
comment { "edit": "5678", "body": "Updated comment text" }
```

Use `emails` to find message IDs. Use `thread` to see comment IDs already posted on a conversation. Use `team` to list teams and their members.

### action

**Requires triage access** for most verbs. The `send` and `unschedule` verbs emit or manage outbound mail and therefore **require send access** on the owning account.

Perform an action on one or more emails. Pass `action_name` plus a `message_ids` array; some actions need additional options (`date`, `folder`, `team`, `user`, `assignee`, `comment`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action_name` | string | yes | Action to perform (see list below). |
| `message_ids` | array of string | yes | Message IDs (or Spark deep links) to act on. |
| `date` | string | for `snooze`, `changeReminder`; optional for `assign` | `yyyy-MM-dd`, `dd/MM/yyyy`, or `yyyy-MM-ddTHH:mm`. |
| `folder` | string | for `moveToFolder`, `attachLabel`, `detachLabel` | Qualified folder/label (e.g. `user@example.com:Archive`). Run `folders` for valid identifiers. |
| `team` | string | when >1 team for team actions | Team name. |
| `user` | array of string | for `shareInTeam` when team >2 members | Teammate emails to share with. |
| `assignee` | string | for `assign` | Teammate email to assign the email to. |
| `comment` | string | optional for `assign` | Comment text included with the assignment. |

Supported `action_name` values:

| Action | Effect |
|--------|--------|
| `pin` | Pin the message to keep it at the top |
| `unpin` | Remove the pin |
| `mute` | Mute the thread (stop notifications) |
| `unmute` | Unmute a previously muted thread |
| `snooze` | Snooze until `date` |
| `unsnooze` | Remove snooze, return to inbox |
| `changeReminder` | Set a follow-up reminder for `date` if no reply |
| `clearReminder` | Remove the follow-up reminder |
| `setAside` | Set aside for later review |
| `archive` | Archive |
| `moveToInbox` | Move back to inbox |
| `moveToTrash` | Move to trash |
| `moveToFolder` | Move to `folder` |
| `attachLabel` | Attach Gmail/Spark Team label `folder` (keeps other labels) |
| `detachLabel` | Remove Gmail/Spark Team label `folder` |
| `markAsDone` | Mark as done |
| `markAsUndone` | Mark as not done |
| `markAsSeen` | Mark as read |
| `markAsUnseen` | Mark as unread |
| `markAsSpam` | Mark as spam |
| `markThreadAsPriority` | Mark thread as priority |
| `unmarkThreadAsPriority` | Remove priority |
| `unsubscribe` | Unsubscribe from sender/mailing list |
| `changeCategoryPersonal` | Reclassify as Personal |
| `changeCategoryNotification` | Reclassify as Notification |
| `changeCategoryNewsletters` | Reclassify as Newsletter |
| `shareInTeam` | Share thread with teammates (`team`, `user`) |
| `assign` | Assign to teammate (`assignee`, optional `date`, `comment`) |
| `delegationComplete` | Mark delegation as complete |
| `delegationReopen` | Reopen a completed delegation |
| `send` | **(send access)** Send a draft now, or schedule it with `date` ("Send Later"); on an already-scheduled message, reschedule (with `date`) or send now (no `date`) |
| `unschedule` | **(send access)** Cancel a scheduled send and return the message to drafts |

`send` takes the draft/message IDs in `message_ids` and an optional `date` to schedule (future date required). `unschedule` takes the scheduled message IDs. Both require **send** access on the owning account; the owning draft must have a recipient, a subject, uploaded attachments, and no unresolved manual template placeholders (same validation as the desktop composer). Typical flow: `draft { ... }` to compose, review, then `action { "action_name": "send", ... }` to commit - `draft` alone never sends.

```
action { "action_name": "pin", "message_ids": ["12345"] }
action { "action_name": "archive", "message_ids": ["100", "200", "300"] }
action { "action_name": "markAsSeen", "message_ids": ["100", "200"] }
action { "action_name": "snooze", "message_ids": ["12345"], "date": "2026-04-10T09:00" }
action { "action_name": "snooze", "message_ids": ["12345"], "date": "2026-04-10" }
action { "action_name": "moveToFolder", "message_ids": ["12345"], "folder": "user@example.com:Archive" }
action { "action_name": "attachLabel", "message_ids": ["12345"], "folder": "user@gmail.com:MyLabel" }
action { "action_name": "detachLabel", "message_ids": ["12345"], "folder": "shared@company.com:SomeLabel" }
action { "action_name": "changeReminder", "message_ids": ["12345"], "date": "2026-04-15" }
action { "action_name": "shareInTeam", "message_ids": ["1234"], "team": "Engineering", "user": ["alice@co.com"] }
action { "action_name": "shareInTeam", "message_ids": ["1234"], "user": ["alice@co.com", "bob@co.com"] }
action { "action_name": "assign", "message_ids": ["1234"], "assignee": "bob@co.com" }
action { "action_name": "assign", "message_ids": ["1234"], "assignee": "bob@co.com", "date": "2026-04-15", "comment": "Please review" }
action { "action_name": "delegationComplete", "message_ids": ["1234"] }
action { "action_name": "delegationComplete", "message_ids": ["100", "200", "300"] }
action { "action_name": "delegationReopen", "message_ids": ["1234"] }
action { "action_name": "send", "message_ids": ["1234"] }                                 # send a draft now (send access)
action { "action_name": "send", "message_ids": ["1234"], "date": "2026-04-10T09:00" }     # schedule "Send Later"
action { "action_name": "unschedule", "message_ids": ["5678"] }                           # cancel a scheduled send
```

Use `emails` to find message IDs. Use `folders` to resolve qualified names for `moveToFolder`, `attachLabel`, and `detachLabel`. Use `team` to list teams and members for team actions.

### contact-action

**Requires triage access.**

Perform an action on one or more contacts by email address.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action_name` | string | yes | Action to perform (see list below). |
| `emails` | array of string | yes | Contact email addresses to act on. |

Supported `action_name` values:

| Action | Effect |
|--------|--------|
| `changeCategoryPersonal` | Reclassify the contact as Personal |
| `changeCategoryNotification` | Reclassify the contact as Notification |
| `changeCategoryNewsletters` | Reclassify the contact as Newsletter |
| `groupEmailsFromContact` | Group emails from the contact by category |
| `groupEmailsFromContactAndShowInInbox` | Group emails from the contact and show in inbox |
| `ungroupEmailsFromContact` | Ungroup emails from the contact |
| `markContactAsImportant` | Enable notifications for the contact |
| `unmarkContactAsImportant` | Disable notifications for the contact |
| `markContactAsPrimary` | Mark contact as priority (auto-prioritize) |
| `unmarkContactAsPrimary` | Remove priority mark |
| `acceptContact` | Accept or unblock the contact (bypass GateKeeper) |
| `blockContact` | Block the contact |
| `acceptDomain` | Accept or unblock the contact's entire domain |
| `blockDomain` | Block the contact's entire domain |
| `enableAutosummaryForContact` | Enable AI auto-summary for emails from the contact |
| `disableAutosummaryForContact` | Disable AI auto-summary for emails from the contact |

```
contact-action { "action_name": "blockContact", "emails": ["spammer@example.com"] }
contact-action { "action_name": "acceptContact", "emails": ["alice@co.com", "bob@co.com"] }
contact-action { "action_name": "changeCategoryPersonal", "emails": ["alice@co.com"] }
contact-action { "action_name": "markContactAsPrimary", "emails": ["ceo@company.com"] }
contact-action { "action_name": "enableAutosummaryForContact", "emails": ["newsletter@example.com"] }
```

Use `contacts` to look up email addresses.

## Smart Categories

Spark automatically classifies incoming email into six categories. Use the `category:` filter operator with `emails` and `search` to view mail by category, and use `action` / `contact-action` to reclassify and tune (triage).

| Category | Filter | Typical Content |
|----------|--------|-----------------|
| Priority | `category:priority` | Auto-prioritized or manually marked as priority |
| People | `category:personal` | Direct person-to-person email |
| Notifications | `category:notification` | Service notifications, alerts, receipts |
| Newsletters | `category:newsletter` | Subscriptions, digests, marketing |
| Invites | `category:invitation` | Calendar invitations |
| Invite Responses | `category:invitation_response` | RSVPs, accepts, declines |

Browse by category (read-only):

```
emails { "folder": "Inbox", "filter": "category:priority is:unread" }
emails { "folder": "Inbox", "filter": "category:personal is:unread" }
emails { "folder": "Inbox", "filter": "category:invitation" }
emails { "folder": "Inbox", "filter": "category:notification is:unread" }
emails { "folder": "Inbox", "filter": "category:newsletter newer_than:7d" }
```

Reclassify a single message (triage):

```
action { "action_name": "changeCategoryPersonal", "message_ids": ["12345"] }
action { "action_name": "changeCategoryNotification", "message_ids": ["12345"] }
action { "action_name": "changeCategoryNewsletters", "message_ids": ["12345"] }
```

Tune per-contact category rules (triage) - changes apply to all future mail from the sender:

```
contact-action { "action_name": "changeCategoryPersonal", "emails": ["sender@example.com"] }
contact-action { "action_name": "changeCategoryNewsletters", "emails": ["sender@example.com"] }
contact-action { "action_name": "groupEmailsFromContact", "emails": ["sender@example.com"] }
contact-action { "action_name": "markContactAsImportant", "emails": ["vip@example.com"] }
contact-action { "action_name": "markContactAsPrimary", "emails": ["ceo@example.com"] }
contact-action { "action_name": "enableAutosummaryForContact", "emails": ["newsletter@example.com"] }
```

**Category-first triage pattern:** Process inbox in priority order - priority -> people -> invites -> notifications -> newsletters. This ensures the most important messages get attention first.

## Typical Workflows

**Answer a question about emails:**
1. `search { "query": "topic" }` - find relevant emails with bodies.
2. Read the output and answer the user's question.

**Find and read a specific email:**
1. `emails { "filter": "from:sender subject:keyword" }` - locate the email.
2. `thread { "message_id": "<ID>" }` - read the full conversation.

**Read an attachment (image, PDF, CSV):**
1. `thread { "message_id": "<ID>" }` - look up the `ID` column in the `Attachments:` table.
2. `attachment { "id": <attachment-id> }` - receive the file contents directly (no need to read the local `Path`).

**Draft a reply:**
1. `emails { "filter": "from:sender" }` - find the email.
2. `draft { "reply_to": "<ID>", "body": "Thanks for the update!" }`.

**Send an email from a saved template:**
1. `templates {}` - list templates (or `templates { "personal": true }` / `templates { "team": "<name>" }`).
2. `template { "ref": "<id|name>" }` - inspect required manual placeholders.
3. `draft { "template": "<id|name>", "to": ["alice@co.com"], "placeholder": ["<name>=<value>"] }` - create the draft.

**Send a draft (send access):**
1. `draft { "to": ["alice@co.com"], "subject": "Hi", "body": "..." }` - compose and review.
2. `action { "action_name": "send", "message_ids": ["<draft-ID>"] }` - send now, or add `"date"` to schedule.

**Check someone's schedule for a meeting:**
1. `availability { "tomorrow": true, "attendees": "alice@co.com,bob@co.com" }`.
2. Suggest a time from the free slots.

**Schedule a meeting and invite attendees (send access):**
1. `availability { "week": true, "attendees": "alice@co.com,bob@co.com" }` - find a mutual slot.
2. `event { "mode": "create", "title": "Sync", "start": "2026-07-01T14:00", "end": "2026-07-01T14:30" }` - create the event.
3. Confirm the time with the user, then `event { "mode": "update", "event_id": "<id>", "add": ["alice@co.com", "bob@co.com"] }` - send invitations.

**Comment on a shared thread:**
1. `emails { "filter": "subject:keyword" }` - find the email.
2. `comment { "message_id": "<ID>", "body": "Looks good, approved!" }`.

**Get team workload overview:**
1. `team { "name": "Team Name" }` - see members and assigned emails.

**Look up a contact:**
1. `contacts { "query": "name or domain" }` - find their email address.

**Triage a thread (archive/pin/snooze):**
1. `emails { "filter": "from:sender" }` - find the message.
2. `action { "action_name": "archive", "message_ids": ["<ID>"] }` - archive (or `pin`, `snooze` with `date`, etc.).

**Bulk archive after review:**
1. `emails { "folder": "Inbox", "filter": "category:newsletter newer_than:7d" }` - list candidates.
2. `action { "action_name": "archive", "message_ids": ["<ID1>", "<ID2>", "<ID3>"] }` - archive in one call.

**Share an email with the team:**
1. `emails { "filter": "subject:keyword" }` - find the email.
2. `action { "action_name": "shareInTeam", "message_ids": ["<ID>"], "user": ["alice@co.com"] }`.

**Delegate an email to a teammate:**
1. `emails { "filter": "subject:keyword" }` - find the email.
2. `action { "action_name": "assign", "message_ids": ["<ID>"], "assignee": "bob@co.com", "date": "2026-04-15", "comment": "Please handle this" }`.

**Mark delegated emails as done:**
1. `emails { "filter": "subject:keyword" }` - find the email(s).
2. `action { "action_name": "delegationComplete", "message_ids": ["<ID1>", "<ID2>"] }`.

**Review assigned shared inbox items:**
1. `emails { "folder": "shared@co.com:Inbox", "filter": "assigned_to:unassigned" }` - unassigned items.
2. `action { "action_name": "assign", "message_ids": ["<ID>"], "assignee": "bob@co.com" }` - assign to a teammate.
3. `emails { "filter": "assigned_to:bob@co.com" }` - items assigned to a teammate.
4. `emails { "filter": "is:shared_inbox_open" }` - all open shared inbox items.
5. `emails { "filter": "is:shared_inbox_done" }` - completed items.

**Read meeting notes:**
1. `meetings { "filter": "newer_than:30d" }` - find recent meetings.
2. `meeting { "meeting_id": "<ID>", "transcript": true, "notes": true }` - read summary, transcript, and notes.

**Manage a contact (block/accept/categorize):**
1. `contacts { "query": "name or domain" }` - find the contact email.
2. `contact-action { "action_name": "blockContact", "emails": ["spammer@example.com"] }` - block (or `acceptContact`, change category, etc.).

## Tips

- Combine filter operators into a single `filter` string: `"from:alice@co.com is:unread newer_than:7d"` - do not split them across calls.
- Call `folders` to discover exact folder identifiers before passing them to `emails` or `search`'s `in` parameter.
- Call `accounts` to discover calendar identifiers before passing them to `events`'s `in` parameter, **and** to check each account's access level before attempting `draft`, `comment`, `action`, or `contact-action`.
- Use `search` for topic-based queries - it returns bodies. Use `emails` for browsing or slicing by metadata - it does not.
- Use `thread` after finding an interesting message ID with `emails` or `search`.
- Multi-word subjects and team names must be quoted inside the filter string: `subject:"quarterly report"`.
- `action` and `contact-action` accept arrays of IDs/emails - batch related changes into a single call rather than one call per message.
- Never end a draft body with a sign-off: Spark appends the account's signature itself (`draft { "mode": "signatures" }` shows it).
- `draft { "delete": "<pk>" }` discards a draft permanently - there is no Trash and no undo, so use it only when the user asked for it.
- If a write tool returns an "access denied" error, surface it to the user and point them at **Spark Desktop > Settings > AI Agents** to raise the level. They can also perform the action directly in Spark Desktop.
