import { describe, expect, it } from "vitest";
import type { DueValue, Task } from "../../src/shared/domain/model";
import {
  queryAllTasks,
  queryCompleted,
  queryLabel,
  queryProject,
  queryToday,
  queryTrash,
  queryThisWeek,
  startOfCalendarDate,
  todayWindow,
} from "../../src/shared/domain/queries";

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function task(
  index: number,
  due: DueValue,
  options: Partial<
    Pick<Task, "priority" | "position" | "createdAtMs" | "completedAtMs" | "trashedAtMs" | "projectId" | "labelIds">
  > = {},
): Task {
  return {
    id: id(index),
    title: `Task ${index}`,
    notes: "",
    priority: options.priority ?? false,
    position: options.position ?? 1_024,
    projectId: options.projectId ?? null,
    labelIds: options.labelIds ?? [],
    due,
    createdAtMs: options.createdAtMs ?? 1_000,
    updatedAtMs: 1_000,
    completedAtMs: options.completedAtMs ?? null,
    trashedAtMs: options.trashedAtMs ?? null,
  };
}

describe("task queries", () => {
  it("returns every active task in due-date order with undated tasks last", () => {
    const projectId = id(100);
    const tasks = [
      task(1, { kind: "none" }, { priority: true }),
      task(2, { kind: "allDay", date: "2026-10-04" }, { projectId, priority: false }),
      task(3, { kind: "allDay", date: "2026-10-04" }, { projectId, priority: true }),
      task(4, { kind: "timed", instantMs: Date.parse("2026-10-04T01:00:00.000Z"), timeZone: "UTC" }),
      task(5, { kind: "none" }, { projectId, priority: false }),
      task(6, { kind: "allDay", date: "2026-10-03" }, { completedAtMs: 2_000 }),
      task(7, { kind: "allDay", date: "2026-10-03" }, { trashedAtMs: 2_000 }),
    ];

    expect(queryAllTasks(tasks, "Australia/Melbourne").map((value) => value.id)).toEqual([
      id(2),
      id(3),
      id(4),
      id(1),
      id(5),
    ]);
  });

  it("sorts all-day dates against timed instants in the viewer timezone", () => {
    const allDay = task(1, { kind: "allDay", date: "2026-10-04" });
    const timed = task(2, {
      kind: "timed",
      instantMs: Date.parse("2026-10-03T20:00:00.000Z"),
      timeZone: "UTC",
    });

    expect(queryAllTasks([timed, allDay], "Australia/Melbourne").map((value) => value.id)).toEqual([id(1), id(2)]);
    expect(queryAllTasks([timed, allDay], "America/Los_Angeles").map((value) => value.id)).toEqual([id(2), id(1)]);
  });

  it("uses exact 23-hour and 25-hour Melbourne calendar boundaries", () => {
    expect(todayWindow(Date.parse("2026-10-04T01:00:00.000Z"), "Australia/Melbourne")).toEqual({
      localDate: "2026-10-04",
      startOfDayMs: Date.parse("2026-10-03T14:00:00.000Z"),
      startOfNextDayMs: Date.parse("2026-10-04T13:00:00.000Z"),
    });
    expect(todayWindow(Date.parse("2026-04-05T01:00:00.000Z"), "Australia/Melbourne")).toEqual({
      localDate: "2026-04-05",
      startOfDayMs: Date.parse("2026-04-04T13:00:00.000Z"),
      startOfNextDayMs: Date.parse("2026-04-05T14:00:00.000Z"),
    });
    expect(startOfCalendarDate("0001-01-01", "UTC")).toBe(-62_135_596_800_000);
    for (const timeZone of ["Australia/Melbourne", "Pacific/Kiritimati", "America/Los_Angeles"]) {
      expect(Math.abs(startOfCalendarDate("0001-01-01", timeZone) + 62_135_596_800_000)).toBeLessThan(86_400_000);
    }
  });

  it("reproduces the approved Today boundary and lifecycle truth table", () => {
    const tasks = [
      task(1, { kind: "none" }),
      task(2, { kind: "allDay", date: "2026-10-03" }),
      task(3, { kind: "allDay", date: "2026-10-04" }),
      task(4, { kind: "allDay", date: "2026-10-05" }),
      task(5, { kind: "timed", instantMs: Date.parse("2026-10-03T13:59:59.999Z"), timeZone: "UTC" }),
      task(6, { kind: "timed", instantMs: Date.parse("2026-10-03T14:00:00.000Z"), timeZone: "UTC" }),
      task(7, { kind: "timed", instantMs: Date.parse("2026-10-04T12:59:59.999Z"), timeZone: "UTC" }),
      task(8, { kind: "timed", instantMs: Date.parse("2026-10-04T13:00:00.000Z"), timeZone: "UTC" }),
      task(9, { kind: "allDay", date: "2026-10-04" }, { completedAtMs: 1_000 }),
      task(10, { kind: "allDay", date: "2026-10-04" }, { trashedAtMs: 1_000 }),
    ];
    const result = queryToday(tasks, Date.parse("2026-10-04T01:00:00.000Z"), "Australia/Melbourne");
    expect(result.count).toBe(5);
    expect(result.tasks.map(({ task: value, status }) => [value.id, status])).toEqual([
      [id(2), "overdue"],
      [id(5), "overdue"],
      [id(3), "dueToday"],
      [id(6), "dueToday"],
      [id(7), "dueToday"],
    ]);
  });

  it("preserves all-day calendar meaning while timed classification follows the viewer timezone", () => {
    const allDay = task(1, { kind: "allDay", date: "2026-10-04" });
    const timed = task(2, {
      kind: "timed",
      instantMs: Date.parse("2026-10-05T10:00:00.000Z"),
      timeZone: "Australia/Melbourne",
    });
    const evaluation = Date.parse("2026-10-04T16:00:00.000Z");
    expect(queryToday([allDay, timed], evaluation, "Australia/Melbourne").tasks.map(({ task }) => task.id)).toEqual([
      id(1),
      id(2),
    ]);
    expect(queryToday([allDay, timed], evaluation, "America/Los_Angeles").tasks.map(({ task }) => task.id)).toEqual([
      id(1),
    ]);
  });

  it("applies due and ordinary tie-break ordering without using priority", () => {
    const priorities = [true, false, true, false];
    const tasks = priorities.map((priority, index) =>
      task(index + 1, { kind: "allDay", date: "2026-10-04" }, { priority, position: 1_024, createdAtMs: 1_000 }),
    );
    tasks.push(
      task(
        5,
        { kind: "timed", instantMs: Date.parse("2026-10-03T15:00:00.000Z"), timeZone: "UTC" },
        { priority: true },
      ),
      task(6, { kind: "allDay", date: "2026-10-03" }, { priority: false }),
    );
    const result = queryToday(tasks, Date.parse("2026-10-04T01:00:00.000Z"), "Australia/Melbourne");
    expect(result.tasks.map(({ task }) => task.id)).toEqual([id(6), id(1), id(2), id(3), id(4), id(5)]);
    expect(startOfCalendarDate("2026-10-04", "Australia/Melbourne")).toBe(Date.parse("2026-10-03T14:00:00.000Z"));
  });

  it("returns active tasks through Sunday with status and stable due ordering", () => {
    const tasks = [
      task(1, { kind: "none" }),
      task(2, { kind: "allDay", date: "2026-10-04" }),
      task(3, { kind: "allDay", date: "2026-10-05" }, { priority: false }),
      task(4, { kind: "allDay", date: "2026-10-05" }, { priority: true }),
      task(5, { kind: "timed", instantMs: Date.parse("2026-10-04T12:59:59.999Z"), timeZone: "UTC" }),
      task(6, { kind: "timed", instantMs: Date.parse("2026-10-04T13:00:00.000Z"), timeZone: "UTC" }),
      task(7, { kind: "timed", instantMs: Date.parse("2026-10-04T15:00:00.000Z"), timeZone: "UTC" }),
      task(8, { kind: "allDay", date: "2026-10-11" }),
      task(9, { kind: "allDay", date: "2026-10-05" }, { completedAtMs: 1_000 }),
      task(10, { kind: "allDay", date: "2026-10-05" }, { trashedAtMs: 1_000 }),
      task(11, { kind: "allDay", date: "2026-10-12" }),
    ];
    const result = queryThisWeek(tasks, Date.parse("2026-10-04T13:00:00.000Z"), "Australia/Melbourne");

    expect(result).toMatchObject({ count: 7, localDate: "2026-10-05", endOfWeekDate: "2026-10-11" });
    expect(result.tasks.map(({ task: value, status, localDate }) => [value.id, status, localDate])).toEqual([
      [id(2), "overdue", "2026-10-04"],
      [id(5), "overdue", "2026-10-04"],
      [id(3), "dueToday", "2026-10-05"],
      [id(4), "dueToday", "2026-10-05"],
      [id(6), "dueToday", "2026-10-05"],
      [id(7), "dueToday", "2026-10-05"],
      [id(8), "laterThisWeek", "2026-10-11"],
    ]);
  });

  it("bounds This week in the viewer timezone without changing all-day dates", () => {
    const allDay = task(1, { kind: "allDay", date: "2026-10-12" });
    const timed = task(2, {
      kind: "timed",
      instantMs: Date.parse("2026-10-12T10:00:00.000Z"),
      timeZone: "Australia/Melbourne",
    });
    const evaluation = Date.parse("2026-10-11T16:00:00.000Z");

    expect(queryThisWeek([allDay, timed], evaluation, "Australia/Melbourne").tasks.map(({ task }) => task.id)).toEqual([
      id(1),
      id(2),
    ]);
    expect(queryThisWeek([allDay, timed], evaluation, "America/Los_Angeles").tasks).toEqual([]);
  });

  it("ends This week on the viewer's Sunday", () => {
    const sunday = task(1, { kind: "allDay", date: "2026-10-11" });
    const monday = task(2, { kind: "allDay", date: "2026-10-12" });

    expect(
      queryThisWeek([sunday, monday], Date.parse("2026-10-11T01:00:00.000Z"), "Australia/Melbourne").tasks.map(
        ({ task }) => task.id,
      ),
    ).toEqual([id(1)]);
  });

  it("returns active incomplete project and label tasks in canonical ordinary order", () => {
    const projectId = id(100);
    const labelId = id(101);
    const otherProjectId = id(102);
    const tasks = [
      task(1, { kind: "none" }, { projectId, priority: true, position: 1_024 }),
      task(2, { kind: "none" }, { projectId, labelIds: [labelId], priority: false, position: 2_048 }),
      task(3, { kind: "none" }, { projectId, labelIds: [labelId], priority: true, position: 1_024 }),
      task(4, { kind: "none" }, { projectId, labelIds: [labelId], completedAtMs: 2_000 }),
      task(5, { kind: "none" }, { projectId, trashedAtMs: 2_000 }),
      task(6, { kind: "none" }, { projectId: otherProjectId, labelIds: [labelId] }),
      task(7, { kind: "none" }),
    ];

    expect(queryProject(tasks, projectId).map((value) => value.id)).toEqual([id(1), id(3), id(2)]);
    expect(queryLabel(tasks, labelId).map((value) => value.id)).toEqual([id(3), id(6), id(2)]);
  });

  it("separates completed and trashed tasks while preserving ordinary ordering", () => {
    const tasks = [
      task(1, { kind: "none" }),
      task(2, { kind: "none" }, { completedAtMs: 2_000, priority: false }),
      task(3, { kind: "none" }, { completedAtMs: 2_000, priority: true, position: 2_048 }),
      task(4, { kind: "none" }, { trashedAtMs: 2_000, priority: true }),
      task(5, { kind: "none" }, { completedAtMs: 2_000, trashedAtMs: 3_000 }),
    ];

    expect(queryCompleted(tasks).map((value) => value.id)).toEqual([id(2), id(3)]);
    expect(queryTrash(tasks).map((value) => value.id)).toEqual([id(4), id(5)]);
  });
});
