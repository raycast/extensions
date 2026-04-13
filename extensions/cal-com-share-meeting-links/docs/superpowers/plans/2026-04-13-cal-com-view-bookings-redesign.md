# Cal.com View Bookings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where View Bookings only shows the first 100 bookings in the API's default order. Restructure the command into four sections (Pending Confirmation, Upcoming, Past, Cancelled) with lazy-loaded pagination on Past and a `Cmd+H` toggle for Cancelled.

**Architecture:** Replace the single `useBookings()` hook with four section-specific hooks, each calling `GET /v2/bookings` with the appropriate `status`/`sort`/`take` query params. Past uses Raycast's `useCachedPromise` paginated mode and drives the `<List pagination={...}>` lazy-load. The other sections eagerly fetch a single page (≤ 100 entries each). Cross-section state changes (e.g. confirm moves Pending → Upcoming) handled via optimistic source-section update + destination-section `revalidate()`.

**Tech Stack:** Raycast API (`@raycast/api`, `@raycast/utils`), TypeScript, axios, Cal.com v2 REST.

**Related spec:** `docs/superpowers/specs/2026-04-13-cal-com-view-bookings-redesign-design.md`

**Repo conventions to follow:**
- Path aliases: `@api/cal.com`, `@components/*`, `@/lib/*` (see `tsconfig.json`)
- Hoist async fetchers to module scope so `useCachedPromise`'s cache namespace is shared across callers (see `fetchSchedules`, `fetchOOOEntries`)
- Form/handler patterns: `showFailureToast` for errors, optimistic updates via `useCachedPromise`'s `mutate` (see `view-availability.tsx`)
- No test framework. Verification: `npx tsc --noEmit && npx ray lint && npx ray build -e dist` plus manual QA at the end.

---

## Task 1: Add four new bookings hooks to `src/api/cal.com.ts`

**Files:**
- Modify: `src/api/cal.com.ts`

This task adds the new hooks alongside the existing `useBookings`. Task 6 deletes `useBookings` once all callers migrate.

- [ ] **Step 1: Add the four hoisted fetchers and hooks**

In `src/api/cal.com.ts`, immediately after the existing `useBookings` function (around line 172), add:

```ts
const BOOKINGS_API_VERSION = "2026-02-25";

interface BookingsListParams {
  status: "upcoming" | "unconfirmed" | "past" | "cancelled" | "recurring";
  sortStart: "asc" | "desc";
  take: number;
  skip?: number;
}

async function fetchBookings(params: BookingsListParams): Promise<CalBooking[]> {
  return calAPI<CalBooking[]>({
    url: "/bookings",
    headers: { "cal-api-version": BOOKINGS_API_VERSION },
    params,
  });
}

async function fetchPendingBookings(): Promise<CalBooking[]> {
  return fetchBookings({ status: "unconfirmed", sortStart: "asc", take: 100 });
}

async function fetchUpcomingBookings(): Promise<CalBooking[]> {
  return fetchBookings({ status: "upcoming", sortStart: "asc", take: 100 });
}

async function fetchCancelledBookings(): Promise<CalBooking[]> {
  return fetchBookings({ status: "cancelled", sortStart: "desc", take: 50 });
}

const PAST_PAGE_SIZE = 50;

async function fetchPastBookingsPage({
  page,
}: {
  page: number;
}): Promise<{ data: CalBooking[]; hasMore: boolean }> {
  const data = await fetchBookings({
    status: "past",
    sortStart: "desc",
    take: PAST_PAGE_SIZE,
    skip: page * PAST_PAGE_SIZE,
  });
  return { data, hasMore: data.length === PAST_PAGE_SIZE };
}

export function usePendingBookings() {
  return useCachedPromise(fetchPendingBookings, [], {
    failureToastOptions: { title: "Unable to load pending bookings" },
  });
}

export function useUpcomingBookings() {
  return useCachedPromise(fetchUpcomingBookings, [], {
    failureToastOptions: { title: "Unable to load upcoming bookings" },
  });
}

/**
 * Fetches cancelled bookings. Pass `execute=false` to skip the network call
 * (used when the Cancelled section is hidden).
 */
export function useCancelledBookings(execute: boolean) {
  return useCachedPromise(fetchCancelledBookings, [], {
    execute,
    failureToastOptions: { title: "Unable to load cancelled bookings" },
  });
}

export function usePastBookings() {
  return useCachedPromise(fetchPastBookingsPage, [], {
    failureToastOptions: { title: "Unable to load past bookings" },
  });
}
```

