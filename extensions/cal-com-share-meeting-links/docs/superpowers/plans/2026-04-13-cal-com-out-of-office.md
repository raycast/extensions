# Cal.com Out-of-Office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Out of Office` Raycast command that lets users browse, create, edit, and delete their Cal.com OOO entries, with a team-member redirect picker and an escape-hatch to web settings (covering scheduled-timezone-change since Cal.com has no API for it).

**Architecture:** One new top-level `view` command. The list shows current + upcoming OOO entries (sorted ascending), each row with a reason-derived icon, a date-range title, and accessories for the redirect target and notes. Selecting a row pushes an Edit form. Creates use the same form. Mutations are optimistic via `useCachedPromise`'s `mutate`. The fetcher for `useOOOEntries` is hoisted (matching the `fetchSchedules` fix) so multiple component callers share one cache.

**Tech Stack:** Raycast API (`@raycast/api`, `@raycast/utils`), TypeScript, axios, Cal.com v2 REST.

**Related spec:** `docs/superpowers/specs/2026-04-13-cal-com-out-of-office-design.md`

**Repo conventions to follow:**
- Path aliases: `@api/cal.com`, `@components/*`, `@/lib/*` (see `tsconfig.json`)
- Existing error pattern: `showFailureToast(error, { title: "..." })`
- Existing optimistic pattern: `mutate(promise, { optimisticUpdate: (data) => ... })` (see `src/view-bookings.tsx`, `src/view-availability.tsx`)
- Form pattern: `useForm` with cross-field validation in `apply` (see `src/components/edit-override.tsx`)
- Hoist fetch functions to module scope so `useCachedPromise` cache namespaces match across callers (see `fetchSchedules` in `src/api/cal.com.ts`)
- No test framework in the repo. Verification = `npx tsc --noEmit && npx ray lint && npx ray build -e dist` + manual QA at the end.

**Probe-during-implementation note:** The spec lists six open API questions (endpoint path, header version, end-of-day convention, team-member listing permissions, past-entry filtering, `toUser` embedding). Task 1 includes a probe step against the live API. The plan defaults assume the most likely answer and document the fallback inline; if the probe contradicts the assumption, the implementer flips the default per the inline guidance.

**Testing approach:** No unit tests added (matching the precedent of the availability work). Each task ends with `npx tsc --noEmit && npx ray lint`. The final task runs a manual QA checklist against a real Cal.com account and `npx ray build -e dist`.

---

## Task 1: API probe + add OOO types and basic hooks

**Files:**
- Modify: `src/api/cal.com.ts`

This task answers spec open questions 1–3 and 5 in one sitting against the live API, then locks in the discovered values.

- [ ] **Step 1: Probe the OOO endpoint path and required header**

