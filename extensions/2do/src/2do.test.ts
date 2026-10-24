import { beforeEach, describe, expect, it, vi } from "vitest";
import { dateFields, saveTask, scopeArgs, tagOptions, Task, taskToValues, toDate, twoDo } from "./2do";

const { runAppleScript } = vi.hoisted(() => ({ runAppleScript: vi.fn() }));
vi.mock("@raycast/utils", () => ({ runAppleScript }));
// Same check as Raycast's runtime: full-day dates carry exactly 1 millisecond.
vi.mock("@raycast/api", () => ({
  Form: { DatePicker: { isFullDay: (d?: Date | null) => !!d && d.getMilliseconds() === 1 } },
}));

const fullDay = (y: number, m: number, d: number) => new Date(y, m, d, 0, 0, 0, 1);

// The 2Do commands sent so far, as [command, args] with args decoded from JSON.
const sent = () => runAppleScript.mock.calls.map(([, [command, args]]) => [command, JSON.parse(args)]);

const task: Task = {
  task_id: "t1",
  title: "Call mom",
  notes: "about Sunday",
  list_id: "inbox",
  list_title: "Inbox",
  completed: false,
  starred: true,
  priority: "high",
  start_date: "2026-10-25",
  start_time: "12:00",
  due_date: "2026-10-25",
  tags: [{ tag_id: "tag1", title: "Family" }],
  presentation: { is_overdue: false },
};

beforeEach(() => {
  runAppleScript.mockReset().mockResolvedValue("{}");
});

describe("twoDo", () => {
  it("runs the command as JXA with JSON arguments and parses the result", async () => {
    runAppleScript.mockResolvedValue('{"list":[{"list_id":"a"}]}');
    await expect(twoDo("list_lists", { include_archived: true })).resolves.toEqual({ list: [{ list_id: "a" }] });
    const [script, args, options] = runAppleScript.mock.calls[0];
    expect(script).toContain('Application("2Do")');
    expect(args).toEqual(["list_lists", '{"include_archived":true}']);
    expect(options).toEqual({ language: "JavaScript" });
  });

  it("passes 2Do errors through", async () => {
    runAppleScript.mockRejectedValue(new Error("not_found: Task 'x' was not found."));
    await expect(twoDo("get_task", { task_id: "x" })).rejects.toThrow("not_found");
  });
});

describe("dateFields", () => {
  it("sends date and time for a timed date", () => {
    expect(dateFields("due", new Date(2026, 9, 5, 9, 30), false)).toEqual({
      due_date: "2026-10-05",
      due_time: "09:30",
    });
  });

  it("sends only the date for a full-day pick", () => {
    expect(dateFields("start", fullDay(2026, 9, 5), false)).toEqual({ start_date: "2026-10-05" });
  });

  it("keeps a time of exactly midnight", () => {
    expect(dateFields("due", new Date(2026, 9, 5), false)).toEqual({ due_date: "2026-10-05", due_time: "00:00" });
  });

  it("omits empty dates when creating and clears them when editing", () => {
    expect(dateFields("due", null, false)).toEqual({});
    expect(dateFields("due", null, true)).toEqual({ due_date: null, due_time: null });
  });

  it("clears an old time when an edited date becomes full-day", () => {
    expect(dateFields("due", fullDay(2026, 9, 5), true)).toEqual({ due_date: "2026-10-05", due_time: null });
  });
});

describe("toDate", () => {
  it("round-trips 2Do dates through dateFields", () => {
    expect(toDate()).toBeNull();
    expect(dateFields("due", toDate("2026-10-25", "14:00"), false)).toEqual({
      due_date: "2026-10-25",
      due_time: "14:00",
    });
    expect(dateFields("due", toDate("2026-10-25"), false)).toEqual({ due_date: "2026-10-25" });
  });
});

describe("saveTask", () => {
  const values = { ...taskToValues(task), notes: "", start: null, tag_ids: [] };

  it("creates a task, leaving out empty notes, dates, and tags", async () => {
    await saveTask(values);
    expect(sent()).toEqual([
      ["create_task", { title: "Call mom", priority: "high", starred: true, due_date: "2026-10-25", list_id: "inbox" }],
    ]);
  });

  it("sends tags when creating with tags", async () => {
    await saveTask({ ...values, tag_ids: ["tag1"] });
    expect(sent()[0][1].tag_update).toEqual({ operation: "set", tag_ids: ["tag1"] });
  });

  it("updates a task, clearing removed fields", async () => {
    await saveTask(values, task);
    expect(sent()).toEqual([
      [
        "update_task",
        {
          task_id: "t1",
          title: "Call mom",
          priority: "high",
          starred: true,
          start_date: null,
          start_time: null,
          due_date: "2026-10-25",
          due_time: null,
          notes: "",
          tag_update: { operation: "set", tag_ids: [] },
        },
      ],
    ]);
  });

  it("keeps an unchanged task's values when editing", async () => {
    await saveTask(taskToValues(task), task);
    expect(sent()[0][1]).toMatchObject({
      start_date: "2026-10-25",
      start_time: "12:00",
      notes: "about Sunday",
      tag_update: { operation: "set", tag_ids: ["tag1"] },
    });
  });

  it("moves the task when its list changed", async () => {
    await saveTask({ ...values, list_id: "work" }, task);
    expect(sent().map(([command]) => command)).toEqual(["update_task", "move_task"]);
    expect(sent()[1][1]).toEqual({ task_id: "t1", list_id: "work" });
  });
});

describe("scopeArgs", () => {
  it("maps dropdown values to query_tasks targets", () => {
    expect(scopeArgs("focus:today")).toEqual({ focus: "today", include_completed: false });
    expect(scopeArgs("focus:done")).toEqual({ focus: "done", include_completed: true });
    expect(scopeArgs("list:abc")).toEqual({ list_id: "abc", include_completed: false });
    expect(scopeArgs("smart-list:xyz")).toEqual({ smart_list_id: "xyz", include_completed: false });
  });
});

describe("tagOptions", () => {
  const all = [
    { tag_id: "tag1", title: "Family" },
    { tag_id: "tag2", title: "Work" },
  ];

  it("lists all tags when creating", () => {
    expect(tagOptions(all)).toEqual(all);
    expect(tagOptions(undefined)).toEqual([]);
  });

  it("adds the task's tags that 2Do's tag list leaves out, without duplicates", () => {
    const hidden = { tag_id: "tag3", title: "Marketing" };
    expect(tagOptions(all, { ...task, tags: [all[0], hidden] })).toEqual([...all, hidden]);
  });

  it("offers the task's tags before the tag list has loaded", () => {
    expect(tagOptions(undefined, task)).toEqual(task.tags);
  });
});