The `params` field in `calAPI`/axios serializes to a query string automatically. Confirm by inspecting the axios docs if unsure: it accepts a record of keys → string/number values.

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

Both should exit 0. Use `npx ray lint --fix` if prettier complains.

- [ ] **Step 3: Commit**

```bash
git add src/api/cal.com.ts
git commit -m "Add section-specific bookings hooks (pending, upcoming, past, cancelled)"
```

---

## Task 2: Add `iconForBookingStatus` helper in `src/lib/bookings.ts`

**Files:**
- Create: `src/lib/bookings.ts`

Extract the existing inline `getIconForStatus` (currently at the bottom of `view-bookings.tsx`) into a reusable helper.

- [ ] **Step 1: Create the file**

Create `src/lib/bookings.ts`:

```ts
import { Color, Icon } from "@raycast/api";

/**
 * Returns the icon and tint for a booking status string returned by Cal.com's API.
 * Status values: "accepted", "rejected", "cancelled", "pending", and any unknown
 * statuses fall through to a neutral purple Circle.
 */
export function iconForBookingStatus(status: string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "accepted":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "rejected":
    case "cancelled":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Orange };
    default:
      return { source: Icon.Circle, tintColor: Color.Purple };
  }
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/bookings.ts
git commit -m "Add iconForBookingStatus helper in src/lib/bookings.ts"
```

---

## Task 3: Restructure `src/view-bookings.tsx` into sections + pagination + Cmd+H toggle

**Files:**
- Modify: `src/view-bookings.tsx` (full rewrite — use Write)

This is the largest task. The new file contains four `useCachedPromise`-backed sections, a single `<List pagination>` driven by Past, mutation handlers that revalidate destination sections, and a Cmd+H toggle for Cancelled.

- [ ] **Step 1: Overwrite `src/view-bookings.tsx`**

Use the `Write` tool to overwrite the entire file with:

