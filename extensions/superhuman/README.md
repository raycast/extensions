# Superhuman for Raycast

Drive your inbox with Raycast AI. Draft, send, schedule, summarize, search, and triage email; check availability and create calendar events — all by mentioning `@superhuman` in Quick AI or AI Chat. Built on Superhuman's [official MCP server](https://help.superhuman.com/hc/en-us/articles/49810745762067-Superhuman-Mail-MCP-Server), so the same surface area that backs Superhuman's first-party AI features is available inside Raycast.

## Setup

The first time you invoke any `@superhuman` tool, Raycast opens Superhuman's OAuth page in your browser. Sign in, grant access, and Raycast stores the token in its secure keychain. You can revoke access at any time from Superhuman's account settings.

> The extension talks to `https://mcp.mail.superhuman.com/mcp` over OAuth 2.1 + PKCE with [RFC 9728 protected-resource metadata discovery](https://datatracker.ietf.org/doc/html/rfc9728) and dynamic client registration. If your organization is on a Superhuman plan that hasn't enabled MCP access yet, you'll see an error on first connect — contact Superhuman support to enable it.

## Preferences

- **Enable Draft Previews** — show a preview before a draft is created in Superhuman. On by default.
- **Read-only mode** — block every write action (draft, send, archive, label, calendar create, personalization). All read tools (search, list, get) keep working. Useful when you want to see how the AI would respond without risking unintended changes.

## Capability matrix

### Compose & send

| Tool | What it does | Notable params |
|---|---|---|
| `draft-email` | Create or update a draft. | `instructions` (preferred — AI writer in your voice), `body` (literal HTML), `type: new \| reply \| reply_all \| forward`, `threadId`, `messageId`, `from` (alias) |
| `send-draft` | Send a draft. Mutually exclusive scheduling. | `smartSend`, `sendAt` (RFC3339), `undoTimeout` (1–10 min, returns `undoToken`) |
| `discard-draft` | Discard a draft. | — |
| `undo-send` | Recall a sent message. | `undoToken` (preferred) or `messageId` |

### Read

| Tool | What it does | Notable params |
|---|---|---|
| `query-email-and-calendar` | Flagship cross-source search and Q&A across email + calendar + contacts. | Free-text plus Superhuman operators |
| `search-inbox` | Deprecated alias for `query-email-and-calendar`. | — |
| `list-threads` | List threads with structured filters. | `from[]`, `to[]`, `subjectContains`, `bodyContains`, `labels[]`, `split`, `startDate`, `endDate`, `isUnread`, `isStarred`, `hasAttachment`, `cursor` |
| `get-thread` | Read a thread. | `includeComments`, `includeDrafts`, `messageLimit` (max 100, "root + newest N-1" truncation) |
| `get-message` | Read a single message. | `includeRawHtml` |
| `get-attachment` | Fetch an attachment (inline for images/audio, URL otherwise with 1h expiry). | `attachmentName` |
| `list-labels` | List user-created labels. | — |
| `list-splits` | List inbox splits (Important / Other / VIP / Team / Calendar) with `filter_criteria`, `thread_count`, `unread_count`. | — |
| `get-read-status-feed` | Who opened tracked emails and when. | `threadId`, `since`, `limit` (max 200), `cursor` |

### Triage

| Tool | What it does | Notable params |
|---|---|---|
| `update-thread` | Archive / mark read / star / important; add or remove labels; move to folder. | `markDone`, `markRead`, `markStarred`, `markImportant`, `addLabels`, `removeLabels`, `moveToFolder`, `lastMessageId` |
| `mark-spam` | Mark as spam, optionally bulk-blocking. | `alsoBlockSender`, `alsoBlockDomain`, `alsoTrash` |
| `trash-thread` | Move to trash. | — |
| `unsubscribe` | Unsubscribe from a mailing list. | — |

### Calendar

| Tool | What it does | Notable params |
|---|---|---|
| `create-or-update-event` | Create or update an event. | `timezone` (IANA, required), `attendees`, `conference` (adds video link), `recurrence` (RRULE), `reminders`, `calendarId`, `isAllDay`, RFC3339 times |
| `get-availability` | Free/busy across participants. | `participants` (names or emails — server resolves), `timezone` (required), `startDate`, `endDate`, `durationMinutes`, `workingHoursOnly` (default true) |

### Personalization

| Tool | What it does | Notable params |
|---|---|---|
| `update-personalization` | Update personalization via natural-language feedback to Superhuman. | `feedback` (e.g. "I prefer 'Hey' over 'Dear'") |

## Skills

Five curated workflows that chain the tools above into named operations, ported from Superhuman's [official Skills Library](https://github.com/superhuman/mcp-mail/tree/main/skills). Each is a Raycast command (`Morning Briefing`, `End-of-Day Wrap-up`, `Meeting Scheduler`, `Deal Tracker`, `Batch Draft Writer`) that opens the skill prompt and one-shot copies it for Quick AI. Skills that write to your account honor the **Read-only mode** preference.

The bundled `SKILL.md` files in `skills/` follow Superhuman's upstream format and are sync-able with `npm run sync-skills` (a weekly GitHub Action does the same).

See [`skills/README.md`](./skills/README.md) for the format and authoring guide.

## Example prompts

### Compose, send, recall

```
@superhuman Draft a reply to thread thr_5 telling them I'll send the deck Friday
@superhuman Send the draft I just made with a 5-minute undo window
@superhuman Undo that send
```

### Read and summarize

```
@superhuman Summarize the latest thread from Acme Legal
@superhuman What unread emails do I have from this morning?
@superhuman Grab the PDF attachment on the most recent thread with the contract
```

### Triage

```
@superhuman Archive every newsletter from last week
@superhuman Mark this thread as spam and bulk-trash any other inbox threads from that sender
@superhuman Unsubscribe from this sender
```

### Calendar

```
@superhuman Am I free Thursday at 3pm Pacific for 30 minutes?
@superhuman Create a 30-min meeting tomorrow at 10am Pacific with foo@bar.com, add a video link
```

### Cross-source

```
@superhuman What's everything happening with Acme — emails, meetings, open loops?
```

## Cross-extension workflows

```
@calendar What meetings do I have today?
@superhuman Email the attendees of my 2pm meeting about the updated agenda

@github Show my open PRs
@superhuman Draft an email to the team about the status of the frontend PR

@notion Summarize the marketing strategy page
@superhuman Draft an email to the marketing team with insights from our strategy document
```

## Search operators

Pass these directly in a `query-email-and-calendar` query, lowercase, no space after the colon:

- `from:name` / `to:name`
- `subject:topic` (multi-word values are OK; no quotes needed)
- `"exact phrase"` for full-text phrases
- `has:attachment`
- `in:sent`, `in:inbox`, `-in:inbox`, `in:<label>`
- `is:unread`, `is:starred`, `is:shared`
- `before:YYYY/MM/DD`, `after:YYYY/MM/DD`
- `older_than:Xd`, `newer_than:Xm`

## Migration

See [`MIGRATION.md`](./MIGRATION.md) for deprecated tool names and field renames.

## Feedback

Bugs and feature requests: file an issue on the [raycast/extensions](https://github.com/raycast/extensions) repo.

---

Built for Raycast and Superhuman power users.
