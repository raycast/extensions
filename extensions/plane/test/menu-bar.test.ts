import { describe, expect, it } from "vitest";
import {
  countOpenAssignedWorkItems,
  filterMyWorkItems,
  getMenuBarTitle,
  getOpenAssignedWorkItems,
} from "../src/helpers/my-work-items";

const me = "user-me";
const items = [
  { id: "1", assigneeIds: [me], createdBy: "other", state: { group: "started" } },
  { id: "2", assigneeIds: [me, "other"], createdBy: me, state: { group: "backlog" } },
  { id: "3", assigneeIds: [me], createdBy: me, state: { group: "completed" } },
  { id: "4", assigneeIds: [me], createdBy: "other", state: { group: "cancelled" } },
  { id: "5", assigneeIds: ["other"], createdBy: me, state: { group: "unstarted" } },
  { id: "6", assigneeIds: [], createdBy: "other", state: { group: "started" } },
];

describe("menu bar counting", () => {
  it("counts only open items assigned to me", () => {
    expect(countOpenAssignedWorkItems(items, me)).toBe(2);
    expect(getOpenAssignedWorkItems(items, me).map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("returns 0 without a user", () => {
    expect(countOpenAssignedWorkItems(items, undefined)).toBe(0);
  });

  it("shows no title for zero", () => {
    expect(getMenuBarTitle(0)).toBeUndefined();
    expect(getMenuBarTitle(undefined)).toBeUndefined();
    expect(getMenuBarTitle(7)).toBe("7");
  });
});

describe("filterMyWorkItems", () => {
  it("filters assigned and created", () => {
    expect(filterMyWorkItems(items, me, "assigned").map((item) => item.id)).toEqual(["1", "2", "3", "4"]);
    expect(filterMyWorkItems(items, me, "created").map((item) => item.id)).toEqual(["2", "3", "5"]);
  });
});
