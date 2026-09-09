# CodexRunway Reset Tracker

A Raycast extension that reads the public, unauthenticated CodexRunway API
(`https://www.codexrunway.com/openapi/v1`) and shows the latest usage-reset
schedule/completion status.

It ships three commands:

- **Reset Status (Menu Bar)** — lives in your macOS menu bar, shows a short
  status (e.g. "Reset today" / "No reset confirmed") and
  auto-refreshes every 10 minutes. Click it for details and a manual
  refresh / "open source post" action, plus shortcuts to details and history.
- **View Latest Reset** — shows the most recent confirmed reset today, or
  the latest announcement when none is found, with metadata, original text,
  and an action to copy the raw JSON.
- **Browse Reset History** — a paginated, filterable (all / scheduled /
  completed) list of past records grouped by local event date. Search matches the
  loaded records’ type, plans, usage windows, and announcement text. Scroll to
  load more, or use Actions (⌘↓), refresh (⌘R), or clear filters.

## Notes on the API

- `GET /records?kind=all|reset_scheduled|reset_completed&page=1&pageSize=10`
  (`pageSize` max 10)
- No auth header needed; rate limit is 20 requests/hour with
  `X-RateLimit-*` response headers and a `429` + `Retry-After` when
  exceeded. The menu bar command therefore refreshes every 10 minutes, and
  each run makes a single request that serves both the latest record and
  the "did it reset today?" check.

## Status and freshness

- Today's status is based on the latest 10 records, not the entire history.
  "No reset confirmed" means no matching completion was found in that page.
- Future scheduled times never count as completed resets. A recorded completion
  time takes precedence over the planned effective time.
- Dates include the local timezone. Details show the data source's last successful
  check time; this is separate from when the extension fetched the response.
- Loading, empty responses, and failed updates have separate states. Previously
  fetched data is marked when a refresh fails.

## Development

Run `npm test` for deterministic status and response checks, `npm run lint` for
linting, and `npm run build` to compile the extension into Raycast's local directory.

Requests share a two-minute cache and a rolling 20-request/hour budget across
commands. Manual refresh respects that cache. A 429 pauses all requests until
`Retry-After` (seconds or an HTTP date); exhausted server quota also respects
`X-RateLimit-Reset`. During a pause or network failure, cached records remain
visible with a warning and retry time. Requests time out after 15 seconds.

## Preferences and upcoming resets

Choose **Subscription Plan** in extension preferences to scope today's status
and the next plan to your subscription. Records marked `all` match every plan;
unknown scope is only included with All Plans. The menu bar's command preferences
include **Show icon only**.

The next-plan summary selects the earliest future or active scheduled window in
the latest 10 records. If only an elapsed, unfulfilled plan is available, it stays
visible as awaiting confirmation. Cancelled and fulfilled plans are excluded.
All displayed times are estimates from the source, not a completion guarantee.

History uses Raycast's native continuous pagination. Search and the **Plan**
action filter only loaded records; loading more extends the searchable set.
Changing the record kind restarts pagination. Each command launch initially
restores the first page, and duplicate record IDs across pages are collapsed.
A failed update or cooldown stops automatic loading and keeps loaded pages visible;
use **Retry Failed Page** to retry that page, or Refresh to restart from page one.

## Completion notifications

Enable **Notify when a new reset is confirmed** in the menu bar command's
preferences and keep background refresh enabled. Notifications are off by
default. Only background runs evaluate notifications; the first successful
background check (and the first after changing plans or enabling reminders)
establishes a quiet baseline. Later checks notify newly observed completions
whose completion time is at or after that baseline, including across midnight.
For completed records without an execution timestamp, the completion announcement
time is used and explicitly labeled Announced in the notification.
Linked scheduled/completed records generate a single notification.

Notifications use macOS Notification Center through AppleScript, with no extra
dependency. macOS notification permissions and Focus settings control whether
a banner appears; successful delivery to the OS does not guarantee a visible
banner. The plugin does not change these settings. Notification errors appear
in the menu and are retried on the next successful background check.

Search matches every whitespace-separated word across full announcement text,
status, plan, and usage window, ignoring case. While a search or plan filter is
active, automatic pagination pauses; **Load More Records** remains available.
History groups are ordered by event date across pages.
