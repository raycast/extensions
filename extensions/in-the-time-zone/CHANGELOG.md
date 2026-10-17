# In The Timezone Changelog

## [Timeline Redesign] - {PR_MERGE_DATE}

- The timeline is now drawn as a graphic instead of monospace text, so it no longer wraps, and fills the full width
- Each hour is a cell colored by time of day: blue for sleep (22-6), strong yellow for work (9-17), pale yellow for the hours in between; the list view uses the same colors
- A cursor starts at the current time and can be moved along the timeline to compare times across cities
- ← / → and ⌥← / ⌥→ move the cursor by the configured scrub minutes, the same as in the list view
- ⇧← / ⇧→ snap the cursor to the previous / next full scrub step (by default the hour), and ⇧⌥← / ⇧⌥→ to the previous / next ⌥ scrub step (by default the half hour), in both the timeline and list views
- A green line marks the current time; once the cursor moves away from it, a red line marks the cursor, labeled with its local time in each city, so you can read off "7pm here is Xpm there" at a glance
- The current time keeps updating while the command is open; Reset to Now returns the cursor to it in both views
- Each city shows its current local time, its GMT offset and its difference from the base city, with sunrise/sunset on the right
- The date and the color legend are drawn in the timeline itself, replacing the sidebar
- City search ranks cities whose own name matches the query first (then by population), so "New York" finds New York City instead of burying it under other cities in New York state
- Move Up / Move Down, Copy Base ISO and Reset to Now (now ⌘R) use Raycast's standard shortcuts

## [City Ordering] - 2026-09-08

- Cities are now sorted by GMT offset by default (west → east), in both the list and timeline views
- Added a "City Order" preference: GMT Offset (West → East), GMT Offset (East → West), or Custom
- With Custom order, new Move Up / Move Down actions (⌘⇧↑ / ⌘⇧↓) let you arrange cities manually

## [System Time Format] - 2026-08-31

- Respect the system 12/24-hour format, with preferences to override it

## [Initial Version] - 2026-04-08

- Initial release
- Timeline view with color-coded working hours
- City search to add any city worldwide
- Time scrubbing with arrow keys (±1 hour, ±30 minutes)
- Sunrise/sunset times for each city
- Set any city as your base timezone
