import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";
import {
  busyCalSortTimestamp,
  busyCalDateURL,
  busyCalDateURLForDateString,
  formatAvailabilityDateTime,
  formatOccurrence,
  withOccurrenceSeconds,
} from "../src/busycal-date";
import { BusyCalItem } from "../src/types";

const execFileAsync = promisify(execFile);
const appleReferenceEpochMs = Date.UTC(2001, 0, 1, 0, 0, 0, 0);

function makeItem(overrides: Partial<BusyCalItem> = {}): BusyCalItem {
  return {
    id: "series+0",
    title: "Sample",
    type: "event",
    calendarID: "calendar-id",
    seriesUID: "series",
    isFloating: false,
    ...overrides,
  };
}

function occurrenceSecondsFor(date: Date): number {
  return Math.floor((date.getTime() - appleReferenceEpochMs) / 1000);
}

test("withOccurrenceSeconds reads encoded seconds from BusyCal item ids", () => {
  const item = withOccurrenceSeconds(
    makeItem({
      id: "ABC-123+3600",
    }),
  );

  assert.equal(item.occurrenceSeconds, 3600);
});

test("busyCalDateURL falls back to the first available date field", () => {
  const url = busyCalDateURL(
    makeItem({
      id: "plain-id",
      occurrenceSeconds: undefined,
      startDate: "2026-03-19T08:00:00Z",
    }),
  );

  assert.equal(url, "busycalevent://date/2026-03-19");
});

test("busyCalDateURLForDateString returns undefined for invalid input", () => {
  assert.equal(busyCalDateURLForDateString("not-a-date"), undefined);
});

test("busyCalDateURLForDateString preserves an all-day BusyCal date string", () => {
  assert.equal(
    busyCalDateURLForDateString("2026-03-19"),
    "busycalevent://date/2026-03-19",
  );
});

test("busyCalDateURLForDateString preserves all-day dates in negative time zones", async () => {
  const { stdout } = await execFileAsync(
    "node",
    [
      "--import",
      "tsx",
      "-e",
      'const mod = require("./src/busycal-date.ts"); console.log(mod.busyCalDateURLForDateString("2026-03-19") ?? "");',
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TZ: "America/Los_Angeles",
      },
    },
  );

  assert.equal(stdout.trim(), "busycalevent://date/2026-03-19");
});

test("formatOccurrence formats fallback date strings", () => {
  const startDate = new Date(2026, 2, 19, 12, 0, 0);
  const formatted = formatOccurrence(
    makeItem({
      id: "plain-id",
      occurrenceSeconds: undefined,
      startDate: startDate.toISOString(),
    }),
  );

  const expected = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startDate);

  assert.equal(formatted, expected);
});

test("formatAvailabilityDateTime renders local user-facing time instead of raw ISO", () => {
  const slotDate = new Date(Date.UTC(2026, 2, 19, 16, 49, 51));
  const formatted = formatAvailabilityDateTime(slotDate.toISOString());

  const expected = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(slotDate);

  assert.equal(formatted, expected);
});

test("formatOccurrence preserves the BusyCal day for all-day fallback dates", () => {
  const formatted = formatOccurrence(
    makeItem({
      id: "plain-id",
      occurrenceSeconds: undefined,
      type: "task",
      dueDate: "2026-03-19",
    }),
  );

  const expected = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(2026, 2, 19));

  assert.equal(formatted, expected);
});

test("formatOccurrence shows the time for timed tasks", () => {
  const dueDate = new Date(2026, 2, 20, 14, 0, 0);
  const occurrenceSeconds = occurrenceSecondsFor(dueDate);
  const formatted = formatOccurrence(
    makeItem({
      id: `task-series+${occurrenceSeconds}`,
      type: "task",
      dueDate: dueDate.toISOString(),
      occurrenceSeconds,
    }),
  );

  const expected = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dueDate);

  assert.equal(formatted, expected);
});

test("formatOccurrence shows the time for timed task fallback dates", () => {
  const dueDate = new Date(2026, 2, 20, 14, 0, 0);
  const formatted = formatOccurrence(
    makeItem({
      id: "plain-task-id",
      type: "task",
      dueDate: dueDate.toISOString(),
      occurrenceSeconds: undefined,
    }),
  );

  const expected = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dueDate);

  assert.equal(formatted, expected);
});

