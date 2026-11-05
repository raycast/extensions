---
name: recipe-team-workload
description: >-
  Audit team assignment distribution: per-member loads, delegated items,
  unassigned work, and workload imbalances.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Team Workload

Deep audit of how work is distributed across a team. Surfaces per-member assignment loads, items you've delegated, unassigned work, and imbalances.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Get the team overview

```
team { "name": "Team Name" }
```

Note the member list, shared inboxes, and the assignment summary. This gives you the high-level distribution.

### Step 2: Review per-member assignments

For each team member, pull their current assignments:

```
emails { "filter": "assigned_to:alice@co.com" }
emails { "filter": "assigned_to:bob@co.com" }
emails { "filter": "assigned_to:carol@co.com" }
```

Note the count and scan subjects/dates to spot stale items (old assignments that may be stuck).

### Step 3: Check what you've delegated

```
emails { "filter": "assigned_by:me" }
```

These are items you assigned to others. Cross-reference with per-member lists to see which are still open.

### Step 4: Find unassigned work

```
emails { "filter": "assigned_to:unassigned" }
```

If the team uses shared inboxes, also check each one:

```
emails { "folder": "shared@co.com:Inbox", "filter": "assigned_to:unassigned" }
```

### Step 5: Check open vs. done in shared inboxes

```
emails { "filter": "is:shared_inbox_open" }
emails { "filter": "is:shared_inbox_done" }
```

The ratio of open to done gives a sense of whether the team is keeping up.

### Step 6: Present the workload report

Summarize:
- **Per member:** assignment count and any notably old items
- **Imbalances:** flag members with significantly more or fewer assignments than average
- **Delegated by you:** N items still open, any that look overdue
- **Unassigned:** M items with no owner
- **Throughput:** open vs. done ratio across shared inboxes

## Tips

- Run this weekly to catch imbalances before they become problems.
- The `team` tool's assignment summary is a quick snapshot; the per-member `emails` queries give the full picture.
- Stale assignments (older than 7-14 days) are worth flagging - they may be stuck or forgotten.
- `assigned_by:me` is useful for managers and leads who delegate frequently.
- Compare this week's numbers to last week's (if you track them) to spot trends.
- Combine with `recipe-shared-inbox-status` for a shared-inbox-focused view, or use this recipe for the broader team picture.
- For large teams, focus on outliers rather than reporting every member - highlight who's overloaded and who has bandwidth.