From the extension directory, with a valid API key configured in Raycast preferences, run two ad-hoc curl probes (use the same `Bearer` token that's stored in the extension preferences — get it from Raycast → Extensions → Cal.com → API Key). Try both candidate paths in turn:

```bash
TOKEN="<paste-your-cal-api-key>"

# Probe A — paths
curl -s -o /dev/null -w "GET /v2/out-of-office     -> %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.cal.com/v2/out-of-office

curl -s -o /dev/null -w "GET /v2/me/ooo            -> %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.cal.com/v2/me/ooo

# Probe B — header version (try the most recent v2 dates first)
for V in 2024-06-14 2024-06-11 2024-08-13 2025-01-22 2026-02-25; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "cal-api-version: $V" \
    https://api.cal.com/v2/out-of-office)
  echo "version $V -> $CODE"
done
```

Record:
- Which path returned `200` → that's `OOO_BASE_PATH`. If both work, prefer `/out-of-office` (the more general one).
- The lowest header version that returned `200` → that's `OOO_API_VERSION`. If a probe without the header also returns `200`, then no header is needed and you can omit it.

If neither path returns 200, STOP and escalate (BLOCKED).

- [ ] **Step 2: Probe response shape (does it include past entries? does it embed `toUser`?)**

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "cal-api-version: $OOO_API_VERSION" \
  https://api.cal.com$OOO_BASE_PATH | jq .
```

Inspect the response. Note:
- Are past entries returned by default, or only future/active? (Used in Task 4's `useOOOEntries` filter.)
- Does each entry include a `toUser` object, or only `toUserId`? (Drives whether we need a separate user lookup.)
- The exact field names — confirm `start`, `end`, `reason`, `notes`, `toUserId`, `id`, `uuid`, `createdAt`, `updatedAt` are all present as named in the spec. If field names differ, update the type definitions in Step 4 to match what the API actually returns.

If the response includes past entries, we'll filter client-side in Task 4. If it embeds `toUser`, we use it directly. If not, Task 6 (the form) will need a user lookup hook — note this and add a follow-up step in Task 6.

Capture the results in a comment block at the top of the new section in `src/api/cal.com.ts` (Step 4).

- [ ] **Step 3: Probe end-of-day convention**

Pick a single test date (a few days in the future). Try two creates with different end conventions:

```bash
TODAY_PLUS_2=$(date -u -v+2d '+%Y-%m-%d')
TODAY_PLUS_3=$(date -u -v+3d '+%Y-%m-%d')

# Convention X: end = next-day 00:00:00Z
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "cal-api-version: $OOO_API_VERSION" \
  -H "Content-Type: application/json" \
  -d "{\"start\":\"${TODAY_PLUS_2}T00:00:00.000Z\",\"end\":\"${TODAY_PLUS_3}T00:00:00.000Z\",\"reason\":\"vacation\",\"notes\":\"probe-X\"}" \
  https://api.cal.com$OOO_BASE_PATH | jq .

# Convention Y: end = same-day 23:59:59.999Z
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "cal-api-version: $OOO_API_VERSION" \
  -H "Content-Type: application/json" \
  -d "{\"start\":\"${TODAY_PLUS_2}T00:00:00.000Z\",\"end\":\"${TODAY_PLUS_2}T23:59:59.999Z\",\"reason\":\"vacation\",\"notes\":\"probe-Y\"}" \
  https://api.cal.com$OOO_BASE_PATH | jq .
```

If both succeed, pick X (cleaner semantics — "OOO ends at start of next day"). If only one succeeds, use it. Record the choice.

Then DELETE both probe entries:

```bash
# get IDs from the JSON above, then:
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  -H "cal-api-version: $OOO_API_VERSION" \
  https://api.cal.com$OOO_BASE_PATH/<id-X>

curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  -H "cal-api-version: $OOO_API_VERSION" \
  https://api.cal.com$OOO_BASE_PATH/<id-Y>
```

- [ ] **Step 4: Add OOO types and constants to `src/api/cal.com.ts`**

Open `src/api/cal.com.ts`. After the existing schedules section (after the `updateSchedule` function and before `formatDateTime`), add:

```ts
// ─── Out of Office ─────────────────────────────────────────────────────────
//
// Probe results captured 2026-04-13 (replace these with the values you got from Task 1):
//   OOO_BASE_PATH      = "/out-of-office"        // verified working
//   OOO_API_VERSION    = "2024-06-14"            // verified working
//   END_OF_DAY_FORMAT  = next-day-00:00:00Z      // verified working
//   GET returns        = future + active only    // (or "all dates, filter client-side")
//   toUser embedded    = yes                     // (or "no, only toUserId")

const OOO_API_VERSION = "2024-06-14"; // ← replace with the value from your probe

export type CalOOOReason = "unspecified" | "vacation" | "travel" | "sick" | "public_holiday";

export interface CalOOOToUser {
  id: number;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface CalOOOEntry {
  id: number;
  uuid: string;
  userId: number;
  start: string; // ISO datetime UTC
  end: string;   // ISO datetime UTC
  reason: CalOOOReason;
  notes: string | null;
  toUserId: number | null;
  toUser?: CalOOOToUser | null;
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

If the field names you observed in the probe differ (e.g. `userId` is missing or `reason` is structured differently), tweak the type to match what the API actually returns. Do NOT add fields the API doesn't return.

- [ ] **Step 5: Add the hoisted fetcher and CRUD action functions**

Still in `src/api/cal.com.ts`, immediately after the OOO types:

```ts
// Hoisted to share useCachedPromise's cache namespace across callers.
async function fetchOOOEntries(): Promise<CalOOOEntry[]> {
  const data = await calAPI<CalOOOEntry[]>({
    url: "/out-of-office",
    headers: { "cal-api-version": OOO_API_VERSION },
  });
  // If the API returns past entries, filter client-side. Otherwise this is a no-op.
  const now = Date.now();
  return data
    .filter((e) => new Date(e.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function useOOOEntries() {
  return useCachedPromise(fetchOOOEntries, [], {
    failureToastOptions: { title: "Unable to load out-of-office entries" },
  });
}

export function createOOO(input: CalOOOCreate, signal?: AbortSignal) {
  return calAPI<CalOOOEntry>({
    method: "POST",
    url: "/out-of-office",
    headers: { "cal-api-version": OOO_API_VERSION },
    data: input,
    signal,
  });
}

export function updateOOO(id: number, patch: CalOOOPatch, signal?: AbortSignal) {
  return calAPI<CalOOOEntry>({
    method: "PATCH",
    url: `/out-of-office/${id}`,
    headers: { "cal-api-version": OOO_API_VERSION },
    data: patch,
    signal,
  });
}

export function deleteOOO(id: number, signal?: AbortSignal) {
  return calAPI<void>({
    method: "DELETE",
    url: `/out-of-office/${id}`,
    headers: { "cal-api-version": OOO_API_VERSION },
    signal,
  });
}
```

If your probe revealed the path is `/me/ooo` instead of `/out-of-office`, swap the four `url` strings. If the probe revealed no `cal-api-version` header is needed, remove the `headers` field from each request.

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

Both should exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/api/cal.com.ts
git commit -m "Add OOO types, useOOOEntries, and CRUD action functions"
```

---

## Task 2: Add team-members fetcher (for the redirect picker)

**Files:**
- Modify: `src/api/cal.com.ts`

This is a separate concern: the people you can redirect to. Built as a defensive hook that gracefully degrades when permissions don't allow listing.

- [ ] **Step 1: Probe what's available**

Use the same `$TOKEN` from Task 1.

```bash
# Try the documented teams endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "cal-api-version: 2024-08-13" \
  https://api.cal.com/v2/teams | jq .

# If you have an org, try org users
# (replace $ORG_ID with one from the response above)
# curl -s -H "Authorization: Bearer $TOKEN" \
#   -H "cal-api-version: 2024-08-13" \
#   https://api.cal.com/v2/orgs/$ORG_ID/users | jq .
```

Record:
- Whether `/v2/teams` returns the user's teams without admin permission. (Likely yes.)
- The shape of the teams response (do they embed members? probably not).
- Whether iterating to a per-team `memberships` endpoint works for non-admins. (Likely no, per the spec.)

- [ ] **Step 2: Add a defensive fetcher that returns `[]` on permission errors**

In `src/api/cal.com.ts`, after the OOO section, add:

```ts
// ─── Team members (for OOO redirect target) ────────────────────────────────

const TEAMS_API_VERSION = "2024-08-13"; // ← replace if your probe showed a different working version

interface CalTeamSummary {
  id: number;
  name: string;
}

export interface CalTeammate {
  id: number;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  teamName: string; // for display context
}

async function fetchTeams(): Promise<CalTeamSummary[]> {
  try {
    return await calAPI<CalTeamSummary[]>({
      url: "/teams",
      headers: { "cal-api-version": TEAMS_API_VERSION },
    });
  } catch {
    return [];
  }
}

interface MembershipResponseUser {
  id: number;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
}

interface MembershipResponse {
  user: MembershipResponseUser;
}

async function fetchTeamMembers(teamId: number, teamName: string): Promise<CalTeammate[]> {
  try {
    const memberships = await calAPI<MembershipResponse[]>({
      url: `/teams/${teamId}/memberships`,
      headers: { "cal-api-version": TEAMS_API_VERSION },
    });
    return memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      username: m.user.username,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      teamName,
    }));
  } catch {
    // Permission denied or endpoint missing — degrade gracefully.
    return [];
  }
}

