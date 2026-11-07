---
name: recipe-invitation-manager
description: >-
  Process pending calendar invitations: check availability and present a
  decision list with recommendations.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Invitation Manager

Process pending calendar invitations by checking availability for each and presenting a decision list with recommendations.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: List pending invitations

```
emails { "folder": "Inbox", "filter": "category:invitation" }
```

Collect all pending invitations. Note the senders, subjects, and IDs.

### Step 2: Read each invitation

For each invitation, read the thread to understand the meeting details:

```
thread { "message_id": "<id>" }
```

Note the proposed time, attendees, and purpose.

### Step 3: Check availability for each

For each invitation's proposed time, check whether the user is free:

```
events { "today": true }
```

Or for a specific date range:

```
events { "start": "2026-04-14", "end": "2026-04-14" }
```

For a broader view:

```
availability { "start": "2026-04-14", "end": "2026-04-14" }
```

### Step 4: Present a decision list

Summarize each invitation with a recommendation:

- **Accept** - the user is free at the proposed time
- **Conflict** - the user has an overlapping event (name the conflict)
- **Needs discussion** - the user is technically free but the meeting needs clarification

### Step 5: Check invitation responses

Review any invitation responses the user has received:

```
emails { "folder": "Inbox", "filter": "category:invitation_response" }
```

Report who accepted, declined, or proposed alternative times.

## Tips

- Process invitations daily - they're time-sensitive and forgetting one can mean missing an important meeting.
- Use `availability` to quickly check free slots rather than scanning through `events` manually.
- Invitation responses (`category:invitation_response`) are a separate category - check them to see who RSVPed.
- For recurring meeting invitations, read the thread to check if the pattern works long-term, not just the next occurrence.
- When there's a conflict, suggest an alternative time by checking `availability` around the proposed date.
- Combine with `recipe-schedule-meeting` when an invitation leads to rescheduling.