```tsx
import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import {
  CalBooking,
  confirmBooking,
  declineBooking,
  formatDateTime,
  formatTime,
  usePastBookings,
  usePendingBookings,
  useUpcomingBookings,
  useCancelledBookings,
} from "@api/cal.com";
import { CancelBooking } from "@components/cancel-booking";
import { iconForBookingStatus } from "@/lib/bookings";

export default function viewBookings() {
  const pending = usePendingBookings();
  const upcoming = useUpcomingBookings();
  const past = usePastBookings();
  const [showCancelled, setShowCancelled] = useCachedState("show-cancelled", false);
  const cancelled = useCancelledBookings(showCancelled);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);

  const isLoading =
    pending.isLoading || upcoming.isLoading || past.isLoading || (showCancelled && cancelled.isLoading);

  const anyError = pending.error || upcoming.error || past.error || (showCancelled && cancelled.error);

  // ─── Mutation handlers ─────────────────────────────────────────────────
  const handleConfirm = async (item: CalBooking) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Confirming booking" });
    try {
      await pending.mutate(confirmBooking(item.uid), {
        optimisticUpdate: (list) => list?.filter((b) => b.uid !== item.uid),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Booking confirmed";
      await upcoming.revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to confirm booking" });
    }
  };

  const handleDecline = async (item: CalBooking) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Declining booking" });
    try {
      await pending.mutate(declineBooking(item.uid), {
        optimisticUpdate: (list) => list?.filter((b) => b.uid !== item.uid),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Booking declined";
      if (showCancelled) await cancelled.revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to decline booking" });
    }
  };

  const handleAfterCancel = async () => {
    if (showCancelled) await cancelled.revalidate();
  };

  // ─── Action helpers used in multiple action panels ─────────────────────
  const toggleDetailsAction = (
    <Action
      title={!isShowingDetail ? "Show Details" : "Hide Details"}
      icon={!isShowingDetail ? Icon.Eye : Icon.EyeDisabled}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => setIsShowingDetail(!isShowingDetail)}
    />
  );

  const toggleCancelledAction = (
    <Action
      title={showCancelled ? "Hide Cancelled" : "Show Cancelled"}
      icon={showCancelled ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
      onAction={() => setShowCancelled(!showCancelled)}
    />
  );

  const openAllBookingsAction = (
    <Action.OpenInBrowser
      title="Open All Bookings in Browser"
      url="https://app.cal.com/bookings/upcoming"
      shortcut={{ modifiers: ["cmd"], key: "b" }}
    />
  );

  const renderItem = (
    item: CalBooking,
    extraActions: React.ReactElement | null,
  ) => (
    <List.Item
      key={item.id}
      icon={iconForBookingStatus(item.status)}
      title={item.title}
      actions={
        <ActionPanel>
          {extraActions}
          <Action.OpenInBrowser title="Open Booking in Browser" url={`https://cal.com/booking/${item.uid}`} />
          {item.meetingUrl && (
            <Action.OpenInBrowser
              title="Open Video Call"
              url={item.meetingUrl}
              icon={Icon.Video}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          )}
          {toggleDetailsAction}
          {toggleCancelledAction}
          {openAllBookingsAction}
        </ActionPanel>
      }
      accessories={[
        ...(isShowingDetail
          ? []
          : [
              ...(item.meetingUrl
                ? [{ icon: { source: Icon.Video, tintColor: Color.Yellow }, tooltip: "Video Call" }]
                : []),
              ...(item.location
                ? [{ icon: { source: Icon.Pin, tintColor: Color.Yellow }, tooltip: "In Person" }]
                : []),
              {
                date: new Date(item.start),
                icon: { source: Icon.Calendar, tintColor: Color.Blue },
                tooltip: `${formatDateTime(item.start) + " - " + formatTime(item.end)}`,
              },
            ]),
        {
          icon: Icon.TwoPeople,
          tag: { value: String(item.attendees.length), color: Color.Magenta },
          tooltip: "Attendees",
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={item.description ? item.description : undefined}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={item.title} />
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                icon={iconForBookingStatus(item.status)}
              />
              <List.Item.Detail.Metadata.Label
                title="Start"
                text={formatDateTime(item.start)}
                icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="End"
                text={formatDateTime(item.end)}
                icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
              />
              {item.meetingUrl && (
                <List.Item.Detail.Metadata.Link title="Video Call" target={item.meetingUrl} text={"Link"} />
              )}
              {item.location && (
                <List.Item.Detail.Metadata.Label
                  title={"Location"}
                  icon={{ source: Icon.Pin, tintColor: Color.Yellow }}
                  text={item.location}
                />
              )}
              <List.Item.Detail.Metadata.Separator />
              {item.attendees.map((a, i) => (
                <List.Item.Detail.Metadata.Label
                  key={i}
                  title={`Attendee #${i + 1}`}
                  text={a.name ? `${a.name} (${a.email})` : a.email}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={formatDateTime(item.createdAt)}
                icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );

  // ─── Render ────────────────────────────────────────────────────────────
  const noItemsAtAll =
    !isLoading &&
    !anyError &&
    (pending.data?.length ?? 0) === 0 &&
    (upcoming.data?.length ?? 0) === 0 &&
    (past.data?.length ?? 0) === 0 &&
    (!showCancelled || (cancelled.data?.length ?? 0) === 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && !noItemsAtAll}
      pagination={past.pagination}
    >
      {anyError && (
        <List.EmptyView
          title="Unable to load bookings"
          description="Check your API key"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {noItemsAtAll && (
        <List.EmptyView
          title="No bookings found"
          description="Bookings will appear here once people book a meeting with you."
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              {openAllBookingsAction}
              {toggleCancelledAction}
            </ActionPanel>
          }
        />
      )}

      {(pending.data?.length ?? 0) > 0 && (
        <List.Section title="Pending Confirmation">
          {pending.data!.map((item) =>
            renderItem(
              item,
              <>
                <Action
                  title="Accept"
                  icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                  onAction={() => handleConfirm(item)}
                />
                <Action
                  title="Decline"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  onAction={() => handleDecline(item)}
                />
                <Action.Push
                  title="Cancel Booking"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  target={
                    <CancelBooking bookingUid={item.uid} mutate={pending.mutate} onAfterCancel={handleAfterCancel} />
                  }
                />
              </>,
            ),
          )}
        </List.Section>
      )}

      {(upcoming.data?.length ?? 0) > 0 && (
        <List.Section title="Upcoming">
          {upcoming.data!.map((item) =>
            renderItem(
              item,
              <Action.Push
                title="Cancel Booking"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                target={
                  <CancelBooking bookingUid={item.uid} mutate={upcoming.mutate} onAfterCancel={handleAfterCancel} />
                }
              />,
            ),
          )}
        </List.Section>
      )}

      {(past.data?.length ?? 0) > 0 && (
        <List.Section title="Past">{past.data!.map((item) => renderItem(item, null))}</List.Section>
      )}

      {showCancelled && (cancelled.data?.length ?? 0) > 0 && (
        <List.Section title="Cancelled">{cancelled.data!.map((item) => renderItem(item, null))}</List.Section>
      )}
    </List>
  );
}
```

- [ ] **Step 2: Typecheck, lint, build**

```bash
npx tsc --noEmit
npx ray lint
npx ray build -e dist
```

All three must exit 0. Use `npx ray lint --fix` for prettier-only fixes.

If `tsc` fails, the most likely cause is the `CancelBooking` component's prop signature — Task 4 changes that signature. If you encounter a type error referencing `onAfterCancel`, proceed to Task 4 (which patches `cancel-booking.tsx` to accept the new prop) before re-running tsc here.

- [ ] **Step 3: Commit**

```bash
git add src/view-bookings.tsx
git commit -m "Restructure View Bookings into sections with pagination and pending"
```

---

## Task 4: Update `CancelBooking` to accept generic mutate + optional `onAfterCancel`

**Files:**
- Modify: `src/components/cancel-booking.tsx`

Currently `CancelBooking` is typed as `mutate: MutatePromise<CalBooking[] | undefined>` which works for any of the three section caches. But after a successful cancel, we want to optionally trigger a revalidate on the Cancelled section. Add an `onAfterCancel?: () => void | Promise<void>` callback.

- [ ] **Step 1: Overwrite `src/components/cancel-booking.tsx`**

```tsx
import { Action, ActionPanel, Color, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { CalBooking, cancelBooking } from "@api/cal.com";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";

export interface CancelBookingFormValues {
  reason: string;
}

interface CancelBookingProps {
  bookingUid: string;
  mutate: MutatePromise<CalBooking[] | undefined>;
  /** Optional callback invoked after a successful cancel (e.g. to revalidate
   *  the Cancelled section in the parent list). */
  onAfterCancel?: () => void | Promise<void>;
}

export function CancelBooking({ bookingUid, mutate, onAfterCancel }: CancelBookingProps) {
  const { pop } = useNavigation();

  const handleCancelBooking = async (reason: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling booking" });
    try {
      await cancelBooking(bookingUid, reason);
      toast.style = Toast.Style.Success;
      toast.title = "Booking Cancelled";
      toast.message = "Booking has been successfully cancelled";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to cancel booking" });
      throw error;
    } finally {
      pop();
    }
  };

  const handleCancelAndMutate = async (reason: string) => {
    await mutate(handleCancelBooking(reason), {
      optimisticUpdate: (bookings) => {
        if (!bookings) return;
        // Sectioned lists: drop the booking from the source section entirely.
        return bookings.filter((b) => b.uid !== bookingUid);
      },
    });
    if (onAfterCancel) await onAfterCancel();
  };

  const { itemProps, handleSubmit } = useForm<CancelBookingFormValues>({
    onSubmit: (values) =>
      confirmAlert({
        title: "Cancel Booking",
        message: "Are you sure you want to cancel this booking?",
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        primaryAction: {
          title: "Yes",
          onAction: () => handleCancelAndMutate(values.reason),
        },
        dismissAction: {
          title: "No",
          onAction: pop,
        },
      }),
    validation: { reason: FormValidation.Required },
    initialValues: { reason: "" },
  });

  return (
    <Form
      navigationTitle="Cancel Booking"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Cancel Booking" icon={Icon.XMarkCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title={"Reason"} placeholder={"Reason for cancellation"} {...itemProps.reason} />
    </Form>
  );
}
```

The two semantic changes from the previous version:

1. New optional `onAfterCancel` prop, called after the source-section mutate resolves.
2. The optimistic-update callback now FILTERS the cancelled booking out of the source list (rather than mapping it to `status: "cancelled"`). This matches the new sectioned model where a cancelled booking belongs in the Cancelled section, not the source section.

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/cancel-booking.tsx
git commit -m "Update CancelBooking: filter source section on cancel, add onAfterCancel"
```

---

## Task 5: Delete the now-unused `useBookings` hook

**Files:**
- Modify: `src/api/cal.com.ts`

After Task 3, nothing imports `useBookings` anymore. Remove it.

- [ ] **Step 1: Confirm no callers**

```bash
grep -rn "useBookings" src/
```

Expected: no matches (or only the export line in `cal.com.ts`). If anything else still imports it, STOP and fix that consumer first.

- [ ] **Step 2: Remove the function**

In `src/api/cal.com.ts`, delete the `useBookings` function block (the one that calls `calAPI<CalBooking[]>` with no params and sorts client-side). Keep `confirmBooking`, `declineBooking`, and `cancelBooking` — they're still used.

The exact lines to delete are roughly:

```ts
export function useBookings() {
  return useCachedPromise(
    async () => {
      const data = await calAPI<CalBooking[]>({
        url: "/bookings",
        headers: { "cal-api-version": "2026-02-25" },
      });
      return data.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    },
    [],
    { failureToastOptions: { title: "Unable to load bookings" } },
  );
}
```

After deletion, the file should still typecheck and lint clean.

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

- [ ] **Step 4: Commit**

```bash
git add src/api/cal.com.ts
git commit -m "Remove unused useBookings hook (replaced by section-specific hooks)"
```

---

## Task 6: Update CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Insert a new entry at the top of `CHANGELOG.md`**

Above the existing topmost entry, add:

```markdown
## [Fix + improve View Bookings] - {PR_MERGE_DATE}

- Fix a bug where View Bookings only showed the first 100 bookings (hiding all recent + upcoming bookings for users with longer histories)
- Group bookings into Pending Confirmation, Upcoming, Past, and Cancelled sections
- Pending Confirmation appears at the top so bookings awaiting your response don't get missed
- Past bookings now lazy-load on scroll (50 per page)
- Cancelled bookings hidden by default; toggle with ⌘ H

```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "Document View Bookings redesign in CHANGELOG"
```

---

## Task 7: Manual QA against a real Cal.com account

This task is run by the human; subagents should report DONE_WITH_CONCERNS noting that QA is human-driven.

- [ ] **Step 1: Run dev mode**

```bash
npx ray develop
```

Open Raycast → "View Bookings".

- [ ] **Step 2: Verify sections render**

- Bookings appear in Pending / Upcoming / Past sections in that order
- Each section is hidden if it's empty (no empty headers)
- The bug is fixed: bookings from the past 12 months and upcoming bookings should now appear correctly

- [ ] **Step 3: Verify pagination on Past**

- Scroll the Past section. After ~50 entries, additional past bookings should load automatically (you'll see a brief loading state at the bottom of the list).
- Continue scrolling — pagination should keep loading until there's no more history.

- [ ] **Step 4: Verify Cmd+H toggle**

- Press ⌘ H. Cancelled section appears beneath Past with up to 50 entries.
- Press ⌘ H again. Cancelled disappears.
- Close and reopen the command — the Cancelled toggle state should persist (cached via `useCachedState`).

- [ ] **Step 5: Verify confirm/decline/cancel mutations**

If you have a Pending booking (or can have someone book a confirmation-required event with you):

- Press Enter on a Pending row → Accept. Confirm:
  - Toast "Booking confirmed"
  - The row leaves Pending
  - The booking now appears in Upcoming (after a brief revalidate)

If you have an Upcoming booking you can cancel:

- Press ⌘ C on an Upcoming row → enter a reason → submit → confirm. Confirm:
  - Toast "Booking Cancelled"
  - The row leaves Upcoming
  - If Cancelled is currently shown, the row appears there

- [ ] **Step 6: Final lint and build**

```bash
npx ray lint
npx ray build -e dist
```

Both exit 0.

---

## Done criteria

- All 6 tasks complete, each with its own commit
- `ray lint` and `ray build -e dist` clean on final commit
- Manual QA verifies the original bug is fixed (recent + upcoming bookings appear)
- No regressions on Confirm / Decline / Cancel flows
