import { describe, expect, it } from "vitest";
import { countWorkItems, formatWorkItemsSubtitle, localDateString } from "../src/helpers/work-item-counts";

const ME = "me";
const TODAY = "2026-10-15";

function item(overrides: Record<string, unknown> = {}) {
  return { assigneeIds: [ME], state: { group: "started" }, priority: "medium", targetDate: null, ...overrides };
}

describe("countWorkItems", () => {
  it("counts only open items assigned to me", () => {
    const counts = countWorkItems(
      [
        item(),
        item({ state: { group: "completed" } }),
        item({ state: { group: "cancelled" } }),
        item({ assigneeIds: ["someone-else"] }),
      ],
      ME,
      TODAY,
    );
    expect(counts.open).toBe(1);
  });

  it("counts urgent, overdue and due today among open items", () => {
    const counts = countWorkItems(
      [
        item({ priority: "urgent" }),
        item({ targetDate: "2026-10-14" }),
        item({ targetDate: "2026-10-15" }),
        item({ targetDate: "2026-10-16" }),
        item({ priority: "urgent", targetDate: "2026-10-01", state: { group: "completed" } }),
      ],
      ME,
      TODAY,
    );
    expect(counts).toEqual({ open: 4, urgent: 1, overdue: 1, dueToday: 1 });
  });

  it("returns zeros without a user", () => {
    expect(countWorkItems([item()], undefined, TODAY).open).toBe(0);
  });
});

describe("formatWorkItemsSubtitle", () => {
  it("leaves out zero counts", () => {
    expect(formatWorkItemsSubtitle({ open: 12, urgent: 2, overdue: 0, dueToday: 3 })).toBe(
      "12 open · 2 urgent · 3 due today",
    );
  });

  it("marks a capped count", () => {
    expect(formatWorkItemsSubtitle({ open: 12, urgent: 0, overdue: 1, dueToday: 0 }, true)).toBe(
      "12+ open · 1 overdue",
    );
  });

  it("says when nothing is open", () => {
    expect(formatWorkItemsSubtitle({ open: 0, urgent: 0, overdue: 0, dueToday: 0 })).toBe(
      "Nothing open assigned to you",
    );
  });
});

describe("localDateString", () => {
  it("uses the local calendar date", () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
