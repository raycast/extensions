# Display Scripts

Toggle between two MacBook + external monitor layouts in one keystroke.

Built for the specific dual-mode setup where your laptop sits on a stand next to an external monitor:

- **Up-and-down (meeting mode)** — external on top, MacBook stacked below and centered, so the webcam lines up with your face when the laptop is pulled in front of you.
- **Side-by-side (focus mode)** — MacBook pushed to the left, external as the main canvas, with the external keyboard in front of you.

## Setup

1. Install [`displayplacer`](https://github.com/jakehilborn/displayplacer):
   ```sh
   brew install displayplacer
   ```
2. Run `displayplacer list` in Terminal. Find the **Persistent screen id** lines for your external monitor and MacBook.
3. Open the extension preferences and fill in:
   - **External Display ID** / **MacBook Display ID** — the persistent IDs from step 2.
   - **MacBook Origin (Side-by-Side)** — the `Origin:` value you want the MacBook to land at in focus mode (defaults to `(-1512,360)`).
   - **MacBook Origin (Up-and-Down)** — the `Origin:` value in meeting mode (defaults to `(949,1440)`).
   - **Path to displayplacer** — defaults to `/opt/homebrew/bin/displayplacer`; change for Intel Macs (`/usr/local/bin/displayplacer`).

## Assumed display setup

Resolutions and refresh rates are hardcoded to the author's setup:

- External: **3440×1440 @ 144 Hz**, rotated 180° (typical for an inverted ultrawide mount).
- MacBook: **1512×982 @ 120 Hz**, HiDPI scaling.

If your displays differ, fork the extension and adjust `buildLayoutArgs` in `src/toggle-arrangement.tsx`.

## Usage

Run **Toggle Arrangement** from Raycast. The toast confirms which layout you're now in.

## Source

The original shell script and full repo: <https://github.com/Temberlane/DisplayScripts>.
