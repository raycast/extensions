---
name: recipe-weekly-digest
description: >-
  Weekly summary: this week's meetings, unread email breakdown by category,
  and team assignment status.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Weekly Digest

Generate a weekly summary covering calendar events, unread email by category, and team status.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: This week's calendar

```
events { "week": true }
```

List all meetings and events for the week.

### Step 2: Unread email breakdown by category

```
emails { "folder": "Inbox", "filter": "category:priority is:unread newer_than:7d" }
emails { "folder": "Inbox", "filter": "category:personal is:unread newer_than:7d" }
emails { "folder": "Inbox", "filter": "category:notification is:unread newer_than:7d" }
emails { "folder": "Inbox", "filter": "category:newsletter newer_than:7d" }
```

Count items in each category for the summary.

### Step 3: Team status

```
team { "name": "Team Name" }
```

Review assignment summary - open items per member, unassigned work.

### Step 4: Recent meeting transcripts

```
meetings { "filter": "newer_than:7d" }
```

List meetings that have transcripts available for review.

### Step 5: Present the digest

Summarize for the user:
- **Calendar:** N events this week (highlight important ones)
- **Email:** unread counts by category (people: M, priority: K, notifications: L, newsletters: J)
- **Team:** open assignments, any bottlenecks
- **Meetings:** transcripts available for review

## Tips

- Run this recipe on Monday morning for a forward-looking view, or Friday afternoon for a retrospective.
- Skip the team step if the user doesn't work with teams.
- For the email breakdown, just report counts - don't list individual emails unless asked.
- If the user has multiple accounts, run `accounts` first and report per-account.
- Combine with `recipe-inbox-by-category` to process the most active categories first.
