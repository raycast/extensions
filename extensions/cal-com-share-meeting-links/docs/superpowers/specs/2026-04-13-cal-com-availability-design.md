# Cal.com — Availability Schedule Management (Raycast command)

Date: 2026-04-13
Status: Draft (awaiting user review)
Target PR: follows `fix/cal-com-migrate-to-api-v2`

## Goal

Add a new `View Availability` command to the Cal.com Raycast extension that lets users:

- List all of their Cal.com availability schedules
- View each schedule's working hours, date overrides, timezone, and default status at a glance
- Edit working hours (per day), timezone, and schedule name
- Add, edit, and delete date overrides
- Set any schedule as the default

Out of scope for this PR:

- Creating new schedules
- Deleting schedules
- Team/organization schedules (personal schedules only)

## User-facing shape

### Commands

One new `view` command, `view-availability`, registered in `package.json`:

```json
{
  "name": "view-availability",
  "title": "View Availability",
  "subtitle": "Cal.com",
  "description": "View and manage your Cal.com availability schedules",
  "mode": "view"
}
```

### Navigation

```
View Availability (top-level List)
│
├── One row per schedule
│   Title:      schedule name (e.g., "Working Hours")
│   Accessories: timezone · "Default" tag (if default)
│   Enter action: push Schedule Detail List
│   Other actions: Set as Default (if not), Open in Browser
│
└── Schedule Detail List (pushed from row)
    │
    ├── Section "Working Hours"
    │     One row per day of the week (Mon–Sun)
    │     Title:       day name
    │     Accessory:   ranges joined (e.g., "09:00–12:00, 13:00–17:00") or "Unavailable"
    │     Actions:
    │       - Edit Hours   → push Edit Day Hours form
    │       - Clear Day    → PATCH schedule removing all ranges for that day
    │
    ├── Section "Date Overrides" (sorted by date ascending)
    │     One row per override
    │     Title:       formatted date ("May 15, 2026")
    │     Accessory:   time range or "Unavailable"
    │     Actions:
    │       - Edit Override   → push Edit Override form
    │       - Delete Override → PATCH schedule removing that override
    │     List-level action:
    │       - Add Override    → push Add Override form
    │
    └── Section "Settings"
          Rows:
            - Timezone  (title: "Timezone", accessory: current zone)
                Action: Edit Timezone → push Edit Timezone form
            - Default   (title: "Default schedule", accessory: "Yes" / "No")
                Action: Set as Default (only when not default)
            - Name      (title: "Name", accessory: current name)
                Action: Rename → push Rename form
```

Each schedule row on the top-level list also toggles a detail pane (⌘D) that mirrors the pushed view's content in `List.Item.Detail` metadata form, so a quick glance works without drilling in. This matches the `View Bookings` pattern.

### Forms

All edits are Raycast `Form` views, submitted via an action. All submissions PATCH `/v2/schedules/{id}` with the full schedule payload (see "Edit model" below).

**Edit Day Hours form**
- Day name (header / read-only label)
- Up to three time ranges: three pairs of `Form.Dropdown` (start, end) with 15-minute slots from 00:00 through 23:45 plus a blank option
  - Empty range pairs are omitted on save
  - Validation: for each non-empty pair, `end > start`; no two non-empty ranges on the same day may overlap
- Submit → PATCH schedule

Rationale for capped ranges: Raycast `Form` does not support dynamic field lists. Three ranges covers the overwhelming majority of real schedules (morning, afternoon, evening); if a user needs more they can use the web UI. This is noted in the form description.

**Add Override / Edit Override form**
- `Form.DatePicker` (date only)
- "Unavailable" `Form.Checkbox` — when checked, start/end hidden/ignored
- Start / end `Form.Dropdown` with 15-minute slots (when not unavailable)
- Submit → PATCH schedule with overrides array updated
- "Unavailable" representation: since the v2 API requires `startTime` and `endTime` on every override entry, an unavailable day is encoded as `startTime === endTime` (e.g., "00:00"–"00:00"). Decision to verify during implementation — if the API rejects this, fall back to omitting that date's override and treating absence as unavailable (which contradicts existing working hours; we'd need to document the limitation).

**Edit Timezone form**
- `Form.Dropdown` listing IANA zones (from `Intl.supportedValuesOf('timeZone')`), pre-selected to the schedule's current zone
- Submit → PATCH schedule with `timeZone`

**Rename form**
- `Form.TextField` for name, pre-filled
- Submit → PATCH schedule with `name`

## Data model & API

### Types (added to `src/api/cal.com.ts`)

```ts
export type CalWeekday =
  | "Monday" | "Tuesday" | "Wednesday" | "Thursday"
  | "Friday" | "Saturday" | "Sunday";

export interface CalScheduleAvailability {
  days: CalWeekday[];
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface CalScheduleOverride {
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
}

export interface CalSchedule {
  id: number;
  ownerId: number;
  name: string;
  timeZone: string;
  isDefault: boolean;
  availability: CalScheduleAvailability[];
  overrides: CalScheduleOverride[];
}
```

