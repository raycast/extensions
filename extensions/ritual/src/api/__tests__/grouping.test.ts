import { describe, expect, it } from "vitest";
import { groupTasks } from "../grouping";
import type { RitualTask } from "../types";

function task(overrides: Partial<RitualTask> = {}): RitualTask {
  return {
    id: "1",
    title: "Water the plants",
    evening: false,
    completed: false,
    overdue: false,
    ...overrides,
  };
}

describe("groupTasks", () => {
  it("collapses an empty list to no sections", () => {
    expect(groupTasks([])).toEqual([]);
  });

  it("collapses every ungrouped row into one untitled section", () => {
    const tasks = [task({ id: "1" }), task({ id: "2" }), task({ id: "3" })];
    const sections = groupTasks(tasks);
    expect(sections).toHaveLength(1);
    expect(sections[0][0]).toBeUndefined();
    expect(sections[0][1].map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("merges consecutive rows that share a group label", () => {
    const tasks = [
      task({ id: "1", group: "This Week" }),
      task({ id: "2", group: "This Week" }),
      task({ id: "3", group: "Next Week" }),
    ];
    const sections = groupTasks(tasks);
    expect(sections).toEqual([
      ["This Week", [tasks[0], tasks[1]]],
      ["Next Week", [tasks[2]]],
    ]);
  });

  // This is the case that pins the contiguity requirement: the CLI must emit
  // rows already grouped together. A non-contiguous input — the same label
  // reappearing after another label broke it up — produces a REPEATED
  // section here rather than a merged one, because the grouping walks the
  // list once and only compares each row to the section directly before it.
  // That's exactly the failure mode the CLI's partition-order fix
  // (`list --upcoming` emitting rows in group order) exists to prevent.
  it("produces separate sections for alternating labels, not a merged one", () => {
    const tasks = [
      task({ id: "1", group: "This Week" }),
      task({ id: "2", group: "Next Week" }),
      task({ id: "3", group: "This Week" }),
    ];
    const sections = groupTasks(tasks);
    expect(sections).toEqual([
      ["This Week", [tasks[0]]],
      ["Next Week", [tasks[1]]],
      ["This Week", [tasks[2]]],
    ]);
  });

  // Today's evening divider — the extension's answer to the app's NIGHT rule.
  describe("splitEvening", () => {
    it("sends evening rows to their own trailing section", () => {
      const tasks = [
        task({ id: "1" }),
        task({ id: "2", evening: true }),
        task({ id: "3" }),
      ];
      expect(groupTasks(tasks, { splitEvening: true })).toEqual([
        [undefined, [tasks[0], tasks[2]]],
        ["Evening", [tasks[1]]],
      ]);
    });

    // The app puts evening work AFTER the day's, always — so an evening task
    // the CLI happens to emit first must not drag the heading to the top.
    it("keeps Evening last even when an evening row comes first", () => {
      const tasks = [task({ id: "1", evening: true }), task({ id: "2" })];
      expect(groupTasks(tasks, { splitEvening: true })).toEqual([
        [undefined, [tasks[1]]],
        ["Evening", [tasks[0]]],
      ]);
    });

    it("omits the heading entirely when nothing is set for the evening", () => {
      const tasks = [task({ id: "1" }), task({ id: "2" })];
      expect(groupTasks(tasks, { splitEvening: true })).toEqual([
        [undefined, [tasks[0], tasks[1]]],
      ]);
    });

    // A day whose every task is an evening task should read as one Evening
    // section, not an empty untitled section above it.
    it("omits the daytime section when every row is an evening row", () => {
      const tasks = [
        task({ id: "1", evening: true }),
        task({ id: "2", evening: true }),
      ];
      expect(groupTasks(tasks, { splitEvening: true })).toEqual([
        ["Evening", [tasks[0], tasks[1]]],
      ]);
    });

    it("preserves the CLI's order inside each section", () => {
      const tasks = [
        task({ id: "1" }),
        task({ id: "2", evening: true }),
        task({ id: "3" }),
        task({ id: "4", evening: true }),
      ];
      const [day, evening] = groupTasks(tasks, { splitEvening: true });
      expect(day[1].map((t) => t.id)).toEqual(["1", "3"]);
      expect(evening[1].map((t) => t.id)).toEqual(["2", "4"]);
    });

    // Upcoming already sections by the CLI's own labels; splitting those by
    // evening as well would cut each week in half.
    it("leaves CLI-grouped rows alone", () => {
      const tasks = [
        task({ id: "1", group: "This Week" }),
        task({ id: "2", group: "This Week", evening: true }),
      ];
      expect(groupTasks(tasks, { splitEvening: true })).toEqual([
        ["This Week", [tasks[0], tasks[1]]],
      ]);
    });

    it("is off unless asked for", () => {
      const tasks = [task({ id: "1" }), task({ id: "2", evening: true })];
      expect(groupTasks(tasks)).toEqual([[undefined, [tasks[0], tasks[1]]]]);
    });
  });
});
