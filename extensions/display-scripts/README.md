# Display Scripts

Toggle between two MacBook + external monitor layouts in one keystroke.

Built for the specific dual-mode setup where your laptop sits on a stand next to an external monitor:

- **Up-and-down (meeting mode)** — external on top, MacBook stacked below and centered, so the webcam lines up with your face when the laptop is pulled in front of you.
- **Side-by-side (focus mode)** — MacBook pushed to the side, external as the main canvas, with the external keyboard in front of you.

## Setup

1. Install [`displayplacer`](https://github.com/jakehilborn/displayplacer):
   ```sh
   brew install displayplacer
   ```
2. In Raycast, run **Configure Displays**. From there you can:
   - **Pick your displays** from a dropdown (no copy-pasting UUIDs).
   - **Identify a display** with `⌘1` / `⌘2` — the cursor will shake on the physical screen so you know which is which.
   - **Capture the two MacBook origins**:
     - Press `⌘D` to open System Settings → Displays.
     - Drag the MacBook into the side-by-side position you want and press `⌘S` to capture it.
     - Drag it into the up-and-down position and press `⌘U` to capture that one.
   - Press `⌘↩` to save.
3. Bind **Toggle Arrangement** to a Raycast hotkey.

## Preferences

Only one manifest preference: **Path to displayplacer** (defaults to `/opt/homebrew/bin/displayplacer`; change to `/usr/local/bin/displayplacer` on Intel Macs).

All other configuration lives in the Configure Displays form.

## How it works

`Toggle Arrangement` runs `displayplacer list`, parses the MacBook's current `Origin:`, picks the opposite of the two captured layouts, and applies it. Resolutions and refresh rates of each display are read live from `displayplacer list`, so the extension adapts to whatever resolutions your displays are actually running.

## Source

The original shell script and full repo: <https://github.com/Temberlane/DisplayScripts>.
