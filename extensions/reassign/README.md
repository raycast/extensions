# Reassign for Raycast

A keyboard-first companion for [Reassign](https://reassign.app) — the circular
24-hour dial planner. See your day, schedule blocks in plain words, check off
your plan, and keep your current block in the menu bar, all without a browser.

**Companion, not client.** It talks to the Reassign public REST API (`/api/v1`)
over OAuth. It never holds an admin token; the API enforces ownership on the server.

## How it differs from calendar tools

This is **not** a calendar assistant or a standalone scheduler. It requires a
[Reassign](https://reassign.app) account and mirrors your Reassign plan — its
time blocks, areas, activities, and reflections. Unlike tools that create events
in Google or Outlook Calendar (for example Reclaim) or that manage their own
weekly schedule, this extension is a keyboard surface for the Reassign planner
you already use: glance at your dial day, capture blocks, and check them off.

## Commands

- **Agenda** — today’s plan by default, with a week view (`⌘⇧W` toggles).
  Your explicit day/week choice is remembered.
  Day view groups blocks into Now / Up next / Later / Done, with check-off,
  edit (including the calendar home and mirrors), move, shift, and delete.
  Filter by area or activity, or hide non-blocking and reference blocks. `⌘F` searches every block by text. A **Join**
  action opens a block's meeting link.
- **Add Block** — one capture. An explicit date and time schedules the
  block; a bare idea saves to the Inbox. Use native Start and End date-time pickers (for example, “tomorrow at 10am”);
  expand details for area, activity, type, notes, and calendars. The primary
  action follows your entered times. Duration appears when either Start or End is
  missing (`90m`, `1h30`, or `1 hour 30 minutes`); with both filled, it is calculated.
  A date without a time is an Inbox
  idea with a planned date; a duration without a time offers **Find a Time** and
  concrete slots to choose from. Successful saves return to Raycast.
  **Fill with AI** (`⌘⇧A`) uses Reassign AI to suggest one new block. Review the
  preview, choose **Use Suggested Block**, edit any fields, then save. AI is optional
  and never saves automatically; manual entry needs no AI call.
  With a connected calendar, pick the calendar the block publishes to (or keep
  it in Reassign only) and the calendars that get a one-way mirror copy.
- **Inbox** — your saved ideas with no time yet; schedule or remove them.
- **Search Blocks** — search directly from Raycast, with an optional query argument.
  This is also available inside Agenda with `⌘F`.
- **Now** — the current block in the menu bar, with the time remaining, check-off
  and Join actions, and a heads-up notification before each block starts.

## Getting started

1. Run any command and choose **Sign in** — Reassign opens in your browser to
   confirm the connection ("Verified by Reassign").
2. Your day loads. That is it.

## Requirements

- A Reassign account with an active Pro subscription or trial.
- Raycast 2.4.1 or later on macOS.

## License

MIT.
