# 003 — Notifications that last, and can be turned off

## Problem
The Raycast HUD lasts about 2 seconds, too short to notice, and there is no way to turn it off. Rex Beta
already sends its own native notification for the same events.

## Acceptance criteria
- **AC1** A preference **Show Notifications** (default on) controls the HUD. When off, no HUD is shown, but the
  menu bar title and icons keep updating.
- **AC2** With notifications on, the message stays visible for about 6 seconds, not 2.
- **AC3** One event produces one notification sequence (no repeats on later polls).

## Checks (written first)
- `src/lib/hud.test.ts`: the number of HUD calls and pauses for a given duration.
- On screen: burst-capture the bottom of the screen and count how many consecutive frames show the HUD.

## Notes
Raycast does not let an extension set how long a HUD stays up, so it is shown again every 1.8 s until the
time is up, refreshing every 1 s, before the previous one starts to fade.

## Result (2026-11-05)
- **AC1** pass by unit test (`notificationsEnabled`: on unless explicitly `false`). Switching it off in Raycast
  was not tried on screen.
- **AC2** pass: with a real blocked report the message stayed up for about 6 s with no pulse. Refreshing every
  1.8 s made it fade slightly each time; refreshing every 1 s keeps the text intensity constant across 14 frames.
  A Raycast toast was tried and rejected: it opens the Raycast launcher window.
- **AC3** pass: one sequence per event.

## Bug found by this check
Raycast returned an empty preference object (`{}`) for the new checkbox, so `notifications` was `undefined`
and the first version silently showed nothing. Fixed by treating "no value" as on, with the test written first.
