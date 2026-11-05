---
name: recipe-end-of-day
description: >-
  End-of-day review: check for loose ends, review pinned items,
  and preview tomorrow's calendar.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: End of Day

Close out the workday by reviewing loose ends, checking pinned items, and previewing tomorrow's schedule.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Check for unreplied people mail from today

```
emails { "folder": "Inbox", "filter": "category:personal is:unread newer_than:1d" }
```

Any unread people mail from today likely needs a response. Flag these for the user.

### Step 2: Check unreplied priority mail

```
emails { "folder": "Inbox", "filter": "category:priority is:unread" }
```

Priority items that are still unread at end of day need explicit attention or deferral.

### Step 3: Review pinned items

```
emails { "folder": "Inbox", "filter": "is:pinned" }
```

Are any pinned items now resolved? Note which ones can be unpinned so the user can clean them up in Spark.

### Step 4: Preview tomorrow's calendar

```
events { "tomorrow": true }
```

Flag any meetings that need preparation. If a meeting needs prep, note it so the user can use `recipe-meeting-prep` in the morning.

### Step 5: Present the summary

Report to the user:
- **Loose ends:** N unreplied people/priority emails (list senders and subjects)
- **Pinned items:** M active, K look resolved
- **Tomorrow:** P meetings (list times and titles), any needing prep

## Tips

- This recipe is the bookend to `recipe-morning-standup` - start with standup, end with this.
- The goal is to surface everything the user needs to know so they can close out the day with confidence.
- If there are many unreplied items, help the user prioritize which 1-2 are most urgent.
- Reviewing pinned items prevents pin buildup - items stay pinned long after they're relevant.
- The tomorrow calendar preview helps the user mentally prepare and wake up ready for the first meeting.
