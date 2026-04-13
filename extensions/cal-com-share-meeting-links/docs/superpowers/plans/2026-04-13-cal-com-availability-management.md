# Cal.com Availability Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `View Availability` Raycast command that lets users browse and edit their Cal.com schedules — working hours (per day), date overrides, timezone, name, and default flag.

**Architecture:** One new top-level Raycast `view` command. Top-level is a `List` of schedules (with a toggleable detail pane). Enter pushes a sectioned `List` (Working Hours · Date Overrides · Settings) where each row carries its own edit actions that push `Form` components. All edits PATCH `/v2/schedules/{id}` with client-computed full `availability` / `overrides` arrays. Optimistic updates via `useCachedPromise`'s `mutate`.

**Tech Stack:** Raycast API (`@raycast/api`, `@raycast/utils`), TypeScript, axios, Cal.com v2 REST (`cal-api-version: 2024-06-11` for schedules).

**Related spec:** `docs/superpowers/specs/2026-04-13-cal-com-availability-design.md`

**Repo conventions to follow:**
- Path aliases: `@api/cal.com`, `@components/*` (see `tsconfig.json`)
- Existing error pattern: `showFailureToast(error, { title: "..." })`
- Existing optimistic pattern: `mutate(promise, { optimisticUpdate: (data) => data.map(...) })` (see `src/view-bookings.tsx`)
- Form pattern: `useForm` with `FormValidation.*`, return via `useNavigation().pop()` (see `src/components/cancel-booking.tsx`)
- No test framework exists in the repo; verification is `ray lint`, `ray build -e dist`, and manual smoke-test against a real Cal.com account via `ray develop`

**Testing approach:** This repo has no unit test infrastructure. Every task ends with a build/lint check (`npx tsc --noEmit && npx ray lint`) and a commit. A dedicated manual-QA task at the end validates end-to-end behavior against a real Cal.com account.

---

## Task 1: Add schedule types and API functions to `src/api/cal.com.ts`

**Files:**
- Modify: `src/api/cal.com.ts`

- [ ] **Step 1: Add schedule types after the existing `CreatePrivateLinkResponse` interface**

Open `src/api/cal.com.ts`. Immediately after the `CreatePrivateLinkResponse` interface (around line 93) and before the `const { token } = getPreferenceValues<Preferences>();` line, add:

```ts
export type CalWeekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface CalScheduleAvailability {
  days: CalWeekday[];
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface CalScheduleOverride {
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
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

export type CalSchedulePatch = Partial<
  Pick<CalSchedule, "name" | "timeZone" | "isDefault" | "availability" | "overrides">
>;
```

- [ ] **Step 2: Add the `useSchedules` hook and `updateSchedule` action at the bottom of the file (before `formatDateTime`)**

Insert the following *before* the `export function formatDateTime` block:

```ts
const SCHEDULES_API_VERSION = "2024-06-11";

export function useSchedules() {
  return useCachedPromise(
    async () => {
      return await calAPI<CalSchedule[]>({
        url: "/schedules",
        headers: { "cal-api-version": SCHEDULES_API_VERSION },
      });
    },
    [],
    { failureToastOptions: { title: "Unable to load schedules" } },
  );
}

export function updateSchedule(id: number, patch: CalSchedulePatch, signal?: AbortSignal) {
  return calAPI<CalSchedule>({
    method: "PATCH",
    url: `/schedules/${id}`,
    headers: { "cal-api-version": SCHEDULES_API_VERSION },
    data: patch,
    signal,
  });
}
```

- [ ] **Step 3: Typecheck and lint**

Run from the extension directory:

```bash
npx tsc --noEmit
npx ray lint
```