async function fetchAllTeammates(): Promise<CalTeammate[]> {
  const teams = await fetchTeams();
  if (teams.length === 0) return [];
  const lists = await Promise.all(teams.map((t) => fetchTeamMembers(t.id, t.name)));
  const merged = lists.flat();
  // De-duplicate by user id, keep first-seen team name.
  const seen = new Set<number>();
  const out: CalTeammate[] = [];
  for (const t of merged) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out.sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}

export function useTeammates() {
  return useCachedPromise(fetchAllTeammates, [], {
    failureToastOptions: { title: "Unable to load teammates" },
  });
}
```

If your probe in Step 1 showed that `/teams/{id}/memberships` doesn't exist (404) and a different path is correct (e.g. `/teams/{id}/users`), update the URL in `fetchTeamMembers` accordingly. Keep the `try/catch` so a 403 silently degrades.

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

- [ ] **Step 4: Commit**

```bash
git add src/api/cal.com.ts
git commit -m "Add useTeammates hook with graceful permission degradation"
```

---

## Task 3: Add OOO pure helpers in `src/lib/ooo.ts`

**Files:**
- Create: `src/lib/ooo.ts`

- [ ] **Step 1: Create the file**

```ts
import { Color, Icon } from "@raycast/api";
import type { CalOOOEntry, CalOOOReason } from "@api/cal.com";

