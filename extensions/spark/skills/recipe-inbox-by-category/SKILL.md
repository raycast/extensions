---
name: recipe-inbox-by-category
description: >-
  Process inbox in priority order by Spark's smart categories: priority first,
  then people, invites, notifications, newsletters.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Inbox by Category

Process the inbox in priority order using Spark's smart categories. This ensures the most important messages get attention first.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Priority mail (highest priority)

```
emails { "folder": "Inbox", "filter": "category:priority is:unread" }
```

Emails Spark auto-prioritized or that the user manually marked as priority. These are the most important items.

### Step 2: People mail

```
emails { "folder": "Inbox", "filter": "category:personal is:unread" }
```

Direct person-to-person emails. Real conversations that usually need a response.

### Step 3: Pending invitations

```
emails { "folder": "Inbox", "filter": "category:invitation" }
```

Calendar invitations waiting for a response. Time-sensitive by nature.

### Step 4: Notifications

```
emails { "folder": "Inbox", "filter": "category:notification is:unread" }
```

Service notifications, alerts, and receipts. Scan for anything actionable, then move on.

### Step 5: Newsletters

```
emails { "folder": "Inbox", "filter": "category:newsletter newer_than:7d" }
```

Subscriptions and digests from the past week. Skim for interest, skip the rest.

### Step 6: Summarize

Report to the user:
- N unread people emails (with subjects/senders for the most recent)
- M unread priority emails
- K pending invitations
- Notification and newsletter counts (don't list unless asked)

## Tips

- This is the recommended default when the user asks "what's new" or "catch me up."
- Skip steps 4 and 5 for a quick briefing - priority + people + invites covers the essentials.
- For each category, only call `thread` for a specific `<id>` when the user asks about a specific email.
- Combine with `events` set to `today` for a full morning briefing.
