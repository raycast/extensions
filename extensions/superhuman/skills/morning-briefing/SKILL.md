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

Give the user a calm, scannable summary of what changed in their inbox overnight and what their calendar looks like today.

## Inbox

1. Query `query_email_and_calendar` for everything that landed since the user last checked.
2. Group results into four buckets, in priority order:
   - **VIP / Important** — messages from frequent correspondents, direct reports, customers, anyone the user has replied to in the last 30 days.
   - **Action required** — messages addressed to the user that ask a question or request something.
   - **FYI** — announcements, newsletters, invites that don't need a response.
   - **Likely noise** — marketing, system notifications, automated reports.

3. **For every item in VIP / Action, you MUST include the thread id.** Format each item EXACTLY like this:

   ```
   - [t_abc123def] Sender Name — Subject line
     One-sentence summary of what they want.
     Action: Quote the ask in one short sentence.
   ```

   If the thread id is missing from the underlying data, OMIT the item rather than fabricate or skip the id.

4. For FYI, one bullet per item: `- Sender: Subject`.

5. For Likely noise, do NOT enumerate. Aggregate by sender and emit a single line: `Likely noise (N total): DocuSign × 6, Mercury × 2, Newsletters × 3, …`.

## Calendar

1. Fetch today's events for the user's local timezone.
2. List them in time order with: time range, duration, title, attendees.
3. Flag any meeting where the user is organizer but no agenda or pre-read has been sent.
4. Flag any conflict or back-to-back gap shorter than 5 minutes.
5. If the calendar is empty for today, say so in one short sentence and move on.

## Hard constraints — verify before returning

- Every VIP and Action item starts with `[t_<id>]`. If yours don't, regenerate.
- Each of VIP, Action, FYI has **≤ 10 items**. If a section exceeds 10, drop the lowest-priority items until it fits. State the count: `VIP / Action (7 shown of 14 total)`.
- Likely noise is exactly ONE line, aggregated by sender.
- No drafts. No archiving. No labels. Report only.
- Use the user's local timezone for all calendar times.
- Do not add a meta-commentary preamble ("Let me check…"). Open with `## Your day at a glance` or skip directly to the buckets.
