# Amphetamine Quick

Control the [Amphetamine](https://apps.apple.com/app/id937984704) keep-awake app from Raycast.

## Why this extension

Run Start Session, type the duration into the Hours, Minutes, and Seconds boxes, and the session starts. Leave the boxes empty for an infinite session. You never open a form or step through a menu, so a timed session is one command and a few keystrokes. End Session stops whatever is running, and Show Status tells you if a session is active and how much time is left.

## Commands

- **Start Session**: three inline boxes for Hours, Minutes, Seconds. Fill any of them and run.
  Leave all three empty to start a session with **no time limit**. Amphetamine works in whole
  minutes, so any leftover seconds are rounded up (the HUD tells you the rounded duration).
  A per-command preference lets you allow the display to sleep during the session.
- **End Session**: ends the current session.
- **Show Status**: reports whether a session is active and how much time is left.

## Requirements

- The Amphetamine app installed (Mac App Store, free). If it's missing, the extension opens the
  App Store page for it.
- **Automation permission**: the first command triggers a macOS prompt asking to let Raycast
  control Amphetamine. Approve it. If you miss it, enable it under
  **System Settings → Privacy & Security → Automation → Raycast → Amphetamine**.
