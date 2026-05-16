---
name: eod-wrapup
description: End-of-day summary of activity and tomorrow's calendar.
tools_used:
  - query_email_and_calendar
  - list_threads
  - get_read_status_feed
read_only: true
upstream: https://raw.githubusercontent.com/superhuman/mcp-mail/main/skills/eod-wrapup/SKILL.md
upstream_sha: ""
---

# End-of-Day Wrap-up

Summarize what I got done today and what tomorrow looks like, so I can close my laptop with a clean handoff.

## What I did today

1. `list_threads` filtered to `from: me` for today.
2. For each sent thread, note: recipient, subject, whether they've replied yet.
3. `get_read_status_feed` since this morning. Note which of my outbound emails have been opened (and when) vs unread.
4. Pull today's calendar from `query_email_and_calendar` ("what meetings did I have today"). For each, note: attendees, whether I was organizer, any followups that came out of it (look for replies on related threads).

## What's outstanding

- Threads addressed to me from today where I haven't replied yet — list them with the ask.
- Threads I sent today that have been opened but not replied to (so I know who's "thinking about it").

## What's tomorrow

- Tomorrow's calendar in time order: time, duration, title, attendees, prep needed.
- Flag meetings where I'm the organizer with no agenda visible in my recent sent mail.

## Output format

```
Today
  Sent: {{n}} emails to {{unique recipients}}.
    {{recipient}} — {{subject}}  (opened ✓ / replied ✓)
  Meetings: {{count}} ({{total minutes}})
  Replies still owed:
    1. [thr_id] {{sender}} asking: {{ask}}

Tomorrow
  09:00–09:30  1:1 with Alex     (prep: none)
  14:00–15:00  Customer review   ⚠️ no agenda sent
```

## Rules

- Read-only skill: do not draft anything. The point is the summary, not the followup.
- Times in the user's local timezone.
- If today was a no-meeting / no-send day, say so plainly and skip those sections.
