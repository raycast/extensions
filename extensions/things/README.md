# Things

Search and manage your Things to-dos from Raycast.

## Authentication token

The extension uses the [Things URL Scheme](https://culturedcode.com/things/support/articles/2803573/) under the hood to enable certain features, such as scheduling a to-do, or moving a to-do to a project/area. For security reasons, these operations require an authentication token that you can set by following these instructions:

1. Get your authentication token in `Things → Settings → General → Enable Things URLs → Manage`.
2. Paste the token in the extension's preferences.

## Troubleshooting

If you don't see any of your to-dos in any commands, please make sure Things is installed and running before using this extension. If Things is running, you may need to grant Raycast access to Things in `System Settings > Privacy & Security > Automation > Raycast > Things`.

## Commands

### Quick Add To-do

Raycast AI is used to select the deadline, list, tags etc. If Raycast AI is not accessible or user has selected `Don't use AI`
preference, all the quickly created to-do(s) will be sent to Inbox, but the title will still be parsed for assigning deadlines
and list name followed with '#' in title (case-insensitive).

### Quick Find

Searches across all areas, projects, and to-dos by reading the Things database directly.

> **Note:** This command requires granting Raycast **Full Disk Access** in `System Settings > Privacy & Security > Full Disk Access`.

**Examples (with AI):**
* Book flights today in my Trips list -> Creates to-do with title "Book flights" classified in "today" and list "Trips".
* Add milk to my groceries list for tomorrow with Errand tag -> Creates to-do with title "Milk" classified in "tomorrow" with list "groceries" and tag "Errand".
* Buy a new car by the end of the year -> Creates to-do with title "Buy a new car" and deadline "20..-12-31".

**Examples (without AI):**
* Complete project -> Creates to-do with title "Complete project" in "Inbox".

## macOS Calendar events

Today and Upcoming display a separate **Calendar Events** section above to-dos. Event rows show the title, time (or All day), and calendar name on the right. Calendar search is supported; the Things tag dropdown filters to-dos only.

Extension preferences:

- **Show macOS calendar events in Today and Upcoming** enables the section (on by default).
- **Calendar Names** accepts comma-separated exact names, for example `Home, Lunar, Work`. Empty means all macOS calendars, including subscribed calendars. This selection is independent of the calendars selected inside Things.
- **Upcoming Calendar Days** sets the range starting tomorrow (default 30, maximum 365). Today includes events overlapping the current local day. Recurring and multi-day events are included.

On first use, allow the macOS calendar permission request. If access is denied, use the row's **Open Calendar Privacy Settings** action to allow full calendar access for Raycast, then **Refresh Calendar Events**. A permission timeout or calendar error leaves your to-dos usable. Reopen the command or use the refresh action to reload events. Event contents are read-only and are not persisted by this feature. **Open Date in Calendar** navigates Calendar to the event date.

The bridge uses Apple's [EventKit event retrieval API](https://developer.apple.com/documentation/eventkit/retrieving-events-and-reminders) and requests full access before querying. Authorization must be verified from the actual launcher: authorization obtained or denied in a development terminal does not establish the launcher's state.

Development checks: `npm test`, `npx tsc --noEmit`, and `npm run build`. Calendar permission prompts and rendering must also be tested in Raycast.
