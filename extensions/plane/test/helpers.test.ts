import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../src/helpers/concurrency";
import { deriveCycleAndModules } from "../src/helpers/activities";
import { formatCycleProgress, isCycleActive } from "../src/helpers/cycles";
import { describePlaneError } from "../src/helpers/errors";
import { applyWorkItemChange, toggleAssignee, toWorkItemSummary } from "../src/helpers/work-item-summary";

describe("mapWithConcurrency", () => {
  it("keeps order and never exceeds the limit", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapWithConcurrency([5, 1, 4, 2, 3], 2, async (value) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active--;
      return value * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});

describe("deriveCycleAndModules", () => {
  it("replays cycle and module activity (newest first input)", () => {
    const newestFirst = [
      { id: "5", field: "modules", verb: "deleted", old_identifier: "m1" },
      { id: "4", field: "cycles", verb: "updated", old_identifier: "c1", new_identifier: "c2", new_value: "Sprint 2" },
      { id: "3", field: "modules", verb: "created", new_identifier: "m2", new_value: "Billing" },
      { id: "2", field: "modules", verb: "created", new_identifier: "m1", new_value: "Auth" },
      { id: "1", field: "cycles", verb: "created", new_identifier: "c1", new_value: "Sprint 1" },
    ];
    expect(deriveCycleAndModules(newestFirst)).toEqual({
      cycle: { id: "c2", name: "Sprint 2" },
      modules: [{ id: "m2", name: "Billing" }],
    });
  });

  it("clears the cycle when removed", () => {
    expect(
      deriveCycleAndModules([
        { id: "2", field: "cycles", verb: "deleted", old_identifier: "c1" },
        { id: "1", field: "cycles", verb: "created", new_identifier: "c1", new_value: "Sprint 1" },
      ]).cycle,
    ).toBeUndefined();
  });
});

describe("cycles", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  it("detects active cycles", () => {
    expect(isCycleActive({ start_date: "2026-10-07T00:00:00Z", end_date: "2026-10-20T23:59:00Z" }, now)).toBe(true);
    expect(isCycleActive({ start_date: "2026-10-15T00:00:00Z", end_date: "2026-10-20T00:00:00Z" }, now)).toBe(false);
    expect(isCycleActive({ start_date: null, end_date: null }, now)).toBe(false);
  });
  it("formats progress", () => {
    expect(formatCycleProgress({ total_issues: 8, completed_issues: 3, cancelled_issues: 1 })).toBe("4/8 done · 50%");
    expect(formatCycleProgress({ total_issues: 0 })).toBe("No work items");
  });
});

describe("describePlaneError", () => {
  it("maps statuses to hints", () => {
    expect(describePlaneError({ status: 401, message: "x" }).title).toBe("Check your API key");
    expect(describePlaneError({ response: { status: 403 } }).title).toBe("No access");
    expect(describePlaneError(Object.assign(new Error("Given API token is not valid"), { status: 403 })).title).toBe(
      "API key not valid",
    );
    expect(
      describePlaneError(Object.assign(new Error("Given API token is not valid"), { status: 403 })).message,
    ).toContain("Personal Access Tokens");
    expect(
      describePlaneError(Object.assign(new Error("You don't have the required permissions."), { status: 403 })).message,
    ).toContain("required permissions");
    expect(describePlaneError({ status: 404 }).title).toBe("Check API Base Path");
    expect(describePlaneError({ status: 429 }).title).toBe("Plane rate limit reached");
    expect(describePlaneError(new Error("boom")).message).toBe("boom");
  });
});

describe("work item summaries", () => {
  const summary = toWorkItemSummary(
    {
      id: "wi",
      name: "Fix",
      sequence_id: 12,
      project: "p",
      state: { id: "s1", name: "Todo", color: "#fff", group: "unstarted" },
      assignees: ["u1", { id: "u2", display_name: "b" }],
      priority: "high",
    },
    { projectIdentifier: "ENG", workspaceSlug: "acme" },
  );

  it("normalizes expanded and plain fields", () => {
    expect(summary.stateId).toBe("s1");
    expect(summary.assigneeIds).toEqual(["u1", "u2"]);
  });

  it("applies optimistic changes", () => {
    const changed = applyWorkItemChange(summary, {
      stateId: "s2",
      state: { id: "s2", name: "Done", color: "#0f0", group: "completed" },
    });
    expect(changed.state?.group).toBe("completed");
    expect(changed.priority).toBe("high");
  });

  it("toggles assignees", () => {
    expect(toggleAssignee(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleAssignee(["a", "b"], "b")).toEqual(["a"]);
  });
});
