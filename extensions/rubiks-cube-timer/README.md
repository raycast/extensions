# Rubiks Cube Timer

Time your Rubik's Cube solves right inside Raycast — get a random scramble, start the timer, and keep your solves. No account, API key, or external service required.

## Features

- **Random 3×3 scrambles** — a fresh scramble for every solve
- **Timer** — start and stop with Enter, with a live count while you solve
- **Adjustable precision** — count up in whole seconds, half seconds, tenths, or hundredths (the final time is always millisecond-accurate)
- **Optional inspection** — a WCA-style countdown before the solve, with +2 / DNF penalties
- **Session stats** — best, ao5, and ao12 shown between solves
- **Local history** — every solve is saved on your machine between sessions
- **csTimer import/export** — move your solves to and from [csTimer](https://cstimer.net) using its export format
- **Built-in notation guide** — press `⌘/` to look up any move

## Timer precision

Open the command preferences (⌘, → Extensions, or "Configure Command") and set **Timer Precision**:

- **Seconds** — 1, 2, 3
- **Half seconds** — 1, 1.5, 2
- **Tenths** — 1, 1.1, 1.2
- **Hundredths** — 1, 1.01, 1.02

The recorded time is always exact regardless of this setting; it only changes how finely the running timer ticks.

## Inspection

Enable **Inspection** in the preferences to get a countdown before each solve (default 15 seconds, configurable via **Inspection Time**). Enter starts the countdown, Enter again starts the solve. Going over the inspection time adds **+2**; going 2 seconds past it is a **DNF**.

## Import / export

- **Export to csTimer** (⌘⇧E) writes a `cstimer_<timestamp>.txt` file to your Downloads folder that you can import directly into csTimer. You can leave out solves faster than a chosen number of seconds.
- **Import from csTimer** (⌘⇧I) lets you pick a csTimer export file and merges those solves into your history (duplicates are skipped). You can optionally replace your existing solves, or drop any faster than a chosen number of seconds.

## Notation

Press `⌘/` (or open the Actions menu) for a **Cube Notation** guide with diagrams for the basic moves, modifiers, slice turns, and rotations.

Notation pictures are taken from https://www.cube.academy/ — so give them some love :)
