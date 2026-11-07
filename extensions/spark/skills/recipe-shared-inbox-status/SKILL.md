---
name: recipe-shared-inbox-status
description: >-
  Review shared inbox health: open vs. done items, unassigned work,
  and per-member assignment breakdown.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Shared Inbox Status

Review the health of one or more shared inboxes - open items, completed work, unassigned emails, and how assignments are distributed across team members.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Discover shared inboxes

```
accounts {}
```

Note each shared inbox address and the team it belongs to.

### Step 2: Check open items

For each shared inbox:

```
emails { "folder": "shared@co.com:Inbox", "filter": "is:shared_inbox_open" }
```

These are active items that still need attention.

### Step 3: Check unassigned items

```
emails { "folder": "shared@co.com:Inbox", "filter": "assigned_to:unassigned" }
```

Unassigned items are falling through the cracks - no one owns them yet.

### Step 4: Review per-member assignments

```
team { "name": "Team Name" }
```

The assignment summary shows how work is distributed. For a deeper look at a specific member's load:

```
emails { "folder": "shared@co.com:Inbox", "filter": "assigned_to:alice@co.com" }
emails { "folder": "shared@co.com:Inbox", "filter": "assigned_to:bob@co.com" }
```

### Step 5: Check completed items

```
emails { "folder": "shared@co.com:Inbox", "filter": "is:shared_inbox_done" }
```

Review recently completed items for a sense of throughput.

### Step 6: Present the status

Report per shared inbox:
- **Open:** N items awaiting action
- **Unassigned:** M items with no owner
- **Per member:** assignment counts (flag anyone with significantly more or fewer)
- **Done:** K items completed recently

If there are multiple shared inboxes, present each separately, then a combined summary.

## Tips

- Run this daily for active shared inboxes, weekly for quieter ones.
- Unassigned items are the most actionable finding - they represent work that nobody is looking at.
- Combine per-member counts with `recipe-team-workload` for a fuller picture of who has bandwidth.
- If a shared inbox has high open count but low unassigned count, work is distributed but not being closed - look for stale assignments.
- Use `thread` to read any item that looks stale or unusual.
- For teams with multiple shared inboxes, the total unassigned count across all inboxes is the key metric.
