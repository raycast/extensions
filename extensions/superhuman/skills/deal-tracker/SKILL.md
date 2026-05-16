---
name: deal-tracker
description: Track a named deal or company across email and calendar.
tools_used:
  - query_email_and_calendar
  - list_threads
  - get_read_status_feed
read_only: true
upstream: https://raw.githubusercontent.com/superhuman/mcp-mail/main/skills/deal-tracker/SKILL.md
upstream_sha: ""
---

# Deal Tracker

Pull together everything that's happening on a deal or with a customer/company, so I can walk into the next conversation with full context.

## Inputs from the user

- Deal name, customer name, or company domain (e.g. "Acme Legal", "@acme.com").
- Optional: time window. Default to the last 60 days.

## Steps

1. **Email activity.** `query_email_and_calendar` for the company / deal name. Group results into:
   - **Inbound from them**: subject, sender, date, summary in one sentence.
   - **Outbound from me / my team**: subject, recipient, date, whether they replied.
   - **Internal**: threads within my own org that mention the deal.

2. **Meeting activity.** Query the calendar for events involving anyone at the company. Note: dates, attendees, whether I was organizer, presence of an agenda or notes.

3. **Read receipts.** `get_read_status_feed` filtered to the relevant threads. Note recent opens — useful for "they read my proposal but haven't replied" signals.

4. **Open loops.** Surface:
   - Threads where they replied last (I owe a response).
   - Threads where I replied last and they haven't (waiting on them).
   - Meetings scheduled with no agenda or pre-read.

## Output format

```
Acme Legal — last 60 days

Inbound (4)
  - Aug 12  jane@acme.com  "Re: Master agreement v3"  asks about indemnity carve-outs
  - Aug 09  legal@acme.com "Updated NDA attached"     attached PDF, no questions
  ...

Outbound (3)
  - Aug 10  me → jane@acme.com  "Master agreement v3"  opened ✓ replied ✓
  - Aug 06  me → jane@acme.com  "Kickoff pricing"      opened ✓ no reply

Meetings (2)
  - Aug 11  Kickoff (45m, organizer: me, attendees: 4)
  - Aug 04  Intro call (30m, organizer: jane)

Open loops
  → I owe: reply to Jane on indemnity carve-outs
  ← Waiting on them: pricing reply (5d old)
```

## Rules

- Read-only skill: do not draft replies. Surface the open loops; the user decides what to send.
- Quote dates plainly (e.g. "Aug 12") in the user's timezone.
- If the search returns zero matches, say so and suggest the user try a different spelling or domain.
