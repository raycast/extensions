---
name: calendar-week-planning
description: Use when a user wants to plan their week in Google Calendar, find a meeting slot, or make room for focused work around existing commitments.
---

# Week planning

## When to use

Use for a weekly plan or a scheduling request with a duration and date range.
Produce a proposal unless the user also asks to save calendar changes.
Use only this extension's tools named below.

## Workflow

1. Call `get-current-time` and `get-current-user` to establish the date, timezone,
   and current user's email. Resolve relative dates into an explicit range.
   Establish working hours, meeting duration, attendees, and requested focus time.
   Ask about constraints that would materially change the proposed schedule.
2. Call `list-calendars` and select the relevant calendars. Follow `pageToken`
   while more pages remain. Include calendars the user identifies as commitments.
3. Call `search-events` for each selected `calendarId`, with `timeMin`, `timeMax`,
   and `singleEvents: true`. Follow returned `nextPageToken` as `pageToken`.
   Read titles, all-day events, timezone offsets, and overlapping commitments.
   Call `get-event` with `eventId` and `calendarId` when details need checking.
4. Resolve named attendees with `search-contacts`; clarify ambiguous matches.
   Call `suggest-time` with the range, `durationMinutes`, `timeZone`, working hours,
   buffers, and attendee emails. Include relevant secondary calendar addresses
   in `attendees` so their busy periods are considered; the current user is included.
5. Compare suggestions with the events already read and the user's preferences.
   Offer a small set of slots, or a daily plan with protected commitments and breaks.
   Distinguish available time from proposed work; never imply a proposal is booked.
6. When saving is requested, recheck the chosen range with `check-availability`.
   Supply `attendees`, `timeMin`, and `timeMax`; an error means availability is unknown.
   Call `create-event` with the chosen calendar, title, start, end or duration,
   timezone, and only requested attendees. Use `edit-event` only for requested moves.
   Preserve existing guests and recurrence unless the requested change includes them.
7. Verify each saved event with `get-event`. Report conflicts or failed writes;
   inspect the calendar before retrying an uncertain creation.

## Output

- Date range, timezone, calendars checked, and assumptions.
- A daily plan or slot table with start, end, purpose, and attendees.
- Conflicts, unavailable calendars, and constraints that remain unresolved.
- Confirmed saved events with returned links, or a clear label that this is a proposal.

## Do not

- Do not treat failed availability checks or unread calendars as free time.
- Do not move, delete, invite, or enable automatic declines merely to make a plan fit.
- Do not invent attendee emails or claim that a suggested slot is reserved.
