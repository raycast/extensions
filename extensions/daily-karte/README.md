# Daily Karte

Daily Karte is an activity-card journal that syncs with the [Daily Karte Web app](https://dailykarte.web.app).

- **Record Activity** lets you record completed activities from a searchable gallery and create or edit your activity cards.
- **Today** shows your timeline and activity totals, and lets you edit saved records.
- **This Week** displays the current Monday through Sunday as a full-width activity calendar.

## Sign in

You need a Google account. Open any command and continue with Google, using the same account as the Web app to access your existing cards and records. You do not need to enter Firebase project IDs or OAuth client IDs.

Raycast manages your Google authorization. You can sign out through Raycast's OAuth settings.

## Record activities

Each gallery tile shows an activity's icon, name, and default duration. Select a tile and press Return to adjust the ending time, duration, and optional note before saving. A blank duration records the activity without a time estimate. Ending times cannot be in the future.

You can create cards with a name, built-in icon or custom emoji, color, and optional default duration. Card changes apply to future recordings. Existing records retain their historical names and appearance.

Compatible neighboring records merge using the same five-minute rule as the Web app. A stale editor refuses to overwrite a record changed on another device.

If a save response is lost, retrying an unchanged form confirms the previously submitted result, including merged neighbors. Changing the form values starts a new save attempt. In an empty gallery, Return creates your first card.

## Review your day and week

Today switches between Timeline and By Activity and remembers your last selection. It shows the current local day's record count and estimated duration total. Select a timeline record to edit its ending time, duration, or note.

This Week shows colored half-hour activity blocks. Today's column is highlighted. Dots mark untimed records, and a plus marks overlapping activities. You can use the Web app to review earlier weeks.

Both clients use your machine's local timezone. Daily totals count records by their ending date, while calendar blocks show the time they overlap. Durations are estimates and may overlap.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Return | You record the selected activity, edit the selected timeline record, or refresh This Week. |
| Command-N | You create an activity card in Record Activity. |
| Command-E | You edit the selected activity card in Record Activity. |
| Command-P | You switch Today's view. |
| Command-R | You refresh Record Activity or Today. |

## Data and connectivity

The extension reads and writes your account's cards and records through the Daily Karte Firebase service. It requires an internet connection and does not provide offline writes or a persistent activity cache. Raycast retains authorization and the selected Today view, while loaded activity data remains in the running command's memory.

## License

The extension's platform code uses MIT. Its `daily-karte` npm dependency retains PolyForm Noncommercial 1.0.0, and those terms apply to the shared core. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) contains the required notice and preserved dependency license.
