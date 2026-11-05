# 001 — Clean Raycast install and on-screen review

## Problem
Raycast still has two old registrations of Rexcast (Spanish build, and the `carlosarzze` build) next to the
real one (`carlos_arze`). The menu bar shows duplicate icons, and no command has been reviewed on screen.

## Acceptance criteria
- **AC1** Raycast Settings → Extensions lists exactly **one** "Rexcast", with English command names.
- **AC2** The macOS menu bar shows exactly **one** Rexcast icon and no red error triangle.
- **AC3** The menu bar item shows a session as working while a command runs, then as finished, and a
  "Needs your input" session raises the `!`. (Checked with a demo session and `sleep`.)
- **AC4** Every command opens without an error screen: Manage Sessions, Peek at Session, New Session,
  Run Command, Send Text to Session, Show Menu Bar Item, Open Rex.
- **AC5** `metadata/` holds a menu bar screenshot (2000×1250) next to the four command ones.

## Checks (written first)
- AC1: `specs/scripts/count-rexcast.applescript` counts the "Rexcast" rows in the open Settings window.
- AC2/AC3/AC5: a screenshot of the menu bar region, read by eye.
- AC4: `raycast://` deeplink per command, then a screenshot of its window.

## Out of scope
Publishing to the Store (`npm run publish`) stays a manual decision.

## Result (2026-11-04)
- **AC1** pass: one "Rexcast" in Settings → Extensions, nine English commands. The two old registrations
  (Spanish build, `carlosarzze` build) were uninstalled with "Uninstall and Delete Settings".
- **AC2** pass: one Rexcast icon in the menu bar, no error triangle.
- **AC3** partly verified: a session shows as working while `sleep` runs and as finished afterwards.
  The "needs your input" path is covered by unit tests only; no program reported `blocked` during the check.
- **AC4** pass: Manage Sessions, Peek at Session, New Session, Run Command, Send Text to Session and
  Show Menu Bar Item open without an error screen. Open Rex was not run on screen (it only brings Rex to the front).
- **AC5** pass: `metadata/rexcast-5.png` shows the menu bar dropdown with its submenu.
