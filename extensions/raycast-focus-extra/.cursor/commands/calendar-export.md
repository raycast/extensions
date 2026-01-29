# Calendar Export

## Goal

Implement or refine “Add to Apple Calendar” action.

## Steps

1. Use runAppleScript from @raycast/utils (macOS only).
2. Map focus session (title, start, end) to Calendar event; optional calendar picker.
3. Add Action to ActionPanel on session item(s) that invokes the script.
4. Handle errors (Calendar app, permissions, invalid dates); show Toast on failure.