/** Stable order for the reason dropdown. */
export const OOO_REASONS: CalOOOReason[] = ["unspecified", "vacation", "travel", "sick", "public_holiday"];

/** Display label for a reason (Title Case). */
export function labelForReason(reason: CalOOOReason): string {
  switch (reason) {
    case "unspecified":
      return "Unspecified";
    case "vacation":
      return "Vacation";
    case "travel":
      return "Travel";
    case "sick":
      return "Sick";
    case "public_holiday":
      return "Public Holiday";
  }
}

/** Reason-tinted icon used in list rows and detail pane. */
export function iconForReason(reason: CalOOOReason): { source: Icon; tintColor: Color } {
  switch (reason) {
    case "vacation":
      return { source: Icon.Sun, tintColor: Color.Yellow };
    case "travel":
      return { source: Icon.Airplane, tintColor: Color.Blue };
    case "sick":
      return { source: Icon.Bandage, tintColor: Color.Red };
    case "public_holiday":
      return { source: Icon.Star, tintColor: Color.Purple };
    case "unspecified":
      return { source: Icon.Calendar, tintColor: Color.SecondaryText };
  }
}

/**
 * Number of inclusive calendar days between start and end. Treats the API's
 * end-of-day convention (next-day-00:00:00Z) as "ends at midnight on the day
 * BEFORE end". A 1-day OOO returns 1.
 */
export function daysInRange(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  // Round to handle the 1-minute-before-midnight convention if used.
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((endMs - startMs) / dayMs));
}

/** Last calendar day of an OOO range, given the end timestamp uses next-day-00:00 convention. */
export function lastDay(end: string): Date {
  const d = new Date(end);
  // If end is exactly at 00:00:00, the OOO ends the previous day.
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

/** "May 1, 2026" — formatted in the user's locale. */
function formatCalendarDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

/** "Friday" — formatted in the user's locale. */
function formatWeekday(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

/** "May 1, 2026" or "May 1 – 7, 2026". Single-day collapses. */
export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = lastDay(end);
  const sameDay =
    s.getUTCFullYear() === e.getUTCFullYear() &&
    s.getUTCMonth() === e.getUTCMonth() &&
    s.getUTCDate() === e.getUTCDate();
  if (sameDay) return formatCalendarDate(s);
  return `${formatCalendarDate(s)} – ${formatCalendarDate(e)}`;
}

/** "Friday" or "Friday – Thursday". */
export function formatWeekdayRange(start: string, end: string): string {
  const s = new Date(start);
  const e = lastDay(end);
  const sameDay =
    s.getUTCFullYear() === e.getUTCFullYear() &&
    s.getUTCMonth() === e.getUTCMonth() &&
    s.getUTCDate() === e.getUTCDate();
  if (sameDay) return formatWeekday(s);
  return `${formatWeekday(s)} – ${formatWeekday(e)}`;
}

/** True when `now` falls within [entry.start, entry.end). */
export function isCurrentlyActive(entry: CalOOOEntry, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(entry.start).getTime() && t < new Date(entry.end).getTime();
}

/**
 * Convert a JS Date (from Form.DatePicker, local time) into the API's UTC
 * "start of day" ISO string. Uses local-time getters so the user sees the
 * date they picked.
 */
export function toUtcStart(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0)).toISOString();
}

