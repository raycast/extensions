# Existing AI tools

Read the complete manifest and all 8 files in `src/tools/` before writing the skill. Optional inputs carry `?`. These are the registered inputs, not additional tools.

| Tool | Inputs |
| --- | --- |
| [create-reminder](../../src/tools/create-reminder.ts) | `title: string`; `notes?: string`; `dueDate?: string`; `priority?: "low" \| "medium" \| "high"`; `tags?: string`; `listId?: string`; `address?: string`; `proximity?: "enter" \| "leave"`; `radius?: number`; `url?: string`; `recurrence?: { frequency: Frequency; interval: number; endDate?: string; }` |
| [get-lists](../../src/tools/get-lists.ts) | None |
| [get-reminders](../../src/tools/get-reminders.ts) | None |
| [update-reminder](../../src/tools/update-reminder.ts) | `reminderId: string`; `title?: string`; `notes?: string`; `dueDate?: string`; `priority?: "high" \| "medium" \| "low"`; `tags?: string`; `isCompleted?: boolean`; `url?: string`; `recurrence?: { frequency: Frequency; interval: number; endDate?: string; }` |
| [delete-reminder](../../src/tools/delete-reminder.ts) | `id: string`; `confirmation: { title: string; notes?: string; list?: { id: string; title: string; color: string }; dueDate?: string; priority?: "high" \| "medium" \| "low"; isRecurring?: string; recurrenceRule?: string; }` |
| [get-locations](../../src/tools/get-locations.ts) | None |
| [create-location](../../src/tools/create-location.ts) | `id: string`; `name: string`; `icon: "home" \| "work" \| "gym" \| "store" \| "school" \| "other"`; `address: string`; `proximity: "enter" \| "leave"`; `radius: string` |
| [get-completed-reminders](../../src/tools/get-completed-reminders.ts) | `listId?: string` |

## Behavior and limits

- `Frequency` resolves to `"daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly"`. Recurrence requires frequency and a positive interval; endDate is optional.
- The Swift `getData` fetches incomplete reminders, takes the first 1,000, and returns all visible lists. `get-reminders` exposes only the reminder array. `get-completed-reminders` takes the first 1,000 completed entries, optionally within a list. Neither exposes pagination or time filters.
- Create returns a reminder with ID and openUrl. Update returns no value from Swift, so a successful response is not a returned reminder. Verify with the appropriate incomplete/completed reader.
- `get-locations` returns the stored JSON string or nothing. `create-location` appends to that list without ID deduplication; radius is a string there and a number on create-reminder.
- New title-only reminders must omit unspecified date, priority, and recurrence fields. Date-only and timed deadlines differ. Updating notes replaces text; updating tags can remove an existing final hashtag line. Preserve unrelated material.
- No tools read Apple Notes, create calendars/lists, assign people, move reminders between lists, update location alarms, or inspect calendar availability. Native commands and unregistered Swift helpers do not expand the tool inputs.
