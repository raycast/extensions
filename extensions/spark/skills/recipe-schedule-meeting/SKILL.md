---
name: recipe-schedule-meeting
description: >-
  Find mutual availability with attendees and suggest meeting times.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Schedule a Meeting

Find mutual availability with attendees and present time slot options for scheduling.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Look up attendee emails

```
contacts { "query": "attendee name" }
```

Repeat for each attendee to get their email addresses.

### Step 2: Find mutual availability

For tomorrow:

```
availability { "tomorrow": true, "attendees": "alice@co.com,bob@co.com" }
```

For a specific date range:

```
availability { "start": "2026-04-10", "end": "2026-04-11", "attendees": "alice@co.com,bob@co.com" }
```

For the full week:

```
availability { "week": true, "attendees": "alice@co.com,bob@co.com" }
```

### Step 3: Present the options

List the available time slots for the user to choose from. Include:
- Date and time range for each slot
- Duration of each slot (so the user knows if a 1-hour meeting fits)

### Step 4: Narrow down if needed

If no slots work, try a broader window:

```
availability { "start": "2026-04-10", "end": "2026-04-14", "attendees": "alice@co.com,bob@co.com" }
```

Or check individual availability to find who's blocking:

```
availability { "start": "2026-04-10", "end": "2026-04-11", "attendees": "alice@co.com" }
availability { "start": "2026-04-10", "end": "2026-04-11", "attendees": "bob@co.com" }
```

## Tips

- `availability` respects working hours (08:00-20:00) and skips weekends automatically.
- Events marked as "free" in the calendar are ignored - they don't block availability.
- Without `attendees`, the tool shows the user's own free time.
- For large groups, narrow the date range to get focused results.
- If the user provides names instead of emails, use `contacts` first to resolve them.
- The free slots are computed as mutual windows - times when all attendees and the user are available.
