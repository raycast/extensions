# Superhuman for Raycast

Drive your inbox with Raycast AI. Draft, send, summarize, search, and triage email; check availability and create calendar events — all by mentioning `@superhuman` in Quick AI or AI Chat. Built on Superhuman's [official MCP server](https://help.superhuman.com/hc/en-us/articles/49810745762067-Superhuman-Mail-MCP-Server), no leaving Raycast.

## Setup

The first time you invoke any `@superhuman` tool, Raycast opens Superhuman's OAuth page in your browser. Sign in, grant access, and Raycast stores the token in its secure keychain. You can revoke access at any time from Superhuman's account settings.

> The extension talks to `https://mcp.mail.superhuman.com/mcp` over OAuth 2.1 + PKCE. If your organization is on a Superhuman plan that hasn't enabled MCP access yet, you'll see an error on first connect — contact Superhuman support to enable it.

## Tools

| Tool | What it does |
| --- | --- |
| `draft-email` | Create or update a Superhuman draft. Returns a draft id you can pass to `send-draft`. |
| `search-inbox` | Search email + calendar with Superhuman operators (`from:`, `subject:`, `has:attachment`, `is:unread`, `before:`, `after:`, etc.). |
| `send-draft` | Send a draft by id. Confirms before sending. |
| `discard-draft` | Discard a draft. Confirms first. |
| `undo-send` | Recall the most recent send if within the undo window. |
| `get-thread` | Fetch a full thread so the AI can read or summarize it. |
| `get-message` | Fetch a single message. |
| `list-threads` | List recent threads, optionally filtered by label or split. |
| `list-labels` | List your labels. |
| `list-splits` | List your inbox splits (Important, Other, News, Calendar, etc.). |
| `get-attachment` | Retrieve an attachment from a message. |
| `get-read-status-feed` | See who has opened your recent tracked emails. |
| `mark-spam` | Mark a thread as spam. Confirms first. |
| `trash-thread` | Move a thread to trash. Confirms first. |
| `unsubscribe` | Unsubscribe from the sender of a thread. Confirms first. |
| `update-thread` | Archive/unarchive, mark read/unread, star, add or remove labels. |
| `update-personalization` | Update name, signature, voice/tone, and default greeting. |
| `create-or-update-event` | Create or update a calendar event. Confirms when attendees are included. |
| `get-availability` | Free/busy for the user and optional attendees over a time range. |

## Example prompts

### Compose, send, recall
```
@superhuman Draft an email to sarah@example.com about tomorrow's project meeting
@superhuman Send the draft I just made
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
@superhuman Mark this thread as spam
@superhuman Unsubscribe from this sender
```

### Calendar
```
@superhuman Am I free Thursday at 3pm for 30 minutes?
@superhuman Create a 30-min meeting tomorrow at 10am with foo@bar.com about the launch plan
```

## Cross-extension workflows

`@superhuman` shines when combined with other Raycast AI extensions.

```
@calendar What meetings do I have today?
@superhuman Email the attendees of my 2pm meeting about the updated agenda

@github Show my open PRs
@superhuman Draft an email to the team about the status of the frontend PR

@notion Summarize the marketing strategy page
@superhuman Draft an email to the marketing team with insights from our strategy document
```

## Search operators

Pass these directly in a search query, lowercase, no space after the colon:

- `from:name` / `to:name`
- `subject:topic` (multi-word values are OK; no quotes needed)
- `"exact phrase"` for full-text phrases
- `has:attachment`
- `in:sent`, `in:inbox`, `-in:inbox`, `in:<label>`
- `is:unread`, `is:starred`, `is:shared`
- `before:YYYY/MM/DD`, `after:YYYY/MM/DD`
- `older_than:Xd`, `newer_than:Xm`

## Feedback

Bugs and feature requests: file an issue on the [raycast/extensions](https://github.com/raycast/extensions) repo.

---

Built for Raycast and Superhuman power users.
