# Momently for Raycast

Create, browse and delete [Momently](https://momently.madza.rs) countdown events from Raycast.

## Commands

| Command | What it does |
| --- | --- |
| **Create Event** | Form for a new event: title, date (or all-day date), URL, notes, flagged. |
| **Search Events** | Events soonest first, with their countdown. Filter with the dropdown, like the app: *All*, *Upcoming*, *Past Events*, *Flagged*, *Shared*, *Repeating*. Actions: Open in Momently (↵), Show Details (⌘D), Create Event (⌘N), Copy Title (⌘⇧C), Refresh (⌘R), Delete Event (⌃X, asks first). |

## Requirements

- Momently for Mac, with AppleScript support (the app ships `Momently.sdef`).
- The first command asks to let Raycast control Momently. If it was denied, allow it in
  System Settings › Privacy & Security › Automation › Raycast › Momently.
- Developing against a debug build? Pick **Momently Dev** under the extension's *App* preference.

## How it talks to Momently

The extension runs AppleScript commands from Momently's scripting dictionary, which answer in JSON:

```applescript
tell application id "rs.madza.Countdown"
    create event "Christmas" starting "2026-12-25" with all day   -- the new event, as JSON
    list events including past false limit 50                     -- JSON array, soonest first
    delete event "3F2504E0-4F89-11D3-9A0C-0305E82C3301"           -- true
end tell
```

`starting` takes ISO 8601 text (`2026-12-25T18:00:00Z`, `2026-12-25`) or an AppleScript date.
Opening an event uses the app's `momently://open?id=<id>` URL.
