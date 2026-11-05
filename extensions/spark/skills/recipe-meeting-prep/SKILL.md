---
name: recipe-meeting-prep
description: >-
  Prepare for an upcoming meeting: check agenda, search for email context,
  look up attendee details, and flag open threads that should be raised.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Meeting Prep

Prepare for an upcoming meeting by gathering calendar context, relevant email threads, and attendee information. Optionally, run a gap analysis after the meeting to flag verbal commitments without a written trail and open threads that weren't raised.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Check the calendar

```
events { "today": true }
```

Identify the meeting to prepare for - note the topic, time, and attendees.

### Step 2: Search for relevant email context

```
search { "query": "meeting topic or project name" }
```

This returns up to 20 emails with full bodies, sorted by relevance. Read the most relevant threads for context.

### Step 3: Look up attendees

```
contacts { "query": "attendee name" }
```

Repeat for each attendee to gather their email and any other details.

### Step 4: Check recent correspondence with attendees

```
emails { "filter": "from:attendee@co.com newer_than:14d" }
```

Review any recent threads with the meeting participants for open items or unanswered questions.

### Step 5: Flag unresolved threads to raise in the meeting

Check for open or unreplied threads with the attendees that may be worth bringing up:

```
emails { "filter": "from:attendee@co.com is:unreplied newer_than:14d" }
emails { "filter": "to:attendee@co.com is:unreplied newer_than:14d" }
```

Note any threads that look relevant to the meeting topic but haven't been resolved — these are candidates to raise during the discussion.

### Step 6: Present the prep summary

Summarize for the user:
- **Meeting:** time, title, attendees
- **Context:** key points from relevant email threads
- **Open items:** unanswered questions or pending actions from recent correspondence
- **Threads to raise:** unreplied or unresolved threads with attendees that relate to the meeting topic
- **Attendees:** contact details for reference

### Step 7 (optional, post-meeting): Meeting–email gap analysis

After the meeting, compare what was discussed against the email record to catch gaps. This step requires the meeting transcript to be available.

1. Read the transcript:
   ```
   meeting { "meeting_id": "<id>", "transcript": true, "notes": true }
   ```
   Extract topics discussed, commitments made, and decisions reached.

2. For each major topic, check whether it has an email trail:
   ```
   search { "query": "topic from meeting" }
   ```

3. Flag two kinds of gaps:

   **Discussed in meeting, no email trail** — verbal commitments or decisions that may need a follow-up email to create a written record.

   **Open email threads not raised in meeting** — compare the unreplied threads from Step 5 against what was actually discussed. Flag any that seem relevant but weren't mentioned.

   Present gaps neutrally — not every gap needs action. Some things are intentionally verbal-only, and some threads are intentionally deferred.

## Tips

- Run this 15-30 minutes before the meeting for fresh context.
- Use `search` rather than `emails` for topic-based context - search returns full bodies.
- If the meeting is recurring, check `meetings` with the `subject:meeting-topic` filter for past transcripts.
- For large meetings, focus on the 2-3 most important attendees rather than looking up everyone.
- The `is:unreplied` filter is especially useful for surfacing threads that may have been forgotten — both before the meeting (things to raise) and after (things that were missed).
- For recurring meetings, running the post-meeting gap analysis regularly can reveal patterns where the same threads go unaddressed week after week.
