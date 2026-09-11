# Mouse Jiggle

A Raycast extension that continuously jiggles the mouse cursor to prevent your Mac from sleeping, keep Microsoft Teams status active, or any other purpose requiring periodic mouse movement.

## Features

- **Zero dependencies** — Uses macOS's built-in Swift interpreter, no Homebrew or external tools required
- **Dramatic zigzag movements** — Big 80-150px leaps with sharp turns every 2 seconds, keeping the cursor active
- **Start/Stop commands** — Easy control via Raycast commands
- **Stops immediately** — Removes sentinel file, process exits within 0.2 seconds
- **Fun Mode** — Optional preference that draws a visible orange trail line following the mouse across the screen

## Requirements

- macOS (Swift included)
- Raycast

No additional software or dependencies needed.

## Installation

1. Open Raycast
2. Go to **Extensions** → **Import Extension**
3. Select the `mouse-jiggle` folder

## Usage

### Start Mouse Jiggle

Search for **Start Mouse Jiggle** in Raycast and run it. The mouse will begin jiggling with dramatic zigzag movements.

### Stop Mouse Jiggle

Search for **Stop Mouse Jiggle** in Raycast and run it to stop the background process immediately.

### Fun Mode

Open the extension's **Preferences** and enable **Fun Mode**. A transparent overlay window appears showing a bright orange line that follows the mouse cursor, creating a visible trail of its zigzag path. The longer it runs, the more tangled the pattern becomes.

## How It Works

The extension spawns a lightweight background Swift process that:
1. Moves the mouse in big zigzag leaps (80-150px every 2 seconds)
2. Makes sharp direction changes, bouncing off screen edges
3. In Fun Mode, additionally creates a transparent full-screen overlay window
4. Tracks mouse position 20 times per second and draws connected orange lines
5. Checks a sentinel file every 0.2 seconds and exits cleanly when stopped

## License

MIT License