/**
 * Convert a JS Date (from Form.DatePicker, local time) into the API's UTC
 * "end of day" ISO string, using the next-day-00:00:00Z convention by default.
 * If your probe (Task 1 Step 3) showed the API requires same-day-23:59:59.999Z,
 * change this function accordingly.
 */
export function toUtcEnd(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0)).toISOString();
}

/** Inverse of `toUtcStart` — used for pre-filling Form.DatePicker on edit. */
export function fromUtcStart(iso: string): Date {
  const u = new Date(iso);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}

/** Inverse of `toUtcEnd` — returns the OOO's last calendar day in local time. */
export function fromUtcEnd(iso: string): Date {
  const u = lastDay(iso);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ooo.ts
git commit -m "Add pure OOO helpers (formatting, date conversion, reason metadata)"
```

---

## Task 4: Register the `out-of-office` command (with stub)

**Files:**
- Modify: `package.json`
- Create: `src/out-of-office.tsx`

- [ ] **Step 1: Append the command entry to `package.json`**

In the `commands` array (currently `index`, `view-bookings`, `view-availability`), add a fourth entry:

```json
{
  "name": "out-of-office",
  "title": "Out of Office",
  "subtitle": "Cal.com",
  "description": "View and manage your Cal.com out-of-office entries",
  "mode": "view"
}
```

- [ ] **Step 2: Create the stub command file**

Create `src/out-of-office.tsx`:

```tsx
import { List } from "@raycast/api";

export default function OutOfOffice() {
  return <List isLoading />;
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

- [ ] **Step 4: Commit**

```bash
git add package.json src/out-of-office.tsx
git commit -m "Register out-of-office command (stub)"
```

---

## Task 5: Edit OOO form (handles add + edit, with team-members dropdown)

**Files:**
- Create: `src/components/edit-ooo.tsx`

- [ ] **Step 1: Create the form**

```tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import {
  CalOOOEntry,
  CalOOOReason,
  createOOO,
  updateOOO,
  useTeammates,
} from "@api/cal.com";
import {
  fromUtcEnd,
  fromUtcStart,
  iconForReason,
  labelForReason,
  OOO_REASONS,
  toUtcEnd,
  toUtcStart,
} from "@/lib/ooo";

interface EditOOOProps {
  /** When editing, the existing entry. Undefined means "create new". */
  entry?: CalOOOEntry;
  mutate: MutatePromise<CalOOOEntry[] | undefined>;
}

interface Values {
  start: Date | null;
  end: Date | null;
  reason: CalOOOReason;
  toUserId: string; // dropdown values are strings; "" means none
  notes: string;
}

const NO_REDIRECT = "";

export function EditOOO({ entry, mutate }: EditOOOProps) {
  const { pop } = useNavigation();
  const { data: teammates, isLoading: isLoadingTeammates } = useTeammates();

  const initialValues: Values = {
    start: entry ? fromUtcStart(entry.start) : null,
    end: entry ? fromUtcEnd(entry.end) : null,
    reason: entry?.reason ?? "unspecified",
    toUserId: entry?.toUserId ? String(entry.toUserId) : NO_REDIRECT,
    notes: entry?.notes ?? "",
  };

  const apply = async (values: Values) => {
    if (!values.start || !values.end) return;
    if (values.end < values.start) {
      await showToast({ style: Toast.Style.Failure, title: "End must be on or after start" });
      return;
    }
    const payload = {
      start: toUtcStart(values.start),
      end: toUtcEnd(values.end),
      reason: values.reason,
      notes: values.notes.trim() || undefined,
      toUserId: values.toUserId === NO_REDIRECT ? undefined : Number(values.toUserId),
    };

    const verb = entry ? "Updating" : "Creating";
    const past = entry ? "updated" : "created";
    const toast = await showToast({ style: Toast.Style.Animated, title: `${verb} OOO entry` });
    try {
      if (entry) {
        await mutate(updateOOO(entry.id, payload), {
          optimisticUpdate: (entries) =>
            entries?.map((e) => (e.id === entry.id ? { ...e, ...payload, notes: payload.notes ?? null } : e)),
        });
      } else {
        // Optimistic create: tag with a synthetic negative id; cache will be replaced on revalidate.
        const synthetic: CalOOOEntry = {
          id: -Date.now(),
          uuid: "",
          userId: 0,
          start: payload.start,
          end: payload.end,
          reason: payload.reason,
          notes: payload.notes ?? null,
          toUserId: payload.toUserId ?? null,
        };
        await mutate(createOOO(payload), {
          optimisticUpdate: (entries) => {
            const next = entries ? [...entries, synthetic] : [synthetic];
            return next.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          },
        });
      }
      toast.style = Toast.Style.Success;
      toast.title = `OOO ${past}`;
    } catch (err) {
      await showFailureToast(err, { title: `Failed to ${entry ? "update" : "create"} OOO` });
      throw err;
    } finally {
      pop();
    }
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: apply,
    validation: {
      start: (v) => (v ? undefined : "Start date is required"),
      end: (v) => (v ? undefined : "End date is required"),
    },
    initialValues,
  });

  const showRedirect = !isLoadingTeammates && (teammates?.length ?? 0) > 0;

  return (
    <Form
      navigationTitle={entry ? "Edit Out of Office" : "New Out of Office"}
      isLoading={isLoadingTeammates}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={entry ? "Save" : "Create"} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Start" type={Form.DatePicker.Type.Date} {...itemProps.start} />
      <Form.DatePicker title="End" type={Form.DatePicker.Type.Date} {...itemProps.end} />
      <Form.Dropdown title="Reason" {...itemProps.reason}>
        {OOO_REASONS.map((r) => (
          <Form.Dropdown.Item key={r} value={r} title={labelForReason(r)} icon={iconForReason(r)} />
        ))}
      </Form.Dropdown>
      {showRedirect && (
        <Form.Dropdown title="Redirect To" {...itemProps.toUserId}>
          <Form.Dropdown.Item value={NO_REDIRECT} title="(none)" icon={Icon.Minus} />
          {teammates!.map((t) => (
            <Form.Dropdown.Item
              key={t.id}
              value={String(t.id)}
              title={t.name ?? t.email}
              icon={t.avatarUrl ? { source: t.avatarUrl } : Icon.Person}
              keywords={[t.email, t.username ?? "", t.teamName].filter(Boolean) as string[]}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea title="Notes" placeholder="Optional context" {...itemProps.notes} />
      {!showRedirect && !isLoadingTeammates && (
        <Form.Description
          title="Redirect"
          text="No teammates available. To set a redirect target, use the cal.com web UI."
        />
      )}
    </Form>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/edit-ooo.tsx
git commit -m "Add EditOOO form (create + edit with team-member redirect picker)"
```

---

## Task 6: Top-level Out-of-Office command

**Files:**
- Modify: `src/out-of-office.tsx` (replaces the Task 4 stub — use Write, not Edit)

- [ ] **Step 1: Overwrite the stub with the full command**

```tsx
import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Icon,
  List,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { CalOOOEntry, deleteOOO, useOOOEntries } from "@api/cal.com";
import { EditOOO } from "@components/edit-ooo";
import {
  daysInRange,
  formatDateRange,
  formatWeekdayRange,
  iconForReason,
  isCurrentlyActive,
  labelForReason,
} from "@/lib/ooo";

const OOO_SETTINGS_URL = "https://app.cal.com/settings/my-account/out-of-office";
const ACCOUNT_SETTINGS_URL = "https://app.cal.com/settings/my-account/general";

export default function OutOfOffice() {
  const { data: entries, isLoading, error, mutate } = useOOOEntries();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("ooo-show-details", true);

  const handleDelete = async (entry: CalOOOEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete OOO entry?",
      message: formatDateRange(entry.start, entry.end),
      icon: { source: Icon.Trash, tintColor: Color.Red },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting OOO entry" });
    try {
      await mutate(deleteOOO(entry.id), {
        optimisticUpdate: (list) => list?.filter((e) => e.id !== entry.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = "OOO entry deleted";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to delete OOO entry" });
    }
  };

  const createAction = (
    <Action.Push
      title="Create OOO"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<EditOOO mutate={mutate} />}
    />
  );

  const openOOOInBrowserAction = (
    <Action.OpenInBrowser
      title="Open OOO Settings in Browser"
      url={OOO_SETTINGS_URL}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
    />
  );

  const openAccountInBrowserAction = (
    <Action.OpenInBrowser
      title="Open Account Settings in Browser"
      url={ACCOUNT_SETTINGS_URL}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );

  const empty = !isLoading && !error && entries && entries.length === 0;

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail && !empty}>
      {error && (
        <List.EmptyView
          title="Unable to load out-of-office entries"
          description="Check your API key"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {empty && (
        <List.EmptyView
          title="No upcoming time off"
          description="Press ⌘ N to schedule one."
          icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              {createAction}
              {openOOOInBrowserAction}
              {openAccountInBrowserAction}
            </ActionPanel>
          }
        />
      )}
      {entries?.map((entry) => (
        <List.Item
          key={entry.id}
          icon={iconForReason(entry.reason)}
          title={formatDateRange(entry.start, entry.end)}
          subtitle={formatWeekdayRange(entry.start, entry.end)}
          accessories={
            isShowingDetail
              ? []
              : [
                  ...(entry.toUser
                    ? [
                        {
                          icon: entry.toUser.avatarUrl ? { source: entry.toUser.avatarUrl } : Icon.Person,
                          text: entry.toUser.name ?? entry.toUser.email,
                          tooltip: `Redirects to ${entry.toUser.name ?? entry.toUser.email}`,
                        },
                      ]
                    : []),
                  ...(entry.notes
                    ? [{ icon: Icon.SpeechBubble, tooltip: "Has notes" }]
                    : []),
                  ...(isCurrentlyActive(entry)
                    ? [{ tag: { value: "Active", color: Color.Green } }]
                    : []),
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Reason"
                    text={labelForReason(entry.reason)}
                    icon={iconForReason(entry.reason)}
                  />
                  <List.Item.Detail.Metadata.Label title="Dates" text={formatDateRange(entry.start, entry.end)} />
                  <List.Item.Detail.Metadata.Label title="Days" text={`${daysInRange(entry.start, entry.end)}`} />
                  {entry.toUser && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Redirects To"
                        text={entry.toUser.name ?? entry.toUser.email}
                        icon={entry.toUser.avatarUrl ? { source: entry.toUser.avatarUrl } : Icon.Person}
                      />
                      {entry.toUser.email && (
                        <List.Item.Detail.Metadata.Label title="Email" text={entry.toUser.email} />
                      )}
                    </>
                  )}
                  {entry.notes && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Notes" text={entry.notes} />
                    </>
                  )}
                  {(entry.createdAt || entry.updatedAt) && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      {entry.createdAt && (
                        <List.Item.Detail.Metadata.Label title="Created" text={entry.createdAt.slice(0, 10)} />
                      )}
                      {entry.updatedAt && (
                        <List.Item.Detail.Metadata.Label title="Updated" text={entry.updatedAt.slice(0, 10)} />
                      )}
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit OOO"
                icon={Icon.Pencil}
                target={<EditOOO entry={entry} mutate={mutate} />}
              />
              {openOOOInBrowserAction}
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              {createAction}
              {openAccountInBrowserAction}
              <Action
                title="Delete OOO"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(entry)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 2: Typecheck, lint, and build**

```bash
npx tsc --noEmit
npx ray lint
npx ray build -e dist
```

All three should exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/out-of-office.tsx
git commit -m "Implement Out of Office top-level command"
```

---

## Task 7: Update CHANGELOG and README

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Add a changelog entry at the top of `CHANGELOG.md`**

Insert above the existing `## [Add: View and manage availability schedules]` entry:

```markdown
## [Add: Manage Out of Office] - {PR_MERGE_DATE}

- Adds a new "Out of Office" command
- Lists current and upcoming OOO entries with reason-tinted icons and date ranges
- Create, edit, and delete OOO entries (date range, reason, optional notes)
- Set a redirect target by picking a teammate from a searchable dropdown (with avatars)
- Quick links to the Out of Office and General Account settings on cal.com (covers scheduled timezone change, which has no public API)

```

- [ ] **Step 2: Update `README.md`**

Replace the opening paragraph:

```markdown
# Cal.com Share Meeting Links

Quickly share your Cal.com meeting links, generate private links, view and cancel bookings, view and manage your availability schedules, and manage your out-of-office entries.
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md README.md
git commit -m "Document Out of Office command in CHANGELOG and README"
```

---

## Task 8: Manual QA against a real Cal.com account

- [ ] **Step 1: Run the extension in dev mode**

```bash
npx ray develop
```

In Raycast, invoke "Out of Office".

- [ ] **Step 2: Verify the empty state (if no upcoming OOO)**

If you have no upcoming OOO entries, the empty state should render with the create-now hint. Press ⌘ N → form opens.

- [ ] **Step 3: Create an OOO entry**

In the form:
- Pick a start date a few days out
- Pick an end date a few more days out
- Pick a reason ("Vacation")
- (If teammates loaded) pick someone from the redirect dropdown — verify avatars render
- Add a note
- Submit

Confirm:
- Toast: "Creating OOO entry" → "OOO created"
- The list now shows your new entry with the right icon, title, and accessories

- [ ] **Step 4: Verify the list view**

- Toggle details (⌘ D) on/off
- Confirm the active "Active" green tag appears for an entry whose date range covers today (skip if you don't have one)
- Confirm the avatar accessory appears for entries with a redirect target
- Confirm the speech-bubble accessory appears for entries with notes

- [ ] **Step 5: Verify edit**

Press Enter on an entry → form opens with values pre-filled. Change the end date to a day later, save. Confirm:
- Toast success
- List row shows the new date range

- [ ] **Step 6: Verify delete**

Select an entry → press Ctrl-X. ConfirmAlert appears. Confirm. The row disappears.

- [ ] **Step 7: Verify keyboard shortcuts**

- ⌘ ↵ on a row → opens https://app.cal.com/settings/my-account/out-of-office in browser
- ⌘ ⇧ A on a row → opens https://app.cal.com/settings/my-account/general in browser
- ⌘ N → opens create form

- [ ] **Step 8: Verify the team-member dropdown degrades gracefully**

If your account is solo (no teams) OR your teams' members aren't accessible, the form should:
- Hide the "Redirect To" dropdown
- Show the explanatory description block instead

If your account does have teammates and the API allows listing, confirm:
- Avatars render in the dropdown
- Searching by name, email, or team works (Raycast filters via `keywords`)

- [ ] **Step 9: Final lint and build**

```bash
npx ray lint
npx ray build -e dist
```

Both exit 0.

- [ ] **Step 10: Note any open-question outcomes**

Update the spec's "Open questions" section (or capture in the PR description) with the actual values you discovered during the Task 1 probes:
- Endpoint base path
- API version header
- End-of-day convention
- Whether team-member listing worked for your account
- Whether `toUser` was embedded in responses

These notes will help reviewers and future contributors.

---

## Done criteria

- All 8 tasks complete, each with its own commit
- `npx ray lint` and `npx ray build -e dist` pass on the final commit
- Every capability listed in the spec's "Goal" section works end-to-end
- CHANGELOG and README updated
- Open-question outcomes captured (in spec or PR description)
