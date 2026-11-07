---
name: recipe-stakeholder-brief
description: >-
  Build a comprehensive dossier on a person by pulling all meetings they
  attended and email threads with them into a single relationship brief.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Stakeholder Brief

Given a person's name, compile all recent interactions — meetings and emails — into a relationship brief. Useful before 1:1s, performance reviews, or re-engaging with someone after a gap.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Look up the person

```
contacts { "query": "person name" }
```

Note their email address(es) and any other details.

### Step 2: Pull recent email threads

```
emails { "filter": "from:person@co.com newer_than:30d" }
```

Also check emails sent to them:

```
emails { "filter": "to:person@co.com newer_than:30d" }
```

For the most important threads, read the full conversation:

```
thread { "message_id": "<id>" }
```

Note open threads (unanswered or pending action) vs. resolved ones.

### Step 3: Find shared meetings

```
meetings { "filter": "newer_than:30d" }
```

Scan meeting titles and participant lists for the person. For each relevant meeting, pull the summary:

```
meeting { "meeting_id": "<id>" }
```

If the person's contributions or commitments aren't clear from the summary:

```
meeting { "meeting_id": "<id>", "transcript": true, "notes": true }
```

### Step 4: Check upcoming events with them

```
events { "week": true }
```

Note any upcoming meetings where this person is an attendee.

### Step 5: Compile the brief

Organize into sections:

- **Contact:** name, email, role (if known from context)
- **Last interaction:** date and channel (meeting or email)
- **Open items:** threads awaiting response, commitments not yet fulfilled
- **Recent topics:** what you've discussed across meetings and email (grouped by theme)
- **Upcoming:** any scheduled meetings with them
- **Key context:** notable decisions made together, recurring discussion themes

### Step 6: Present the brief

Lead with the most actionable information — open items and upcoming meetings — then provide the fuller context. Flag anything that looks like it needs attention before the next interaction.

## Tips

- This recipe is person-centric, unlike `recipe-meeting-prep` which is event-centric. Use this when you want to understand the full relationship, not just prep for one meeting.
- For people you interact with frequently, narrow the time window to `newer_than:14d` to keep the brief focused.
- For people you haven't spoken to in a while, widen to `newer_than:90d` or use `after:yyyy/MM/dd` to capture the last meaningful period.
- Use `search` with the person's name as a supplementary search to catch threads where they're mentioned but not in the from/to fields.
- If the person is a teammate, `team` may show their current email assignments.
