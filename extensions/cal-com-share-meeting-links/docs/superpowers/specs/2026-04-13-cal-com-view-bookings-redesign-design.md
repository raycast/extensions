# Cal.com — View Bookings redesign

Date: 2026-04-13
Status: Draft (awaiting user review)
Target PR: same branch as `out-of-office`, follows after that work

## Goal

Fix the View Bookings command so it reliably shows the user's complete, current set of bookings — not just the first 100 in the API's default order. Add structure (sections) and lazy loading so the experience scales:

- **Pending Confirmation** at the top — bookings the user must accept/decline before they can happen
- **Upcoming** — confirmed bookings, soonest first
- **Past** — completed bookings, most recent first, lazy-loaded as the user scrolls
- **Cancelled** — hidden by default, revealed via `Cmd+H`

## The current bug

`useBookings()` calls `GET /v2/bookings` with no query parameters. The Cal.com v2 API defaults to `take=100, skip=0` and returns results in some internal order (effectively oldest-first based on the user's symptom). The current code then sorts the *fetched* 100 client-side by start descending.

Effect: a user with > 100 lifetime bookings only ever sees their oldest 100. New bookings, including all upcoming ones, never appear.

## API plan

| Section | Endpoint params | Pagination |
|---|---|---|
| Pending Confirmation | `status=unconfirmed&sortStart=asc&take=100` | None (small set) |
| Upcoming | `status=upcoming&sortStart=asc&take=100` | None initially; promote to paginated in a follow-up if real users exceed 100 |
| Past | `status=past&sortStart=desc&take=50` | Yes — drives `<List pagination={...}>`; fetches additional pages on scroll via `skip=page*50` |
| Cancelled | `status=cancelled&sortStart=desc&take=50` | None — single-shot fetch when the section is toggled on |

All requests use the existing `cal-api-version: 2026-02-25` header (no change).

## User-facing shape

### Top-level list

A single `<List>` with three or four sections plus the existing detail pane and search bar.

```
View Bookings
│
├── (search bar — existing Raycast behavior, unchanged)
│
├── List.Section "Pending Confirmation"     [hidden when 0]
│     icon: yellow Clock
│     title: existing booking title
│     accessories: existing (date, attendees, video/in-person)
│     actions: Accept · Decline · Open Booking · Cancel · Show/Hide Details · Show/Hide Cancelled
│
├── List.Section "Upcoming"                  [hidden when 0]
│     icon: green CheckCircle
│     title: existing booking title
│     accessories: existing
│     actions: Open Video · Open Booking · Cancel · Show/Hide Details · Show/Hide Cancelled
│
├── List.Section "Past"                       [drives pagination]
│     icon: gray Circle
│     title: existing booking title
│     accessories: existing
│     actions: Open Booking · Show/Hide Details · Show/Hide Cancelled
│
└── List.Section "Cancelled"                 [hidden until ⌘ H toggles on]
      icon: red XMarkCircle
      title: existing booking title
      accessories: existing
      actions: Open Booking · Show/Hide Details · Show/Hide Cancelled
```

The detail pane already exists and continues to work; toggle stays on `Cmd+D` (no change).

### New shortcut

| Shortcut | Action |
|---|---|
| `Cmd+H` | Show / Hide Cancelled section (persisted via `useCachedState`) |

Existing shortcuts (`Cmd+D` for details, `Cmd+V` for video, `Cmd+S` for status update, `Cmd+C` for cancel, `Cmd+B` for browser) are preserved.

### Empty state

If all four sections are empty (no bookings at all):

- `List.EmptyView` titled "No bookings found"
- Description: "Bookings will appear here once people book a meeting with you."
- Action to "Open Cal.com in Browser" (https://app.cal.com/bookings/upcoming)

If only specific sections are empty, those sections are simply hidden — the others render normally.

## Data model & API additions

### Endpoints

No new types needed. `CalBooking` already covers what we need. Add four new hooks in `src/api/cal.com.ts`:

```ts
const BOOKINGS_API_VERSION = "2026-02-25";

// Hoisted fetchers — share useCachedPromise's cache namespace across components.
async function fetchPendingBookings(): Promise<CalBooking[]> { ... }
async function fetchUpcomingBookings(): Promise<CalBooking[]> { ... }
async function fetchCancelledBookings(): Promise<CalBooking[]> { ... }

// Past is paginated. Returns the page-aware shape Raycast's pagination expects.
async function fetchPastBookingsPage({ page }: { page: number }): Promise<{
  data: CalBooking[];
  hasMore: boolean;
}> { ... }

export function usePendingBookings(): ReturnType<typeof useCachedPromise<typeof fetchPendingBookings>>;
export function useUpcomingBookings(): ReturnType<typeof useCachedPromise<typeof fetchUpcomingBookings>>;
export function useCancelledBookings(execute?: boolean): ReturnType<typeof useCachedPromise<typeof fetchCancelledBookings>>;
export function usePastBookings(): ReturnType<typeof useCachedPromise<typeof fetchPastBookingsPage>>;
```

The existing `useBookings()` hook is **deleted** — no callers remain after this PR. (Mutation functions `confirmBooking`, `declineBooking`, `cancelBooking` are unchanged and continue to work.)

The `useCancelledBookings(execute)` hook accepts an `execute` flag so we can avoid fetching cancelled bookings unless the toggle is on. `useCachedPromise` has an `execute` option that skips the initial fetch.

### Pagination shape

Cal.com's API uses `take` + `skip`. The fetcher takes Raycast's `{ page }` and translates:

```ts
async function fetchPastBookingsPage({ page }: { page: number }): Promise<{ data: CalBooking[]; hasMore: boolean; }> {
  const take = 50;
  const skip = page * take;
  const data = await calAPI<CalBooking[]>({
    url: "/bookings",
    headers: { "cal-api-version": BOOKINGS_API_VERSION },
    params: { status: "past", sortStart: "desc", take, skip },
  });
  return { data, hasMore: data.length === take };
}
```

`hasMore` is `true` whenever the API returns a full page; that's a slight over-fetch (when the total is an exact multiple of 50, we'll request one extra empty page) but matches the standard pagination idiom.

### Mutations and cross-section data flow

When a status change moves a booking from one section to another (e.g. Confirm moves Pending → Upcoming), naïve optimistic updates only affect the source section. The target section won't show the booking until its own cache is revalidated.

Strategy: each handler does an optimistic local update on the source section and `revalidate()`s the destination section.

```ts
// Confirm: remove from Pending, revalidate Upcoming
await pendingHook.mutate(confirmBooking(uid), {
  optimisticUpdate: (list) => list?.filter((b) => b.uid !== uid),
});
await upcomingHook.revalidate();

// Decline: remove from Pending (declined is a terminal status; Cal.com hides it from Upcoming)
await pendingHook.mutate(declineBooking(uid), {
  optimisticUpdate: (list) => list?.filter((b) => b.uid !== uid),
});

// Cancel: remove from Upcoming (or Pending), revalidate Cancelled if shown
await upcomingHook.mutate(cancelBooking(uid, reason), {
  optimisticUpdate: (list) => list?.filter((b) => b.uid !== uid),
});
if (showingCancelled) await cancelledHook.revalidate();
```

The CancelBooking component currently receives a single `mutate` for the unified bookings list; it'll be updated to receive the relevant section's mutate plus an optional revalidate callback for the cancelled section.

## Files

New:

- `src/lib/bookings.ts` — pure helpers: `iconForBookingStatus(status)`, `subtitleForBooking(booking)`, anything else worth extracting from the current `view-bookings.tsx`. Small file; mostly a place to consolidate the existing `getIconForStatus` (currently inline in `view-bookings.tsx`).

Modified:

- `src/api/cal.com.ts` — add four hoisted fetchers + four hooks, delete `useBookings`
- `src/view-bookings.tsx` — restructure into sectioned list with pagination, add `Cmd+H` toggle, wire mutation handlers
- `src/components/cancel-booking.tsx` — accept the appropriate section's mutate + optional `onAfterCancel` callback for revalidating Cancelled
- `CHANGELOG.md` — entry describing the redesign and the bug fix
- `README.md` — no change (View Bookings is already mentioned)

## Error handling

Same patterns as the rest of the extension:

- API errors → `showFailureToast(error, { title: "..." })`
- Mutation rollback on failure (built into `useCachedPromise`'s mutate)
- Top-level error from any of the four hooks → existing `List.EmptyView` "Check your API key" + Open Preferences action
  - If only one section's hook errors, that section is hidden but the others still render — show a small toast on first failure rather than blocking the whole view

## Testing

No test framework in the repo (consistent with prior PRs). Verification:

- `npx tsc --noEmit && npx ray lint && npx ray build -e dist` all clean
- Manual QA against a real Cal.com account with > 100 lifetime bookings:
  1. Confirm all three default sections appear with correct contents
  2. Scroll the Past section — confirm older entries lazy-load
  3. Toggle `Cmd+H` — confirm Cancelled appears/disappears, with persistence across command relaunches
  4. Accept a Pending booking — confirm it leaves Pending and appears in Upcoming
  5. Cancel an Upcoming booking — confirm it leaves Upcoming; if Cancelled is shown, confirm it appears there
  6. Verify search across all currently-loaded items still works (Raycast's built-in filter)

## Open questions to verify in implementation

1. Does Cal.com's `status=cancelled` filter return only cancelled, or also declined? (May need a client-side filter.)
2. Is there a maximum `take` value in the v2 API? (If yes and < 100, we may need to lower the eager page size.)
3. Does Raycast's `pagination` prop interact correctly with multiple sections in the same List, where only one section drives pagination? (Strongly expected to work based on Raycast's API surface — verify in implementation.)
4. After `confirmBooking`, does Cal.com return the updated booking with `status=upcoming` immediately, or is there propagation lag that would make the revalidate-Upcoming step show stale data briefly?

Resolutions captured in the PR description.
