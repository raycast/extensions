# Cal.com — Out of Office (Raycast command)

Date: 2026-04-13
Status: Draft (awaiting user review)
Target PR: follows `feat/cal-com-availability-management`

## Goal

Add a new `Out of Office` command to the Cal.com Raycast extension that lets users:

- See their current and upcoming OOO entries at a glance
- Create a new OOO entry (date range, reason, notes, optional redirect to a teammate)
- Edit an upcoming OOO entry
- Delete an OOO entry
- Jump to the cal.com web UI for OOO settings or general account settings (escape hatch for features without an API, e.g. scheduled timezone change)

Out of scope for this PR:

- Past OOO entries (only current + upcoming shown; can be added later behind a "Show Past" toggle)
- Scheduled timezone change — Cal.com v2 does not expose an API for this. Replaced with an "Open Account Settings in Browser" action.
- Org/team-admin OOO management (managing other users' OOO)

## User-facing shape

### Commands

One new `view` command, registered in `package.json`:

```json
{
  "name": "out-of-office",
  "title": "Out of Office",
  "subtitle": "Cal.com",
  "description": "View and manage your Cal.com out-of-office entries",
  "mode": "view"
}
```

### Top-level list (`src/out-of-office.tsx`)

A `List` of OOO entries that fall in the future or are currently active, sorted by `start` ascending.

```
Out of Office
│
├── Empty state (no upcoming OOO)
│     icon: Calendar (muted)
│     title: "No upcoming time off"
│     description: "Press ⌘ N to schedule one."
│     actions: Create OOO
│
├── List.Item per entry
│     icon:        derived from reason (vacation → Sun, travel → Airplane,
│                  sick → Bandage, public_holiday → Star, unspecified → Calendar)
│     title:       date range, e.g. "May 1 – 7, 2026" (single-day collapses to "May 1, 2026")
│     subtitle:    weekday range, e.g. "Friday – Thursday"
│     accessories:
│       - if redirected: { icon: avatar of toUser, text: toUser.name } (subtle)
│       - if notes:      { icon: SpeechBubble, tooltip: "Has notes" }
│       - if currently active: { tag: { value: "Active", color: Color.Green } }
│
│   Detail pane (toggleable, ⌘D, default on like ViewAvailability):
│     - Reason
│     - Date range (formatted in user's locale)
│     - Day count (e.g. "7 days")
│     - Notes (full text)
│     - Redirect target (avatar + name + email)
│     - Created at / Updated at
│
│   Per-row actions (in this order so Cmd+Enter binds correctly):
│     1. Enter         → Push Edit OOO form
│     2. ⌘ ↵           → Open OOO Settings in Browser (https://app.cal.com/settings/my-account/out-of-office)
│     3. ⌘ D           → Show / Hide Details
│     4. ⌘ N           → Create OOO (push form)
│     5. ⌘ ⇧ A         → Open Account Settings in Browser (https://app.cal.com/settings/my-account/general)
│     6. Ctrl X        → Delete OOO (with confirmAlert; destructive, no Cmd+Enter accident)
│
└── Top-level search bar: filters by reason / notes / redirect-name keywords
```

### Edit form (`src/components/edit-ooo.tsx`)

Used for both create and edit. Submitted via `Action.SubmitForm`. After save, `pop()`s back.

```
Edit OOO  /  New OOO
│
├── Form.DatePicker  "Start"        type=Date         (required)
├── Form.DatePicker  "End"          type=Date         (required, must be >= Start)
├── Form.Dropdown    "Reason"       enum (Unspecified | Vacation | Travel | Sick | Public Holiday)
│                                   default: "Unspecified"
├── Form.Dropdown    "Redirect to"  team members + "(none)" first option
│                                   each item: avatar icon + display name + email keywords
│                                   default: "(none)"
└── Form.TextArea    "Notes"        free text, optional
```

Cross-field validation (in `apply`, not `useForm.validation`, matching existing pattern):

- End must be on or after Start
- If End < Start, show a `Toast.Style.Failure` and abort

Date model: pick local-calendar dates with `Form.DatePicker` (Type.Date). Convert to UTC midnight for `start` and end-of-day UTC for `end` when submitting (per Cal.com's ISO datetime format). The exact end-of-day convention (`23:59:59.999` vs `00:00:00` of the following day) will be verified during implementation against a test create.

## Data model & API

### Types (added to `src/api/cal.com.ts`)

```ts
export type CalOOOReason = "unspecified" | "vacation" | "travel" | "sick" | "public_holiday";

export interface CalOOOEntry {
  id: number;
  uuid: string;
  userId: number;
  start: string;       // ISO datetime UTC
  end: string;         // ISO datetime UTC
  reason: CalOOOReason;
  notes: string | null;
  toUserId: number | null;
  // Server-enriched fields, present in GET responses:
  toUser?: { id: number; name: string | null; username: string | null; email: string; avatarUrl: string | null } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalOOOCreate {
  start: string;
  end: string;
  reason?: CalOOOReason;
  notes?: string;
  toUserId?: number;
}

export type CalOOOPatch = Partial<CalOOOCreate>;
```

### Hooks and actions (added to `src/api/cal.com.ts`)

```ts
export function useOOOEntries(): ReturnType<typeof useCachedPromise<() => Promise<CalOOOEntry[]>>>;
export function createOOO(input: CalOOOCreate, signal?: AbortSignal): Promise<CalOOOEntry>;
export function updateOOO(id: number, patch: CalOOOPatch, signal?: AbortSignal): Promise<CalOOOEntry>;
export function deleteOOO(id: number, signal?: AbortSignal): Promise<void>;
```

The fetch function for `useOOOEntries` is **hoisted** to a module-level constant (same pattern as `fetchSchedules` after the cache-propagation fix), so multiple component callers share one cached state.

### Endpoints

| Operation       | Method | Path                              | Header (cal-api-version) |
|-----------------|--------|-----------------------------------|---------------------------|
| List OOO        | GET    | `/v2/out-of-office`               | TBD — verify in impl     |
| Create OOO      | POST   | `/v2/out-of-office` *(or `/v2/me/ooo`)* | TBD                |
| Update OOO      | PATCH  | `/v2/out-of-office/{id}`          | TBD                       |
| Delete OOO      | DELETE | `/v2/out-of-office/{id}`          | TBD                       |

The Cal.com docs index lists `/v2/out-of-office` for the user's own entries. One sub-page (the create endpoint detail) shows the path as `/v2/me/ooo`. The implementation will probe both and use whichever the API actually accepts. The `cal-api-version` header value is similarly not pinned in the public docs and will be discovered during implementation (likely a date-based version — `2024-06-14` or later, matching the rest of the v2 surface).

### Team-member fetching (for the redirect picker)

This is the trickiest piece. The Cal.com v2 docs index lists:

- `GET /v2/teams` — list authenticated user's teams (presumed accessible to any logged-in user)
- `GET /v2/orgs/{orgId}/teams/{teamId}/memberships` — list team members, **requires `team admin` role**

A non-admin user cannot list their own team's members via the documented endpoints. This is a real constraint.

**Plan:**

1. On the form mount, fetch `GET /v2/teams`. If the user has 0 teams, hide the "Redirect to" dropdown entirely (still allow OOO creation without redirect).
2. For each team, attempt `GET /v2/orgs/{orgId}/teams/{teamId}/memberships` (or whatever the live API exposes — verify in implementation; there may be a non-admin-friendly endpoint not in the index).
3. Aggregate, de-duplicate by `userId`, exclude the current user themselves, sort by name.
4. If the membership listing fails with 403/permission errors, gracefully degrade to **hiding the redirect dropdown** with an info note: *"Your account doesn't have permission to list team members. Use the web UI to set a redirect target."* — and surface the "Open OOO Settings in Browser" action prominently.

This degradation behavior is captured as an open question to validate against the live API during implementation.

### Avatar handling

- `Form.Dropdown.Item` accepts `icon={{ source: avatarUrl }}` for remote images.
- When `avatarUrl` is `null`, fall back to `Icon.Person`.
- Same pattern in `List.Item` accessories for the redirect-target indicator.

### Mutations and cache

All mutations follow the established optimistic-update pattern:

```ts
await mutate(createOOO(input), {
  optimisticUpdate: (entries) => entries ? sortByStart([...entries, optimisticEntry]) : entries,
});
```

For create, the optimistic entry uses a synthetic negative `id` until the server returns the real one (no UI dependence on `id` for display, only for actions — and the row gets re-rendered with the real entry once the promise resolves).

For delete, optimistic update filters the entry out of the list.

## Files

New:

- `src/out-of-office.tsx` — top-level command
- `src/components/edit-ooo.tsx` — form (handles both create and edit)
- `src/lib/ooo.ts` — pure helpers: `formatDateRange(start, end)`, `formatWeekdayRange(start, end)`, `daysBetween(start, end)`, `iconForReason(reason)`, `labelForReason(reason)`, `isCurrentlyActive(entry, now)`, `sortEntriesByStart(entries)`, `toUtcStart(date)`, `toUtcEnd(date)`

Modified:

- `package.json` — register the new command
- `src/api/cal.com.ts` — add types, hooks, mutation functions for OOO + team members
- `CHANGELOG.md` — entry for the new command
- `README.md` — mention OOO

## Error handling

- API errors surface via `showFailureToast`, matching existing patterns in `view-availability.tsx`, `view-bookings.tsx`, `index.tsx`
- Mutations use optimistic updates with rollback on failure (built into `useCachedPromise`'s `mutate`)
- Load failures show the existing `List.EmptyView` "Check your API key" + "Open Preferences" pattern
- Permission errors specifically on the team-members fetch are NOT shown as a failure toast (it's expected for many users); they trigger graceful degradation of the redirect picker

## Testing

Same approach as the previous PR — no test framework in repo. Verification via:

- `npx tsc --noEmit`
- `npx ray lint`
- `npx ray build -e dist`
- Manual QA against a real Cal.com account (single-user + team account if available)

Pure helpers in `src/lib/ooo.ts` are written to be easily unit-testable later.

## Open questions to verify in implementation

1. Exact API path for OOO endpoints — `/v2/out-of-office` vs `/v2/me/ooo` (docs are inconsistent).
2. Required `cal-api-version` header value(s).
3. End-of-day convention for the `end` field — `23:59:59.999Z` of the same day vs `00:00:00.000Z` of the next day. Test against the API.
4. Whether non-admin users can list team members via the documented memberships endpoint, or whether an undocumented friendly endpoint exists.
5. Whether `GET /v2/out-of-office` returns past entries by default and needs a filter, or only returns current/upcoming.
6. What the server response for `toUser` looks like — does it embed the user object or only return the ID? If only ID, we'll need a small `useUserById` cache to look up names/avatars for display.

Resolutions captured in the implementation PR description.
