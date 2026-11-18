# Universal Inbox API Integration

## Auth

Every request: `Authorization: Bearer ${preferences.apiKey}` header.

Preferences via `getPreferenceValues<UniversalInboxPreferences>()`.

## Base URL

Always strip trailing slash:
```ts
const baseUrl = preferences.universalInboxBaseUrl.replace(/\/$/, "");
```

## Endpoints

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| GET | `/api/notifications?status=Unread,Read&with_tasks=true` | — | List notifications |
| GET | `/api/notifications?...&notification_kind=Github` | — | Filtered list |
| PATCH | `/api/notifications/:id` | `{ status: NotificationStatus }` | Change status |
| PATCH | `/api/notifications/:id` | `{ snoozed_until: Date }` | Snooze |
| PATCH | `/api/tasks/:id` | `{ status: TaskStatus }` | Change task status |

## Error Handling

All mutating calls go through `handleErrors()`:

```ts
import { handleErrors } from "../api";
import fetch from "node-fetch";

await mutate(
  handleErrors(fetch(url, options)),
  { optimisticUpdate }
);
```

`handleErrors` throws `Error` with the API's `message` field on 400/401/500.

## Optimistic Updates

Always include `optimisticUpdate` to avoid UI lag:

```ts
{
  optimisticUpdate(page) {
    if (page) {
      page.content = page.content.filter((n) => n.id !== notification.id);
    }
    return page;
  },
}
```

## Snooze Time Computation

Snooze logic from `src/action/NotificationActions.tsx`:

```ts
function computeSnoozedUntil(fromDate: Date, daysOffset: number, resetHour: number): Date {
  const result = dayjs(fromDate)
    .utc()
    .add(fromDate.getHours() < resetHour ? daysOffset - 1 : daysOffset, "day");
  return result.hour(resetHour).minute(0).second(0).millisecond(0).toDate();
}
// Usage: computeSnoozedUntil(new Date(), 1, 6) → next day at 06:00 UTC
```

## Todoist Special Case

Todoist notifications are backed by tasks. Deleting requires PATCH on the task:

```ts
if (isNotificationBuiltFromTask(notification) && notification.task) {
  // PATCH /api/tasks/:id with { status: TaskStatus.Deleted }
} else {
  // PATCH /api/notifications/:id with { status: NotificationStatus.Deleted }
}
```

`isNotificationBuiltFromTask()` checks `notification.kind === NotificationSourceKind.Todoist`.
