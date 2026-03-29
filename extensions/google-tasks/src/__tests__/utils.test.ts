import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isCompleted, getChildren, getIdNames, getIcon } from "../utils";
import { Task } from "../types";

// Helper to create a task with defaults
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1",
    title: "Test Task",
    status: "needsAction",
    ...overrides,
  };
}

describe("isCompleted", () => {
  it("returns true for a completed task", () => {
    const task = makeTask({ status: "completed" });
    expect(isCompleted(task)).toBe(true);
  });

  it("returns false for an open task", () => {
    const task = makeTask({ status: "needsAction" });
    expect(isCompleted(task)).toBe(false);
  });

  it("returns false for any non-completed status", () => {
    const task = makeTask({ status: "unknown" });
    expect(isCompleted(task)).toBe(false);
  });
});

describe("getChildren", () => {
  it("returns children whose parent matches the given task id", () => {
    const parent = makeTask({ id: "parent-1" });
    const child1 = makeTask({ id: "child-1", parent: "parent-1" });
    const child2 = makeTask({ id: "child-2", parent: "parent-1" });
    const unrelated = makeTask({ id: "other", parent: "parent-2" });

    const result = getChildren(parent, [child1, child2, unrelated]);
    expect(result).toEqual([child1, child2]);
  });

  it("returns empty array when no children exist", () => {
    const parent = makeTask({ id: "parent-1" });
    const unrelated = makeTask({ id: "other", parent: "parent-2" });

    const result = getChildren(parent, [unrelated]);
    expect(result).toEqual([]);
  });

  it("returns empty array when tasks list is empty", () => {
    const parent = makeTask({ id: "parent-1" });
    const result = getChildren(parent, []);
    expect(result).toEqual([]);
  });

  it("does not include the parent itself in results", () => {
    const parent = makeTask({ id: "parent-1" });
    // parent itself has no parent field set, so it should not match
    const result = getChildren(parent, [parent]);
    expect(result).toEqual([]);
  });
});

describe("getIdNames", () => {
  it("builds a map from task id to title", () => {
    const tasks = [
      makeTask({ id: "1", title: "Task One" }),
      makeTask({ id: "2", title: "Task Two" }),
      makeTask({ id: "3", title: "Task Three" }),
    ];

    const result = getIdNames(tasks);
    expect(result).toEqual({
      "1": "Task One",
      "2": "Task Two",
      "3": "Task Three",
    });
  });

  it("returns empty object for empty array", () => {
    expect(getIdNames([])).toEqual({});
  });

  it("overwrites duplicate ids with last occurrence", () => {
    const tasks = [
      makeTask({ id: "1", title: "First" }),
      makeTask({ id: "1", title: "Second" }),
    ];

    const result = getIdNames(tasks);
    expect(result).toEqual({ "1": "Second" });
  });
});

describe("getIcon", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set "today" to 2025-06-15 at noon
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0));
  });

  it("returns green checkmark for completed task", () => {
    const task = makeTask({ status: "completed" });
    const icon = getIcon(task);
    expect(icon).toEqual({ source: "checkmark-icon", tintColor: "green" });
  });

  it("returns red circle for overdue open task", () => {
    // Due date is yesterday (2025-06-14)
    const task = makeTask({
      status: "needsAction",
      due: "2025-06-14T00:00:00.000Z",
    });
    const icon = getIcon(task);
    expect(icon).toEqual({ source: "circle-icon", tintColor: "red" });
  });

  it("returns plain circle for open task with future due date", () => {
    // Due date is tomorrow (2025-06-16)
    const task = makeTask({
      status: "needsAction",
      due: "2025-06-16T00:00:00.000Z",
    });
    const icon = getIcon(task);
    expect(icon).toEqual({ source: "circle-icon" });
  });

  it("returns plain circle for open task with no due date", () => {
    const task = makeTask({ status: "needsAction" });
    const icon = getIcon(task);
    // When due is undefined, the code sets due_date = new Date() which is today at noon,
    // and today midnight is <= noon, so it won't be overdue
    expect(icon).toEqual({ source: "circle-icon" });
  });

  it("returns green checkmark for completed task even if overdue", () => {
    const task = makeTask({
      status: "completed",
      due: "2020-01-01T00:00:00.000Z",
    });
    const icon = getIcon(task);
    expect(icon).toEqual({ source: "checkmark-icon", tintColor: "green" });
  });

  it("returns plain circle for open task due today", () => {
    // Due today (2025-06-15) — the due_date parsed from UTC midnight is today, not before today
    const task = makeTask({
      status: "needsAction",
      due: "2025-06-15T00:00:00.000Z",
    });
    const icon = getIcon(task);
    // Due date at local midnight should NOT be before today at midnight, so not overdue
    expect(icon).toEqual({ source: "circle-icon" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

