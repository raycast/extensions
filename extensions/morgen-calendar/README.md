# Morgen Calendar for Raycast

Create and manage calendar events and native Morgen tasks from Raycast on Windows.

## Setup

1. Connect your calendars in the [Morgen app or platform](https://platform.morgen.so/).
2. Copy an API key from [Morgen Developers API](https://platform.morgen.so/developers-api). API access depends on your Morgen plan.
3. Enter the key in this extension's **Morgen API Key** preference. Raycast stores password preferences in its encrypted local database.

## Commands

| Command | What it does |
| --- | --- |
| Create Event | Add a timed or all-day event to a writable connected calendar. |
| View Events | Search events for the next 7, 14, or 30 days, inspect details, edit title/description, or delete an event. |
| Create Task | Add a native Morgen task with optional due date, estimated time, and priority. |
| View Tasks | Search up to 100 open native tasks, inspect, edit, complete, or delete them. |

The task API currently covers **Morgen native tasks**. It does not expose tasks from external task providers connected to Morgen. Creating a task with a due date does not schedule it into a calendar time block. Events marked as scheduled tasks in Morgen are omitted from View Events to avoid confusing them with ordinary meetings.

Morgen's API is in early access. `/list` requests cost 10 points, so this extension caches list results for one minute and calendars for five minutes. Use **Refresh** to bypass the cache. The API limit is 300 points per 15 minutes per user.

## Development

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run lint
npm run build
npm run bundle
```

This extension uses the Morgen REST API and no native macOS APIs. It declares Windows as its supported platform.

## Compatibility

Requires Raycast v2.5 or later on Windows. The API dependency is pinned to the released version `2.5.2`, which was verified with the Windows client. View Events shows edit and delete actions only when the calendar permits modifying that event.

## References

- [Morgen API documentation](https://docs.morgen.so/)
- [Raycast extension documentation](https://developers.raycast.com/)
- [Raycast Store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store)
