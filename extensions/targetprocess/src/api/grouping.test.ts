import { describe, expect, it } from "vitest";

import { groupByState, mapCollection } from "./entities";

function item(id: number, state: { Id: number; Name: string; NumericPriority: number } | null, modified?: string) {
  return {
    Id: id,
    Name: `Item ${id}`,
    EntityType: { Name: "UserStory" },
    EntityState: state ?? undefined,
    ModifyDate: modified,
  };
}

const OPEN = { Id: 1, Name: "Open", NumericPriority: 1 };
const IN_PROGRESS = { Id: 2, Name: "In Progress", NumericPriority: 2 };
const TESTING = { Id: 3, Name: "Testing", NumericPriority: 3 };

describe("groupByState", () => {
  it("orders sections by workflow position, not alphabetically", () => {
    const items = mapCollection({ Items: [item(1, TESTING), item(2, OPEN), item(3, IN_PROGRESS)] });
    expect(groupByState(items).map((group) => group.title)).toEqual(["Open", "In Progress", "Testing"]);
  });

  it("collects every item in a state into one section", () => {
    const items = mapCollection({ Items: [item(1, OPEN), item(2, IN_PROGRESS), item(3, OPEN)] });
    const groups = groupByState(items);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual([1, 3]);
  });

  it("preserves the order items arrived in, which is most recently modified first", () => {
    const items = mapCollection({
      Items: [item(1, OPEN, "/Date(9000+0000)/"), item(2, OPEN, "/Date(1000+0000)/")],
    });
    expect(groupByState(items)[0]?.items.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it("puts items without a state last rather than first", () => {
    const items = mapCollection({ Items: [item(1, null), item(2, TESTING), item(3, OPEN)] });
    expect(groupByState(items).map((group) => group.title)).toEqual(["Open", "Testing", "No State"]);
  });

  it("falls back to the state name when two states share a position", () => {
    const items = mapCollection({
      Items: [
        item(1, { Id: 9, Name: "Zebra", NumericPriority: 1 }),
        item(2, { Id: 8, Name: "Alpha", NumericPriority: 1 }),
      ],
    });
    expect(groupByState(items).map((group) => group.title)).toEqual(["Alpha", "Zebra"]);
  });

  it("keeps states with the same name but different ids apart", () => {
    const items = mapCollection({
      Items: [
        item(1, { Id: 10, Name: "Open", NumericPriority: 1 }),
        item(2, { Id: 11, Name: "Open", NumericPriority: 2 }),
      ],
    });
    expect(groupByState(items)).toHaveLength(2);
  });

  it("returns nothing for no items", () => {
    expect(groupByState([])).toEqual([]);
  });
});
