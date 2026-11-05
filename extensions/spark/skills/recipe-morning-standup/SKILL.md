---
name: recipe-morning-standup
description: >-
  Morning standup briefing: today's events, unread people and priority mail,
  and team assignment status.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Morning Standup

Start the day with a structured briefing: today's calendar, unread mail by category, and team assignment status.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Today's calendar

```
events { "today": true }
```

List all meetings and events for today. Note any prep needed.

### Step 2: Unread priority mail

```
emails { "folder": "Inbox", "filter": "category:priority is:unread" }
```

Auto-prioritized or manually flagged items - the most important emails.

### Step 3: Unread people mail

```
emails { "folder": "Inbox", "filter": "category:personal is:unread" }
```

Direct conversations that likely need a response today.

### Step 4: Team assignment status

```
team { "name": "Team Name" }
```

Review the assignment summary - who has open items, any unassigned work.

### Step 5: Present the briefing

Summarize for the user:
- **Calendar:** N meetings today (list times and titles)
- **People mail:** M unread (list senders and subjects)
- **Priority mail:** K unread
- **Team:** open assignments per member, any unassigned items

## Tips

- This recipe works best first thing in the morning or at the start of a work session.
- Skip step 4 if the user doesn't work with teams.
- Add an `emails` call with `filter: "category:invitation"` after step 3 if the user has pending invitations.
- For a quicker briefing, just run steps 1-3 - calendar plus priority and people mail covers the essentials.
