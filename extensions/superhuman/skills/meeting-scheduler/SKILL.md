---
name: meeting-scheduler
description: Resolve participants, find availability, create the event with a video link.
tools_used:
  - get_availability
  - create_or_update_event
  - query_email_and_calendar
read_only: false
upstream: https://raw.githubusercontent.com/superhuman/mcp-mail/main/skills/meeting-scheduler/SKILL.md
upstream_sha: ""
---

# Meeting Scheduler

Schedule a meeting with one or more people in as few back-and-forths as possible.

## Inputs from the user (clarify if missing)

- Who: names or email addresses.
- When (window): e.g. "this week", "Thursday afternoon", "next Tuesday morning".
- Duration: default 30 minutes.
- Topic / title.
- Video link needed? Default yes.

## Steps

1. **Resolve participants.** If the user gave only first names, look them up in `query_email_and_calendar` ("who is X?") or in recent thread history. Always end up with full email addresses before calling `get_availability`.

2. **Find a slot.** Call `get_availability` with:
   - `participants`: the resolved names/emails
   - `start_date` / `end_date`: the window the user specified
   - `timezone`: IANA timezone (default to the user's)
   - `duration_minutes`: 30 unless specified
   - `working_hours_only`: true

3. **Pick the best slot.** Prefer:
   - Earliest in the window
   - Not back-to-back with another meeting (≥ 5 min buffer either side)
   - In the participants' overlapping working hours

4. **Confirm with the user.** Present the proposed slot and ask if you should go ahead. Do NOT skip this step.

5. **Create the event.** Call `create_or_update_event` with:
   - `title`: a clear, descriptive title
   - `start` / `end`: RFC3339 in the chosen timezone
   - `timezone`: IANA
   - `attendees`: the resolved emails
   - `conference`: true (adds a video link via the user's connected provider)
   - `description`: brief agenda — quote the topic the user gave

## Rules

- Write skill: gated by read-only mode. If read-only is on, surface that and stop.
- Always present the slot for confirmation before creating the event.
- If `get_availability` returns no overlap, offer the next-best window and ask the user.
- Times in the participants' shared timezone where possible; fall back to the organizer's.
