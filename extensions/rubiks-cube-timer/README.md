# Rubiks Cube Timer

Time your Rubik's Cube solves right inside Raycast — get a random scramble, start the timer, and keep your solves. No account, API key, or external service required.

## Features

- **Random scrambles** — a fresh 3×3 (or 2×2) scramble for every solve
- **Timer** — start and stop with Enter, with a live count while you solve (or a hidden timer if you prefer)
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

## Other settings

- **Cube** — scramble a **3×3** (default) or a **2×2**. Each cube keeps its own history, stats, and csTimer import/export, so 2×2 and 3×3 times never mix.
- **Hidden Timer** — hide the running time while solving (shows "Solving…" instead); the final time still appears when you stop.

## Inspection

Enable **Inspection** in the preferences to get a countdown before each solve (default 15 seconds, configurable via **Inspection Time**). Enter starts the countdown, Enter again starts the solve. Going over the inspection time adds **+2**; going 2 seconds past it is a **DNF**.

By default the countdown itself is hidden ("Inspecting…"); turn off **Hidden Inspection** if you want to see the seconds tick down.

## Import / export

- **Export to csTimer** (⌘⇧E) writes a `cstimer_<timestamp>.txt` file to your Downloads folder that you can import directly into csTimer. You can leave out solves faster than a chosen number of seconds.
- **Import from csTimer** (⌘⇧I) lets you pick a csTimer export file and merges those solves into your history (duplicates are skipped). You can optionally replace your existing solves, or drop any faster than a chosen number of seconds.

## Notation

Press `⌘/` (or open the Actions menu) for a **Cube Notation** guide with diagrams for the basic moves, modifiers, slice turns, and rotations.

Notation pictures are taken from https://www.cube.academy/ — so give them some love :)
