import { describe, expect, test } from "vitest";

import { selectNext7Days, selectToday } from "./taskSections";
import type { SelectionContext } from "./viewQuery";
import { taskFixture } from "../test/fixtures/tasks";

const denverContext: SelectionContext = {
  now: new Date("2026-08-14T18:00:00.000Z"),
  timeZone: "America/Denver",
};

describe("selectToday", () => {
  test("excludes undated and completed tasks while including due-only and start-only tasks", () => {
    const sections = selectToday(
      [
        taskFixture({ id: "undated" }),
        taskFixture({ id: "due-only", dueDate: "2026-08-14T12:00:00-06:00" }),
        taskFixture({ id: "start-only", startDate: "2026-08-14T13:00:00-06:00" }),
        taskFixture({ id: "completed", status: "completed", dueDate: "2026-08-14T14:00:00-06:00" }),
      ],
      denverContext
    );

    expect(sections).toEqual([
      {
        id: "today",
        title: "Today",
        tasks: [expect.objectContaining({ id: "due-only" }), expect.objectContaining({ id: "start-only" })],
      },
    ]);
  });

  test("separates terminally overdue tasks but keeps an interval touching today under Today only", () => {
    const sections = selectToday(
      [
        taskFixture({
          id: "terminal-overdue",
          startDate: "2026-08-12T09:00:00-06:00",
          dueDate: "2026-08-13T23:59:59-06:00",
        }),
        taskFixture({
          id: "spans-today",
          startDate: "2026-08-13T09:00:00-06:00",
          dueDate: "2026-08-14T15:00:00-06:00",
        }),
        taskFixture({
          id: "touches-today-start",
          startDate: "2026-08-13T09:00:00-06:00",
          dueDate: "2026-08-14T00:00:00-06:00",
        }),
      ],
      denverContext
    );

    expect(sections.map((section) => [section.id, section.tasks.map((task) => task.id)])).toEqual([
      ["overdue", ["terminal-overdue"]],
      ["today", ["spans-today", "touches-today-start"]],
    ]);
  });

  test("preserves source calendar dates for all-day and floating tasks but converts bound instants", () => {
    const sections = selectToday(
      [
        taskFixture({
          id: "tokyo-all-day",
          dueDate: "2026-08-13T15:00:00+0000",
          isAllDay: true,
          timeZone: "Asia/Tokyo",
        }),
        taskFixture({
          id: "tokyo-floating",
          dueDate: "2026-08-14T00:30:00.000Z",
          isFloating: true,
          timeZone: "Asia/Tokyo",
        }),
        taskFixture({
          id: "bound-late-denver",
          dueDate: "2026-08-15T05:30:00.000Z",
          timeZone: "UTC",
        }),
        taskFixture({
          id: "same-instant-bound",
          dueDate: "2026-08-14T00:30:00.000Z",
          timeZone: "Asia/Tokyo",
        }),
      ],
      denverContext
    );

    expect(sections.map((section) => [section.id, section.tasks.map((task) => task.id)])).toEqual([
      ["overdue", ["same-instant-bound"]],
      ["today", ["tokyo-all-day", "tokyo-floating", "bound-late-denver"]],
    ]);
  });

  test("uses the 23-hour America/Denver spring-forward day", () => {
    const context = { now: new Date("2026-03-08T18:00:00.000Z"), timeZone: "America/Denver" };
    const sections = selectToday(
      [
        taskFixture({ id: "before", dueDate: "2026-03-08T06:59:59.999Z" }),
        taskFixture({ id: "at-start", dueDate: "2026-03-08T07:00:00.000Z" }),
        taskFixture({ id: "at-last-instant", dueDate: "2026-03-09T05:59:59.999Z" }),
        taskFixture({ id: "at-next-start", dueDate: "2026-03-09T06:00:00.000Z" }),
      ],
      context
    );

    expect(sections.map((section) => [section.id, section.tasks.map((task) => task.id)])).toEqual([
      ["overdue", ["before"]],
      ["today", ["at-start", "at-last-instant"]],
    ]);
  });

  test("uses the 25-hour America/Denver fall-back day and includes both repeated hours", () => {
    const context = { now: new Date("2026-11-01T19:00:00.000Z"), timeZone: "America/Denver" };
    const sections = selectToday(
      [
        taskFixture({ id: "at-start", dueDate: "2026-11-01T06:00:00.000Z" }),
        taskFixture({ id: "first-0130", dueDate: "2026-11-01T07:30:00.000Z" }),
        taskFixture({ id: "second-0130", dueDate: "2026-11-01T08:30:00.000Z" }),
        taskFixture({ id: "at-last-instant", dueDate: "2026-11-02T06:59:59.999Z" }),
        taskFixture({ id: "at-next-start", dueDate: "2026-11-02T07:00:00.000Z" }),
      ],
      context
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].tasks.map((task) => task.id)).toEqual([
      "at-start",
      "first-0130",
      "second-0130",
      "at-last-instant",
    ]);
  });
});

describe("selectNext7Days", () => {
  test("covers local day zero through six, excludes overdue-only/day-seven/undated tasks, and groups once", () => {
    const dayTasks = Array.from({ length: 7 }, (_, day) =>
      taskFixture({
        id: `day-${day}`,
        dueDate: `2026-08-${String(14 + day).padStart(2, "0")}T12:00:00-06:00`,
      })
    );
    const sections = selectNext7Days(
      [
        taskFixture({ id: "undated" }),
        taskFixture({ id: "overdue", dueDate: "2026-08-13T12:00:00-06:00" }),
        ...dayTasks,
        taskFixture({
          id: "completed-in-window",
          status: "completed",
          dueDate: "2026-08-17T12:00:00-06:00",
        }),
        taskFixture({ id: "day-7", dueDate: "2026-08-21T00:00:00-06:00" }),
        taskFixture({
          id: "spanning",
          startDate: "2026-08-12T12:00:00-06:00",
          dueDate: "2026-08-16T12:00:00-06:00",
        }),
      ],
      denverContext
    );

    expect(sections.map((section) => section.id)).toEqual([
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
    ]);
    expect(sections[0]).toMatchObject({ title: "Today" });
    expect(sections.map((section) => section.tasks.map((task) => task.id))).toEqual([
      ["day-0", "spanning"],
      ["day-1"],
      ["day-2"],
      ["day-3"],
      ["day-4"],
      ["day-5"],
      ["day-6"],
    ]);
    expect(sections.flatMap((section) => section.tasks).filter((task) => task.id === "spanning")).toHaveLength(1);
  });

  test("places a point exactly at midnight in the new local day using half-open boundaries", () => {
    const sections = selectNext7Days(
      [taskFixture({ id: "midnight-day-one", dueDate: "2026-08-15T00:00:00-06:00" })],
      denverContext
    );

    expect(sections.map((section) => [section.id, section.tasks.map((task) => task.id)])).toEqual([
      ["2026-08-15", ["midnight-day-one"]],
    ]);
  });
});
