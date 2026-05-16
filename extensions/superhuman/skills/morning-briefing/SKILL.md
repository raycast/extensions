---
name: morning-briefing
description: Overnight inbox triage plus today's calendar summary.
tools_used:
  - query_email_and_calendar
  - list_threads
  - get_availability
read_only: true
upstream: https://raw.githubusercontent.com/superhuman/mcp-mail/main/skills/morning-briefing/SKILL.md
upstream_sha: ""
---

# Morning Briefing

Give me a clear, scannable summary of what changed in my inbox overnight and what my calendar looks like today.

## Inbox

1. Query `query_email_and_calendar` for everything that landed since I last checked.
2. Group results into:
   - **VIP / Important**: messages from people I correspond with frequently, my manager, my direct reports, customers, anyone I've replied to in the last 30 days.
   - **Action required**: messages addressed to me that ask a question or request something. Quote the ask in one sentence.
   - **FYI**: announcements, newsletters, calendar invites that don't need a response.
   - **Likely noise**: marketing, system notifications, automated reports.

For each VIP / Action thread, give me: sender, subject, one-sentence summary, and the thread id so I can pull it up.

## Calendar

1. Fetch today's events.
2. List them in time order with: time, duration, title, attendees.
3. Flag any meeting where I'm the organizer but haven't sent an agenda or pre-read.
4. Flag any conflict or back-to-back gap shorter than 5 minutes.

## Output format

```
Inbox (since {{last_check}})
  VIP & Action ({{n}})
    1. [thr_id] {{sender}} — {{subject}}
       {{one-sentence summary}}
       Action: {{what they're asking}}
    ...
  FYI ({{n}})
    - {{sender}}: {{subject}}
  Likely noise ({{n}})
    {{count by sender}}

Today's calendar
  09:00–09:30  1:1 with Alex
  10:00–11:00  Q3 planning  ⚠️ no agenda sent
  ...
```

Keep it tight. No more than 10 bullets total per section.

## Rules

- Read-only skill: do not draft, send, archive, or trash anything. Just report.
- Use the user's local timezone for calendar times.
- If the inbox is empty since last check, say so in one line and move on to the calendar.