Expected: both commands exit 0 with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/api/cal.com.ts
git commit -m "Add CalSchedule types, useSchedules, updateSchedule"
```

---

## Task 2: Add pure helpers in `src/lib/schedule.ts`

**Files:**
- Create: `src/lib/schedule.ts`

The helpers centralize the client-side rewrite of `availability` / `overrides` arrays. They're pure functions that return new schedules, making the component code thin and the logic reviewable in one place.

- [ ] **Step 1: Create `src/lib/schedule.ts`**

Create the file with this content:

```ts
import type {
  CalSchedule,
  CalScheduleAvailability,
  CalScheduleOverride,
  CalWeekday,
} from "@api/cal.com";

export const WEEKDAYS: CalWeekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** 00:00, 00:15, ... 23:45 — used in all time-slot dropdowns. */
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

export interface DayRange {
  startTime: string;
  endTime: string;
}

/** Returns all ranges that apply to the given day, preserving schedule order. */
export function rangesForDay(schedule: CalSchedule, day: CalWeekday): DayRange[] {
  return schedule.availability
    .filter((a) => a.days.includes(day))
    .map(({ startTime, endTime }) => ({ startTime, endTime }));
}

/**
 * Returns a new availability array with all ranges for `day` removed, and
 * the provided `ranges` re-inserted as single-day entries for `day`.
 * Existing entries that grouped `day` with other days are split so the
 * other days keep their ranges.
 */
export function withDayHoursReplaced(
  schedule: CalSchedule,
  day: CalWeekday,
  ranges: DayRange[],
): CalScheduleAvailability[] {
  const next: CalScheduleAvailability[] = [];
  for (const entry of schedule.availability) {
    if (!entry.days.includes(day)) {
      next.push(entry);
      continue;
    }
    const otherDays = entry.days.filter((d) => d !== day);
    if (otherDays.length > 0) {
      next.push({ ...entry, days: otherDays });
    }
  }
  for (const r of ranges) {
    next.push({ days: [day], startTime: r.startTime, endTime: r.endTime });
  }
  return next;
}

/**
 * Returns a new overrides array with any override for `override.date`
 * removed, then `override` inserted. Sorted by date ascending.
 */
export function withOverrideUpserted(
  schedule: CalSchedule,
  override: CalScheduleOverride,
): CalScheduleOverride[] {
  const others = schedule.overrides.filter((o) => o.date !== override.date);
  return [...others, override].sort((a, b) => a.date.localeCompare(b.date));
}

/** Returns a new overrides array with the override for `date` removed. */
export function withOverrideRemoved(schedule: CalSchedule, date: string): CalScheduleOverride[] {
  return schedule.overrides.filter((o) => o.date !== date);
}

/** Formats a single range as "09:00 – 17:00". */
export function formatRange(range: DayRange): string {
  return `${range.startTime} – ${range.endTime}`;
}

/** Formats all ranges for a day as a comma-separated list, or "Unavailable" if none. */
export function formatDayRanges(ranges: DayRange[]): string {
  if (ranges.length === 0) return "Unavailable";
  return ranges.map(formatRange).join(", ");
}

/** An override encoded as startTime === endTime is treated as "Unavailable". */
export function isUnavailableOverride(override: CalScheduleOverride): boolean {
  return override.startTime === override.endTime;
}

/** Formats an override's range as "09:00 – 17:00" or "Unavailable". */
export function formatOverrideRange(override: CalScheduleOverride): string {
  return isUnavailableOverride(override)
    ? "Unavailable"
    : `${override.startTime} – ${override.endTime}`;
}

