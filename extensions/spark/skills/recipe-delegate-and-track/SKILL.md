---
name: recipe-delegate-and-track
description: >-
  Assign emails to teammates with context and track delegation status.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Delegate and Track

Assign emails to teammates with context, set due dates, and track delegation status to completion.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Review the team

```
team { "name": "Team Name" }
```

See who's available and their current assignment load.

### Step 2: Identify items to delegate

```
emails { "folder": "Inbox", "filter": "category:personal is:unread" }
```

Or for shared inbox items:

```
emails { "folder": "shared@company.com:Inbox", "filter": "assigned_to:unassigned" }
```

### Step 3: Read before delegating

```
thread { "message_id": "<id>" }
```

Understand the context so you can write a meaningful assignment comment.

### Step 4: Assign with context

```
action { "action_name": "assign", "message_ids": ["<id>"], "assignee": "bob@co.com", "comment": "Customer needs API key rotation, your area of expertise" }
```

For time-sensitive items, add a due date:

```
action { "action_name": "assign", "message_ids": ["<id>"], "assignee": "bob@co.com", "date": "2026-04-10", "comment": "Needs response by Friday" }
```

### Step 5: Track your delegations

```
emails { "filter": "assigned_by:me" }
```

Review the list of items you've delegated. Check progress periodically.

### Step 6: Complete or reopen

When a delegation is done:

```
action { "action_name": "delegationComplete", "message_ids": ["<id>"] }
```

If more work is needed:

```
action { "action_name": "delegationReopen", "message_ids": ["<id>"] }
```

## Tips

- Always include a `comment` when assigning - it saves the assignee from having to re-read the entire thread.
- Check `team` for the assignment summary before delegating to avoid overloading one person.
- Use `date` for items with real deadlines - it creates visibility for the assignee.
- Run `emails` with the `assigned_by:me` filter daily to monitor your delegation pipeline.
- Complete delegations promptly to keep the tracking view clean.
