---
name: apple-calendar-applescript
description: Adds or debugs “write to Apple Calendar” in Raycast extensions using runAppleScript. Creates Calendar events with title, start/end, calendar. Use when implementing Add to Calendar, Apple Calendar integration, or runAppleScript for Calendar on macOS.
---

# Apple Calendar via AppleScript

## Usage

- Use `runAppleScript` from `@raycast/utils` (macOS only). Prefer JXA (`language: "JavaScript"`) or AppleScript.
- Pass event title, start date, end date; optionally calendar name. Script creates event in Calendar app.

## Flow

1. Get event details (title, start, end, optional calendar) from extension (e.g. focus session).
2. Build script string (escape quotes if needed); call `runAppleScript(script)` or pass args as second parameter.
3. Handle errors (Calendar not found, permission, invalid dates); show Toast on failure.

## Reference

- Minimal Calendar script examples: [reference.md](reference.md)
