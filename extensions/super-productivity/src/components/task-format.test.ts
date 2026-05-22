import { describe, expect, it } from "vitest";
import {
  formatDateValue,
  formatTaskTiming,
  getTaskStateLabel,
  shouldCloseWindowAfterDoneToggle,
} from "./task-format";
import { SpTask } from "../lib/sp-models";

const task = (overrides: Partial<SpTask>): SpTask => ({
  id: "task-1",
  title: "Task",
  isDone: false,
  tagIds: [],
  subTaskIds: [],
  timeEstimate: 0,
  timeSpent: 0,
  ...overrides,
});

describe("task-format", () => {
  it("formats millisecond durations as compact task timing text", () => {
    expect(
      formatTaskTiming(
        task({ timeEstimate: 90 * 60000, timeSpent: 45 * 60000 }),
      ),
    ).toEqual({ estimate: "1h 30m", spent: "45m" });
  });

  it("omits empty timing values", () => {
    expect(formatTaskTiming(task({ timeEstimate: 0, timeSpent: 0 }))).toEqual({
      estimate: null,
      spent: null,
    });
  });

  it("formats due-day strings and timestamps as date values", () => {
    expect(formatDateValue("2026-05-19")?.toISOString()).toBe(
      "2026-05-19T00:00:00.000Z",
    );
    expect(formatDateValue(Date.UTC(2026, 4, 18, 9))?.toISOString()).toBe(
      "2026-05-18T09:00:00.000Z",
    );
    expect(formatDateValue(null)).toBeNull();
  });

  it("labels current, completed, subtask, and active task states", () => {
    expect(getTaskStateLabel(task({ id: "current" }), "current")).toBe(
      "Current",
    );
    expect(getTaskStateLabel(task({ isDone: true }), null)).toBe("Done");
    expect(getTaskStateLabel(task({ parentId: "parent-1" }), null)).toBe(
      "Subtask",
    );
    expect(getTaskStateLabel(task({}), null)).toBe("Active");
  });

  it("closes the Raycast window only when a task is newly completed", () => {
    expect(shouldCloseWindowAfterDoneToggle(false)).toBe(true);
    expect(shouldCloseWindowAfterDoneToggle(true)).toBe(false);
  });
});
