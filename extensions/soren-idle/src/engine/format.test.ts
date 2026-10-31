import { describe, expect, it } from "vitest";
import { ITEMS } from "./data";
import { describeItem } from "./format";

describe("describeItem", () => {
  it("adds the Combat level from the item's data, so the text cannot drift from the rule", () => {
    expect(describeItem(ITEMS.arc_saber)).toMatch(/Needs Combat 34 to wield\.$/);
    expect(describeItem(ITEMS.ward_plate)).toMatch(/Needs Combat 43 to wear\.$/);
    expect(describeItem(ITEMS.ration)).toBe(ITEMS.ration.description);
  });

  it("is the only place a Combat level is written", () => {
    for (const item of Object.values(ITEMS)) expect(item.description).not.toMatch(/Needs Combat/);
  });
});
