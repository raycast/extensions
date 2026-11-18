---
name: recipe-meeting-followup
description: >-
  Review a meeting transcript and draft follow-up emails with action items
  to attendees.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Meeting Follow-Up

Review a meeting transcript, extract action items, and draft follow-up emails to attendees.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Find the meeting transcript

```
meetings { "filter": "newer_than:1d" }
```

Or search by topic:

```
meetings { "filter": "subject:standup" }
```

### Step 2: Review the summary

```
meeting { "meeting_id": "<id>" }
```

Read the AI-generated summary for key points.

### Step 3: Get full details if needed

```
meeting { "meeting_id": "<id>", "transcript": true, "notes": true }
```

Extract action items, decisions, and follow-up commitments from the full transcript and notes.

### Step 4: Look up attendee emails

```
contacts { "query": "attendee name" }
```

### Step 5: Draft the follow-up

```
draft { "to": ["attendee1@co.com", "attendee2@co.com"], "subject": "Follow-up: Meeting Topic - Action Items", "body": "Hi team,\n\nHere are the action items from today's meeting:\n\n- [ ] Item 1 (Owner: Alice, Due: Friday)\n- [ ] Item 2 (Owner: Bob, Due: Next week)\n\nLet me know if I missed anything.\n\nBest regards" }
```

Always confirm the draft content with the user before creating it.

### Step 6: Share with team if relevant

If the action items should be visible to the team:

```
comment { "message_id": "<related-thread-id>", "body": "Meeting follow-up posted - see action items in the follow-up email" }
```

## Tips

- Start with just `meeting` (summary only) - the full transcript is often more detail than needed.
- The `notes` parameter includes any notes taken during the meeting, which often contain the most actionable items.
- Use `transcript` when the summary doesn't capture something the user remembers discussing.
- Draft the follow-up as a new email (`to`) rather than a reply unless there's an existing thread about the same topic.
- For recurring meetings (standups, weeklies), use `meetings` with the `subject:standup newer_than:7d` filter to find the latest.
