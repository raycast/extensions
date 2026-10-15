import { describe, expect, it } from "vitest";
import { compareWorkItems, groupByStateGroup, isOpenStateGroup } from "../src/helpers/state-groups";

const item = (id: string, group: string | undefined, priority = "none", updatedAt = "2026-10-01T00:00:00Z") => ({
  id,
  state: group ? { group } : undefined,
  priority,
  updatedAt,
});

describe("groupByStateGroup", () => {
  const items = [
    item("backlog", "backlog"),
    item("done", "completed"),
    item("started", "started"),
    item("triage", "triage"),
    item("todo", "unstarted"),
    item("cancelled", "cancelled"),
    item("unknown", undefined),
  ];

  it("orders triage → started → unstarted → backlog → other and hides closed by default", () => {
    expect(groupByStateGroup(items).map((section) => section.group)).toEqual([
      "triage",
      "started",
      "unstarted",
      "backlog",
      "other",
    ]);
  });

  it("includes completed and cancelled when asked", () => {
    expect(groupByStateGroup(items, { includeClosed: true }).map((section) => section.group)).toEqual([
      "triage",
      "started",
      "unstarted",
      "backlog",
      "completed",
      "cancelled",
      "other",
    ]);
  });

  it("sorts by priority then most recently updated within a group", () => {
    const sorted = [
      item("low-new", "started", "low", "2026-10-10T00:00:00Z"),
      item("urgent", "started", "urgent", "2026-09-01T00:00:00Z"),
      item("low-old", "started", "low", "2026-09-01T00:00:00Z"),
    ].sort(compareWorkItems);
    expect(sorted.map((entry) => entry.id)).toEqual(["urgent", "low-new", "low-old"]);
  });

  it("treats unknown groups as open", () => {
    expect(isOpenStateGroup(undefined)).toBe(true);
    expect(isOpenStateGroup("completed")).toBe(false);
  });
});