### Hooks and actions (added to `src/api/cal.com.ts`)

```ts
// Returns the shape produced by @raycast/utils' useCachedPromise (data, isLoading, error, mutate),
// matching the pattern already used by useEventTypes and useBookings in this file.
export function useSchedules(): ReturnType<typeof useCachedPromise<() => Promise<CalSchedule[]>>>;

export function updateSchedule(
  id: number,
  patch: Partial<Pick<CalSchedule, "name" | "timeZone" | "isDefault" | "availability" | "overrides">>,
  signal?: AbortSignal,
): Promise<CalSchedule>;
```

All requests send `cal-api-version: 2024-06-11` (per Cal.com v2 schedules docs).

### Endpoints

| Operation        | Method | Path                    | Header               |
|------------------|--------|-------------------------|----------------------|
| List schedules   | GET    | `/v2/schedules`         | `2024-06-11`         |
| Update schedule  | PATCH  | `/v2/schedules/{id}`    | `2024-06-11`         |

"Set as Default" is implemented as `updateSchedule(id, { isDefault: true })`. Whether Cal.com automatically demotes the prior default when another is set to `isDefault: true` is to be confirmed in implementation; if not, we also call `updateSchedule(prevDefaultId, { isDefault: false })` in sequence after identifying the prior default from the cached list. The UI will use optimistic updates so the toggle feels instant either way.

"Clear Day" and "Delete Override" are implemented as PATCHes that rewrite the `availability` / `overrides` arrays, omitting the target entry.

### Edit model

Every mutation recomputes the full `availability` and/or `overrides` array client-side and sends it via PATCH. This avoids any diffing or partial-update surprises and keeps the mutation surface tiny.

Example — editing Tuesday's hours:

1. Start from the cached `schedule.availability`.
2. Remove every entry that lists Tuesday in its `days`, and for any entry that had Tuesday alongside other days, split it (keep the original for the remaining days without Tuesday).
3. For each non-empty range in the form, append a new entry `{ days: ["Tuesday"], startTime, endTime }`.
4. PATCH with the resulting array.

This produces a potentially denormalized `availability` array (same hours for multiple days stored as separate entries) but is simple, round-trip-safe, and matches how Cal.com's own v2 API returns data. No attempt is made to re-coalesce entries.

## Files

New:

- `src/view-availability.tsx` — top-level schedules list, detail pane
- `src/components/schedule-detail.tsx` — pushed sectioned list (per schedule)
- `src/components/edit-day-hours.tsx` — form
- `src/components/edit-override.tsx` — form (handles both add and edit)
- `src/components/edit-timezone.tsx` — form
- `src/components/rename-schedule.tsx` — form
- `src/lib/schedule.ts` — pure helpers: `rangesForDay(schedule, day)`, `withDayHoursReplaced(schedule, day, ranges)`, `withOverrideUpserted(schedule, override)`, `withOverrideRemoved(schedule, date)`, `formatRange(range)`, `TIME_SLOTS` constant (00:00–23:45, 15-min step)

Modified:

- `package.json` — register the new command
- `src/api/cal.com.ts` — add types, `useSchedules`, `updateSchedule`
- `CHANGELOG.md` — add an entry for the new command
- `README.md` — mention availability management

## Error handling

- API errors surface via `showFailureToast`, matching existing patterns in `view-bookings.tsx` and `index.tsx`
- All mutations use optimistic updates via `useCachedPromise`'s `mutate` with rollback on failure, matching `view-bookings.tsx` (`handleConfirmAndMutate`, etc.)
- Load failures show the same `List.EmptyView` with "Check your API key" fallback and an "Open Preferences" action, matching existing commands

## Testing

The extension has no existing test suite. We'll rely on:

- Manual testing against a real Cal.com account (multiple schedules, overrides, multiple ranges per day, timezone changes, default toggle)
- `ray lint` must pass
- `ray build -e dist` must succeed

Unit tests for the pure helpers in `src/lib/schedule.ts` would be valuable but introducing a test framework is out of scope for this PR (no precedent in the repo). The helpers are written to be pure and easily testable later.

## Open questions / decisions to verify in implementation

1. Does PATCH with `isDefault: true` auto-demote the current default, or do we need a two-step update? (Verify against the live API; adjust "Set as Default" flow accordingly.)
2. Does the API accept `startTime === endTime` as a zero-length override (our encoding of "unavailable")? (Fallback: document the limitation and disallow the "Unavailable" checkbox.)
3. Are there any hidden schedules or schedule types returned by `GET /v2/schedules` we should filter out (e.g., org/platform schedules)? (Inspect response during implementation.)

Resolutions will be captured in the implementation PR description, not this spec.
