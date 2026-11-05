---
name: recipe-calendar-audit
description: >-
  Analyze meeting load over a time range: total meetings, meeting hours,
  busiest days, back-to-back chains, and free blocks.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Calendar Audit

Analyze meeting load over a week or custom time range. Count meetings, estimate total hours, identify the busiest days, flag back-to-back chains, and surface free blocks.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Pull events for the period

For the current week:

```
events { "week": true }
```

For a custom range:

```
events { "start": "2026-04-13", "end": "2026-04-17" }
```

Record each event's date, start time, end time, and title.

### Step 2: Check free time

```
availability { "week": true }
```

Or for the same custom range:

```
availability { "start": "2026-04-13", "end": "2026-04-17" }
```

This shows free slots within working hours (08:00-20:00), skipping weekends and events marked "free."

### Step 3: Compute metrics

From the events list, calculate:
- **Total meetings:** count of events
- **Total meeting hours:** sum of all event durations
- **Per-day breakdown:** meetings and hours per day
- **Busiest day:** the day with the most meeting hours
- **Lightest day:** the day with the fewest meetings (best for deep work)
- **Back-to-back chains:** sequences of 2+ meetings with no gap between them
- **Longest free block:** the largest contiguous free window from the availability output

### Step 4: Check across calendars (optional)

If the user has multiple calendars or accounts:

```
events { "week": true, "in": "user@work.com" }
events { "week": true, "in": "user@personal.com" }
```

Compare meeting loads across contexts.

### Step 5: Present the audit

Report:
- **Summary:** N meetings totaling X hours this week (Y% of working hours)
- **Per day:** table of meetings and hours per day, flagging the busiest and lightest
- **Back-to-back:** list any chains of consecutive meetings (flag chains of 3+)
- **Free blocks:** the longest free windows available for deep work
- **Observations:** any patterns worth noting (e.g., mornings packed but afternoons free, one day completely booked)

## Tips

- Run this on Monday to plan the week, or Friday to review how the week went.
- Back-to-back chains of 3+ meetings are worth flagging - they leave no buffer for breaks or follow-ups.
- The ratio of meeting hours to total working hours (assume 8-10 hours/day) gives a quick "meeting load" percentage.
- For a forward-looking audit, use `events`'s `start` and `end` with next week's dates.
- Events marked "free" in the calendar don't count against availability - they won't inflate the meeting load.
- Combine with `recipe-schedule-meeting` to find the best slots for new meetings in a busy week.
- If the user has recurring meetings, patterns will be consistent week-to-week. Focus commentary on what's unusual.