test("formatOccurrence preserves all-day task dates in negative time zones", async () => {
  const { stdout } = await execFileAsync(
    "node",
    [
      "--import",
      "tsx",
      "-e",
      [
        'const mod = require("./src/busycal-date.ts");',
        "const item = {",
        '  id: "plain-id",',
        '  title: "All Day",',
        '  type: "task",',
        '  calendarID: "calendar-id",',
        '  seriesUID: "series",',
        '  dueDate: "2026-03-19",',
        "  isFloating: false,",
        "};",
        "const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(2026, 2, 19));",
        'console.log(JSON.stringify({ actual: mod.formatOccurrence(item) ?? "", expected }));',
      ].join(" "),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TZ: "America/Los_Angeles",
      },
    },
  );

  const { actual, expected } = JSON.parse(stdout.trim()) as {
    actual: string;
    expected: string;
  };

  assert.equal(actual, expected);
});

test("formatOccurrence preserves floating wall-clock time in Dubai", async () => {
  const { stdout } = await execFileAsync(
    "node",
    [
      "--import",
      "tsx",
      "-e",
      [
        'const mod = require("./src/busycal-date.ts");',
        "const appleReferenceEpochMs = Date.UTC(2001, 0, 1, 0, 0, 0, 0);",
        "const absoluteDate = new Date(Date.UTC(2026, 2, 20, 15, 0, 0));",
        "const occurrenceSeconds = Math.floor((absoluteDate.getTime() - appleReferenceEpochMs) / 1000);",
        "const item = {",
        "  id: `floating-series+${occurrenceSeconds}`,",
        '  title: "Floating event",',
        '  type: "event",',
        '  calendarID: "calendar-id",',
        '  startDate: "2026-03-20T15:00:00Z",',
        '  seriesUID: "series",',
        "  occurrenceSeconds,",
        "  isFloating: true,",
        "};",
        "const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(2026, 2, 20, 15, 0, 0));",
        'console.log(JSON.stringify({ actual: mod.formatOccurrence(item) ?? "", expected }));',
      ].join(" "),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TZ: "Asia/Dubai",
      },
    },
  );

  const { actual, expected } = JSON.parse(stdout.trim()) as {
    actual: string;
    expected: string;
  };

  assert.equal(actual, expected);
});

test("formatOccurrence prefers the task due date over mixed-query start dates", () => {
  const displayedDueDate = new Date(2026, 2, 20, 14, 0, 0);
  const occurrenceSeconds = occurrenceSecondsFor(displayedDueDate);
  const formatted = formatOccurrence(
    makeItem({
      id: `floating-task+${occurrenceSeconds}`,
      title: "Floating task",
      type: "task",
      startDate: "2026-03-20T10:00:00Z",
      dueDate: "2026-03-20T14:00:00Z",
      occurrenceDate: "2026-03-20T14:00:00Z",
      occurrenceSeconds,
      isFloating: true,
    }),
  );

  const expected = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(displayedDueDate);

  assert.equal(formatted, expected);
});

test("busyCalSortTimestamp falls back to timed task due dates", () => {
  const timedTask = makeItem({
    id: "plain-task-id",
    title: "Timed task",
    type: "task",
    dueDate: new Date(2026, 2, 20, 14, 0, 0).toISOString(),
    occurrenceSeconds: undefined,
  });
  const laterEvent = makeItem({
    id: "later-event+0",
    title: "Later event",
    type: "event",
    startDate: new Date(2026, 2, 20, 18, 0, 0).toISOString(),
    occurrenceSeconds: undefined,
  });

  const sortedItems = [laterEvent, timedTask].sort(
    (left, right) =>
      (busyCalSortTimestamp(left) ?? Number.MAX_SAFE_INTEGER) -
      (busyCalSortTimestamp(right) ?? Number.MAX_SAFE_INTEGER),
  );

  assert.equal(sortedItems[0]?.id, timedTask.id);
});
