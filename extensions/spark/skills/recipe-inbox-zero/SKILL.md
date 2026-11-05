---
name: recipe-inbox-zero
description: >-
  Process inbox to zero using category-first triage: review by category,
  read threads, then archive, move, or mark done.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Inbox Zero

Process the inbox to zero using category-first triage. Work through categories in priority order, then take action on each email.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Scan by category (use recipe-inbox-by-category)

Process inbox in priority order:

```
emails { "folder": "Inbox", "filter": "category:priority is:unread" }
emails { "folder": "Inbox", "filter": "category:personal is:unread" }
emails { "folder": "Inbox", "filter": "category:invitation" }
emails { "folder": "Inbox", "filter": "category:notification is:unread" }
emails { "folder": "Inbox", "filter": "category:newsletter newer_than:7d" }
```

### Step 2: Review and act on each email

For emails that need attention, read the thread:

```
thread { "message_id": "<id>" }
```

Then decide the action:

**Archive** - handled or informational, no further action needed:
```
action { "action_name": "archive", "message_ids": ["<id>"] }
```

**Move to folder** - needs filing:
```
action { "action_name": "moveToFolder", "message_ids": ["<id>"], "folder": "user@example.com:Projects" }
```

**Mark as done** - completed/resolved:
```
action { "action_name": "markAsDone", "message_ids": ["<id>"] }
```

**Pin** - important, need to come back to:
```
action { "action_name": "pin", "message_ids": ["<id>"] }
```

**Snooze** - not relevant now, revisit later:
```
action { "action_name": "snooze", "message_ids": ["<id>"], "date": "2026-04-10" }
```

**Set aside** - save for later review:
```
action { "action_name": "setAside", "message_ids": ["<id>"] }
```

### Step 3: Batch process notifications and newsletters

For categories with many items, batch archive:

```
action { "action_name": "archive", "message_ids": ["<id1>", "<id2>", "<id3>", "<id4>"] }
```

### Step 4: Verify

```
emails { "folder": "Inbox", "filter": "is:unread" }
```

Confirm the inbox is clear or report what's left.

## Tips

- Work through categories in order - don't jump to newsletters before handling people mail.
- Batch archive is efficient for notifications: list them, confirm with the user, then archive all at once.
- Pin or snooze items that need future attention rather than leaving them unread.
- If an email needs a reply, use `draft` with `reply_to` and then archive - the draft keeps the task alive.
- If you spot miscategorized contacts while triaging, use `contact-action`'s `changeCategory*` actions to reclassify all future mail from that sender.
