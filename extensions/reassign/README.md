# Reassign for Raycast

A keyboard-first companion for [Reassign](https://reassign.app) — the circular
24-hour dial planner. See your day, schedule blocks in plain words, check off
your plan, and keep your current block in the menu bar, all without a browser.

**Companion, not client.** It talks to the Reassign public REST API (`/api/v1`)
over OAuth. It never holds an admin token; row-level permissions enforce
ownership on the server.

## Commands

- **Agenda** — your plan for the week (default) or a single day (`⌘⇧W` toggles).
  Day view groups blocks into Now / Up next / Later / Done, with check-off,
  edit, move, shift, and delete. Filter by area or activity, or hide
  non-blocking and reference blocks. `⌘F` searches every block by text. A **Join**
  action opens a block's meeting link.
- **Schedule a Block** — one capture. An explicit date and time schedules the
  block; a bare idea saves to the Inbox. Set the area, activity, type, and notes.
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
