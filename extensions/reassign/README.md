# Reassign for Raycast

A keyboard-first companion for [Reassign](https://reassign.app) — the circular
24-hour dial planner. See your day, schedule blocks in plain words, check off
your plan, and keep your current block in the menu bar, all without a browser.

**Companion, not client.** It talks to the Reassign public REST API (`/api/v1`)
over OAuth. It never holds an admin token; row-level permissions enforce
ownership on the server.

## How it differs from calendar tools

This is **not** a calendar assistant or a standalone scheduler. It requires a
[Reassign](https://reassign.app) account and mirrors your Reassign plan — its
time blocks, areas, activities, and reflections. Unlike tools that create events
in Google or Outlook Calendar (for example Reclaim) or that manage their own
weekly schedule, this extension is a keyboard surface for the Reassign planner
you already use: glance at your dial day, capture blocks, and check them off.

## Commands

- **Agenda** — your plan for the week (default) or a single day (`⌘⇧W` toggles).
  Day view groups blocks into Now / Up next / Later / Done, with check-off,
  edit (including the calendar home and mirrors), move, shift, and delete.
  Filter by area or activity, or hide non-blocking and reference blocks. `⌘F` searches every block by text. A **Join**
  action opens a block's meeting link.
- **Schedule a Block** — one capture. An explicit date and time schedules the
  block; a bare idea saves to the Inbox. Set the area, activity, type, and notes.
  With a connected calendar, pick the calendar the block publishes to (or keep
  it in Reassign only) and the calendars that get a one-way mirror copy.
- **Inbox** — your saved ideas with no time yet; schedule or remove them.
- **Now** — the current block in the menu bar, with the time remaining, check-off
  and Join actions, and a heads-up notification before each block starts.

## Getting started

1. Run any command and choose **Sign in** — Reassign opens in your browser to
   confirm the connection ("Verified by Reassign").
2. Your day loads. That is it.

## Requirements

- A Reassign Pro account (the REST API is Pro-gated).
- Raycast on macOS.

## License

MIT.