/** Formats a YYYY-MM-DD string as "May 15, 2026" (no timezone math — date is calendar-local). */
export function formatOverrideDate(date: string): string {
  const [y, m, d] = date.split("-").map((n) => Number(n));
  const js = new Date(Date.UTC(y, m - 1, d));
  return js.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Converts a JS Date (from Form.DatePicker, local time) to "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses "YYYY-MM-DD" as a local Date (for Form.DatePicker defaults). */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  return new Date(y, m - 1, d);
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schedule.ts
git commit -m "Add pure schedule helpers (ranges, overrides, formatting)"
```

---

## Task 3: Register the `view-availability` command in `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the command to the `commands` array**

Edit `package.json`. In the `commands` array (currently containing `index` and `view-bookings`), append a third entry after `view-bookings`:

```json
{
  "name": "view-availability",
  "title": "View Availability",
  "subtitle": "Cal.com",
  "description": "View and manage your Cal.com availability schedules",
  "mode": "view"
}
```

The full `commands` array should look like:

```json
"commands": [
  {
    "name": "index",
    "title": "Share Meeting Link",
    "subtitle": "Cal.com",
    "description": "Copy Meeting URL",
    "mode": "view"
  },
  {
    "name": "view-bookings",
    "title": "View Bookings",
    "subtitle": "Cal.com",
    "description": "View your upcoming Cal.com bookings",
    "mode": "view"
  },
  {
    "name": "view-availability",
    "title": "View Availability",
    "subtitle": "Cal.com",
    "description": "View and manage your Cal.com availability schedules",
    "mode": "view"
  }
]
```

- [ ] **Step 2: Create a stub so the build succeeds**

Raycast will fail to build if the command file doesn't exist. Create a minimal stub at `src/view-availability.tsx` that we'll replace in Task 9:

```tsx
import { List } from "@raycast/api";

export default function ViewAvailability() {
  return <List isLoading />;
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
npx ray lint
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json src/view-availability.tsx
git commit -m "Register view-availability command (stub)"
```

---

## Task 4: Edit Timezone form

**Files:**
- Create: `src/components/edit-timezone.tsx`

- [ ] **Step 1: Create the form component**

```tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, updateSchedule } from "@api/cal.com";

interface EditTimezoneProps {
  schedule: CalSchedule;
  mutate: MutatePromise<CalSchedule[] | undefined>;
}

interface Values {
  timeZone: string;
}

export function EditTimezone({ schedule, mutate }: EditTimezoneProps) {
  const { pop } = useNavigation();

  const zones: string[] = (() => {
    type IntlWithZones = typeof Intl & { supportedValuesOf?: (k: "timeZone") => string[] };
    const intl = Intl as IntlWithZones;
    if (typeof intl.supportedValuesOf === "function") {
      return intl.supportedValuesOf("timeZone");
    }
    return [schedule.timeZone];
  })();

  const apply = async (timeZone: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating timezone" });
    try {
      await mutate(updateSchedule(schedule.id, { timeZone }), {
        optimisticUpdate: (schedules) =>
          schedules?.map((s) => (s.id === schedule.id ? { ...s, timeZone } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Timezone updated";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update timezone" });
      throw error;
    } finally {
      pop();
    }
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: (v) => apply(v.timeZone),
    validation: { timeZone: FormValidation.Required },
    initialValues: { timeZone: schedule.timeZone },
  });

  return (
    <Form
      navigationTitle="Edit Timezone"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Timezone" {...itemProps.timeZone}>
        {zones.map((z) => (
          <Form.Dropdown.Item key={z} value={z} title={z} />
        ))}
      </Form.Dropdown>
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
git add src/components/edit-timezone.tsx
git commit -m "Add EditTimezone form"
```

---

## Task 5: Rename form

**Files:**
- Create: `src/components/rename-schedule.tsx`

- [ ] **Step 1: Create the form component**

```tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, updateSchedule } from "@api/cal.com";

interface RenameScheduleProps {
  schedule: CalSchedule;
  mutate: MutatePromise<CalSchedule[] | undefined>;
}

interface Values {
  name: string;
}

export function RenameSchedule({ schedule, mutate }: RenameScheduleProps) {
  const { pop } = useNavigation();

  const apply = async (name: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming schedule" });
    try {
      await mutate(updateSchedule(schedule.id, { name }), {
        optimisticUpdate: (schedules) =>
          schedules?.map((s) => (s.id === schedule.id ? { ...s, name } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Schedule renamed";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to rename schedule" });
      throw error;
    } finally {
      pop();
    }
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: (v) => apply(v.name.trim()),
    validation: { name: FormValidation.Required },
    initialValues: { name: schedule.name },
  });

  return (
    <Form
      navigationTitle="Rename Schedule"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
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
git add src/components/rename-schedule.tsx
git commit -m "Add RenameSchedule form"
```

---

## Task 6: Edit Override form (handles both add and edit)

**Files:**
- Create: `src/components/edit-override.tsx`

- [ ] **Step 1: Create the form component**

```tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, CalScheduleOverride, updateSchedule } from "@api/cal.com";
import {
  fromIsoDate,
  TIME_SLOTS,
  toIsoDate,
  withOverrideUpserted,
} from "@/lib/schedule";

interface EditOverrideProps {
  schedule: CalSchedule;
  mutate: MutatePromise<CalSchedule[] | undefined>;
  /** When editing an existing override, pass its original date. Undefined means "add new". */
  existingDate?: string;
}

interface Values {
  date: Date | null;
  unavailable: boolean;
  startTime: string;
  endTime: string;
}

export function EditOverride({ schedule, mutate, existingDate }: EditOverrideProps) {
  const { pop } = useNavigation();
  const existing = existingDate
    ? schedule.overrides.find((o) => o.date === existingDate)
    : undefined;
  const isUnavailable = existing ? existing.startTime === existing.endTime : false;

  const initialValues: Values = {
    date: existing ? fromIsoDate(existing.date) : null,
    unavailable: isUnavailable,
    startTime: existing && !isUnavailable ? existing.startTime : "09:00",
    endTime: existing && !isUnavailable ? existing.endTime : "17:00",
  };

  const apply = async (values: Values) => {
    if (!values.date) return;
    if (!values.unavailable && values.endTime <= values.startTime) {
      await showToast({ style: Toast.Style.Failure, title: "End must be after start" });
      return;
    }
    const iso = toIsoDate(values.date);
    const override: CalScheduleOverride = values.unavailable
      ? { date: iso, startTime: "00:00", endTime: "00:00" }
      : { date: iso, startTime: values.startTime, endTime: values.endTime };

    let overrides = withOverrideUpserted(schedule, override);
    if (existingDate && existingDate !== iso) {
      // Date changed during edit — drop the old entry.
      overrides = overrides.filter((o) => o.date !== existingDate);
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: existingDate ? "Updating override" : "Adding override",
    });
    try {
      await mutate(updateSchedule(schedule.id, { overrides }), {
        optimisticUpdate: (schedules) =>
          schedules?.map((s) => (s.id === schedule.id ? { ...s, overrides } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = existingDate ? "Override updated" : "Override added";
    } catch (error) {
      await showFailureToast(error, {
        title: existingDate ? "Failed to update override" : "Failed to add override",
      });
      throw error;
    } finally {
      pop();
    }
  };

  const { itemProps, handleSubmit, values } = useForm<Values>({
    onSubmit: apply,
    validation: {
      date: (v) => (v ? undefined : "Date is required"),
    },
    initialValues,
  });

  return (
    <Form
      navigationTitle={existingDate ? "Edit Override" : "Add Override"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Date" type={Form.DatePicker.Type.Date} {...itemProps.date} />
      <Form.Checkbox label="Unavailable all day" {...itemProps.unavailable} />
      {!values.unavailable && (
        <>
          <Form.Dropdown title="Start" {...itemProps.startTime}>
            {TIME_SLOTS.map((t) => (
              <Form.Dropdown.Item key={t} value={t} title={t} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="End" {...itemProps.endTime}>
            {TIME_SLOTS.map((t) => (
              <Form.Dropdown.Item key={t} value={t} title={t} />
            ))}
          </Form.Dropdown>
        </>
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
git add src/components/edit-override.tsx
git commit -m "Add EditOverride form (add + edit)"
```

---

## Task 7: Edit Day Hours form (up to 3 ranges)

**Files:**
- Create: `src/components/edit-day-hours.tsx`

- [ ] **Step 1: Create the form component**

```tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, CalWeekday, updateSchedule } from "@api/cal.com";
import { DayRange, rangesForDay, TIME_SLOTS, withDayHoursReplaced } from "@/lib/schedule";

const MAX_RANGES = 3;
const NONE = "";

interface EditDayHoursProps {
  schedule: CalSchedule;
  day: CalWeekday;
  mutate: MutatePromise<CalSchedule[] | undefined>;
}

interface Values {
  start1: string;
  end1: string;
  start2: string;
  end2: string;
  start3: string;
  end3: string;
}

function initialValues(schedule: CalSchedule, day: CalWeekday): Values {
  const existing = rangesForDay(schedule, day);
  const pick = (i: number, k: keyof DayRange) => existing[i]?.[k] ?? NONE;
  return {
    start1: pick(0, "startTime"),
    end1: pick(0, "endTime"),
    start2: pick(1, "startTime"),
    end2: pick(1, "endTime"),
    start3: pick(2, "startTime"),
    end3: pick(2, "endTime"),
  };
}

function collectRanges(v: Values): { ranges: DayRange[]; error?: string } {
  const pairs: [string, string][] = [
    [v.start1, v.end1],
    [v.start2, v.end2],
    [v.start3, v.end3],
  ];
  const ranges: DayRange[] = [];
  for (const [s, e] of pairs) {
    const hasStart = s !== NONE;
    const hasEnd = e !== NONE;
    if (!hasStart && !hasEnd) continue;
    if (!hasStart || !hasEnd) return { ranges: [], error: "Each range needs both a start and an end" };
    if (e <= s) return { ranges: [], error: "End must be after start" };
    ranges.push({ startTime: s, endTime: e });
  }
  // Overlap check
  const sorted = [...ranges].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < sorted[i - 1].endTime) {
      return { ranges: [], error: "Ranges may not overlap" };
    }
  }
  return { ranges };
}

export function EditDayHours({ schedule, day, mutate }: EditDayHoursProps) {
  const { pop } = useNavigation();

  const apply = async (values: Values) => {
    const { ranges, error } = collectRanges(values);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: error });
      return;
    }
    const availability = withDayHoursReplaced(schedule, day, ranges);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${day}` });
    try {
      await mutate(updateSchedule(schedule.id, { availability }), {
        optimisticUpdate: (schedules) =>
          schedules?.map((s) => (s.id === schedule.id ? { ...s, availability } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = `${day} updated`;
    } catch (err) {
      await showFailureToast(err, { title: `Failed to update ${day}` });
      throw err;
    } finally {
      pop();
    }
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: apply,
    initialValues: initialValues(schedule, day),
  });

  const slotDropdown = (title: string, props: Form.ItemProps<string>, key: string) => (
    <Form.Dropdown title={title} {...props}>
      <Form.Dropdown.Item key={`${key}-none`} value={NONE} title="—" />
      {TIME_SLOTS.map((t) => (
        <Form.Dropdown.Item key={`${key}-${t}`} value={t} title={t} />
      ))}
    </Form.Dropdown>
  );

  return (
    <Form
      navigationTitle={`Edit ${day}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Ranges"
        text={`Up to ${MAX_RANGES} ranges per day. Leave both fields as "—" to skip a range. For more complex schedules, use the web UI.`}
      />
      {slotDropdown("Range 1 start", itemProps.start1, "s1")}
      {slotDropdown("Range 1 end", itemProps.end1, "e1")}
      {slotDropdown("Range 2 start", itemProps.start2, "s2")}
      {slotDropdown("Range 2 end", itemProps.end2, "e2")}
      {slotDropdown("Range 3 start", itemProps.start3, "s3")}
      {slotDropdown("Range 3 end", itemProps.end3, "e3")}
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
git add src/components/edit-day-hours.tsx
git commit -m "Add EditDayHours form (up to 3 ranges per day)"
```

---

## Task 8: Schedule Detail component

**Files:**
- Create: `src/components/schedule-detail.tsx`

- [ ] **Step 1: Create the sectioned-list component**

```tsx
import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { CalSchedule, updateSchedule } from "@api/cal.com";
import {
  formatDayRanges,
  formatOverrideDate,
  formatOverrideRange,
  rangesForDay,
  WEEKDAYS,
  withDayHoursReplaced,
  withOverrideRemoved,
} from "@/lib/schedule";
import { EditDayHours } from "@components/edit-day-hours";
import { EditOverride } from "@components/edit-override";
import { EditTimezone } from "@components/edit-timezone";
import { RenameSchedule } from "@components/rename-schedule";

interface ScheduleDetailProps {
  schedule: CalSchedule;
  mutate: MutatePromise<CalSchedule[] | undefined>;
}

export function ScheduleDetail({ schedule, mutate }: ScheduleDetailProps) {
  const handleClearDay = async (day: (typeof WEEKDAYS)[number]) => {
    const availability = withDayHoursReplaced(schedule, day, []);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Clearing ${day}` });
    try {
      await mutate(updateSchedule(schedule.id, { availability }), {
        optimisticUpdate: (schedules) =>
          schedules?.map((s) => (s.id === schedule.id ? { ...s, availability } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = `${day} cleared`;
    } catch (err) {
      await showFailureToast(err, { title: `Failed to clear ${day}` });
    }
  };

  const handleDeleteOverride = async (date: string) => {
    const confirmed = await confirmAlert({
      title: "Delete override?",
      message: formatOverrideDate(date),
      icon: { source: Icon.Trash, tintColor: Color.Red },
    });
    if (!confirmed) return;
    const overrides = withOverrideRemoved(schedule, date);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting override" });
    try {
      await mutate(updateSchedule(schedule.id, { overrides }), {
        optimisticUpdate: (schedules) =>
          schedules?.map((s) => (s.id === schedule.id ? { ...s, overrides } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Override deleted";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to delete override" });
    }
  };

  const handleSetAsDefault = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Setting as default" });
    try {
      await mutate(updateSchedule(schedule.id, { isDefault: true }), {
        optimisticUpdate: (schedules) =>
          schedules?.map((s) => ({ ...s, isDefault: s.id === schedule.id })),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Default schedule updated";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to set default" });
    }
  };

  const addOverrideAction = (
    <Action.Push
      title="Add Override"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<EditOverride schedule={schedule} mutate={mutate} />}
    />
  );

  return (
    <List navigationTitle={schedule.name}>
      <List.Section title="Working Hours">
        {WEEKDAYS.map((day) => {
          const ranges = rangesForDay(schedule, day);
          return (
            <List.Item
              key={day}
              icon={Icon.Calendar}
              title={day}
              accessories={[{ text: formatDayRanges(ranges) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Hours"
                    icon={Icon.Pencil}
                    target={<EditDayHours schedule={schedule} day={day} mutate={mutate} />}
                  />
                  {ranges.length > 0 && (
                    <Action
                      title="Clear Day"
                      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                      onAction={() => handleClearDay(day)}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Date Overrides">
        {schedule.overrides.map((o) => (
          <List.Item
            key={o.date}
            icon={Icon.CalendarBlank}
            title={formatOverrideDate(o.date)}
            accessories={[{ text: formatOverrideRange(o) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Override"
                  icon={Icon.Pencil}
                  target={
                    <EditOverride schedule={schedule} mutate={mutate} existingDate={o.date} />
                  }
                />
                <Action
                  title="Delete Override"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  onAction={() => handleDeleteOverride(o.date)}
                />
                {addOverrideAction}
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          icon={Icon.Plus}
          title="Add Override"
          actions={<ActionPanel>{addOverrideAction}</ActionPanel>}
        />
      </List.Section>

      <List.Section title="Settings">
        <List.Item
          icon={Icon.Globe}
          title="Timezone"
          accessories={[{ text: schedule.timeZone }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Timezone"
                icon={Icon.Pencil}
                target={<EditTimezone schedule={schedule} mutate={mutate} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Star}
          title="Default schedule"
          accessories={[{ text: schedule.isDefault ? "Yes" : "No" }]}
          actions={
            <ActionPanel>
              {!schedule.isDefault && (
                <Action title="Set as Default" icon={Icon.Star} onAction={handleSetAsDefault} />
              )}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Tag}
          title="Name"
          accessories={[{ text: schedule.name }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Rename"
                icon={Icon.Pencil}
                target={<RenameSchedule schedule={schedule} mutate={mutate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
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
git add src/components/schedule-detail.tsx
git commit -m "Add ScheduleDetail sectioned list (working hours, overrides, settings)"
```

---

## Task 9: Top-level View Availability command

**Files:**
- Modify: `src/view-availability.tsx` (replaces the Task-3 stub)

- [ ] **Step 1: Replace the stub**

Overwrite `src/view-availability.tsx` with:

```tsx
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { CalSchedule, updateSchedule, useSchedules } from "@api/cal.com";
import { ScheduleDetail } from "@components/schedule-detail";
import { formatDayRanges, rangesForDay, WEEKDAYS } from "@/lib/schedule";

export default function ViewAvailability() {
  const { data: schedules, isLoading, error, mutate } = useSchedules();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("availability-show-details", false);

  const handleSetAsDefault = async (schedule: CalSchedule) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Setting as default" });
    try {
      await mutate(updateSchedule(schedule.id, { isDefault: true }), {
        optimisticUpdate: (list) =>
          list?.map((s) => ({ ...s, isDefault: s.id === schedule.id })),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Default schedule updated";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to set default" });
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {error && (
        <List.EmptyView
          title="Unable to load schedules"
          description="Check your API key"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {schedules?.map((schedule) => (
        <List.Item
          key={schedule.id}
          icon={schedule.isDefault ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Calendar}
          title={schedule.name}
          accessories={
            isShowingDetail
              ? []
              : [
                  { text: schedule.timeZone },
                  ...(schedule.isDefault
                    ? [{ tag: { value: "Default", color: Color.Yellow } }]
                    : []),
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={schedule.name} />
                  <List.Item.Detail.Metadata.Label title="Timezone" text={schedule.timeZone} />
                  <List.Item.Detail.Metadata.Label
                    title="Default"
                    text={schedule.isDefault ? "Yes" : "No"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  {WEEKDAYS.map((day) => (
                    <List.Item.Detail.Metadata.Label
                      key={day}
                      title={day}
                      text={formatDayRanges(rangesForDay(schedule, day))}
                    />
                  ))}
                  {schedule.overrides.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Overrides"
                        text={`${schedule.overrides.length}`}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Schedule"
                icon={Icon.Eye}
                target={<ScheduleDetail schedule={schedule} mutate={mutate} />}
              />
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              {!schedule.isDefault && (
                <Action
                  title="Set as Default"
                  icon={Icon.Star}
                  onAction={() => handleSetAsDefault(schedule)}
                />
              )}
              <Action.OpenInBrowser
                title="Open Availability in Browser"
                url="https://app.cal.com/availability"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
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

Expected: all three exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/view-availability.tsx
git commit -m "Implement View Availability top-level command"
```

---

## Task 10: Update CHANGELOG and README

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Add a changelog entry at the top of `CHANGELOG.md`**

Insert (above the existing "Fix: Migrate to Cal.com API v2" entry):

```markdown
## [Add: View and manage availability schedules] - {PR_MERGE_DATE}

- Adds a new "View Availability" command
- List all schedules; each shows working hours, timezone, and default status
- Edit working hours per day (up to 3 time ranges)
- Add, edit, and delete date overrides (including full-day "Unavailable")
- Change a schedule's timezone or name
- Set any schedule as the default
```

- [ ] **Step 2: Update `README.md` to mention the new capability**

Replace the opening paragraph (`# Cal.com Share Meeting Links` heading and the first paragraph) with:

```markdown
# Cal.com Share Meeting Links

Quickly share your Cal.com meeting links, generate private links, view and cancel bookings, and view and manage your availability schedules.
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md README.md
git commit -m "Document availability management in CHANGELOG and README"
```

---

## Task 11: Manual QA against a real Cal.com account

- [ ] **Step 1: Run the extension in dev mode**

```bash
npx ray develop
```

Open Raycast and invoke the "View Availability" command.

- [ ] **Step 2: Verify the list view**

- All of your schedules appear, each with its timezone and a "Default" tag on exactly one
- Toggle details (⌘D) — each schedule's detail pane shows name/timezone/default/Mon–Sun hours/override count

- [ ] **Step 3: Verify the schedule detail view**

Press Enter on a schedule. Confirm:
- Three sections render: Working Hours (7 rows Mon–Sun), Date Overrides, Settings (Timezone, Default, Name)
- Days with no hours show "Unavailable"
- Days with multiple ranges show them comma-separated

- [ ] **Step 4: Verify working-hours edits**

On a weekday row, pick "Edit Hours", change Range 1 end to a different time, Save. Confirm:
- Toast shows "…updated"
- Detail row shows the new value immediately
- Re-open the form — new value is pre-filled

Also verify:
- Adding a Range 2 works (non-overlapping)
- Overlapping ranges show a validation error toast
- "Clear Day" empties a day (shows "Unavailable")

- [ ] **Step 5: Verify overrides**

- "Add Override": pick a future date, set hours, Save. Row appears sorted by date.
- Re-open Edit Override: existing values pre-fill. Change date → old entry removed, new entry appears.
- Mark "Unavailable all day": row shows "Unavailable".
- "Delete Override": confirm alert dismisses; row disappears.

- [ ] **Step 6: Verify timezone and name edits**

- Edit Timezone: dropdown lists many IANA zones; changing and saving updates the Settings row and the list accessory.
- Rename: trimmed name is saved and reflected.

- [ ] **Step 7: Verify "Set as Default"**

- On a non-default schedule, "Set as Default" moves the Default badge to this schedule.
- Confirm with `GET /v2/schedules` (via the extension — reload by re-running the command) that exactly one schedule has `isDefault: true`. If the previous default still shows `isDefault: true`, Cal.com did *not* auto-demote; open a follow-up task to fix by chaining a `updateSchedule(prevDefault.id, { isDefault: false })` call (see spec open question #1).

- [ ] **Step 8: Verify "Unavailable" override encoding**

- Add an override marked "Unavailable all day" and save.
- If the API rejects `startTime === endTime === "00:00"`, the mutation will fail with an error toast. In that case, open a follow-up task to document the limitation and disable the "Unavailable" checkbox (see spec open question #2).

- [ ] **Step 9: Final build and lint**

```bash
npx ray lint
npx ray build -e dist
```

Expected: both exit 0.

- [ ] **Step 10: Commit any follow-up fixes**

If steps 7 or 8 surfaced issues, apply the fallback described in the spec and commit with a clear message referencing the verified behavior.

---

## Done criteria

- All 11 tasks complete, each with its own commit
- `ray lint` and `ray build -e dist` pass on the final commit
- Every capability listed in the spec's "Goal" section works end-to-end against a real Cal.com account
- CHANGELOG and README updated
- Spec open questions (isDefault auto-demote, unavailable encoding) either resolved or captured as explicit follow-ups
