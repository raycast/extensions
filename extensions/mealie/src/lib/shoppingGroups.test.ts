import { describe, expect, it } from "vitest";
import { groupItemsByLabel } from "./shoppingGroups";
import type { LabelSetting, ShoppingListItem } from "../types";

const OBST = { id: "l-obst", name: "Obst und Gemüse", color: "#81E36A" };
const TK = { id: "l-tk", name: "Tiefkühlware", color: "#1525E7" };

const labelSettings: LabelSetting[] = [
  { labelId: TK.id, position: 0, label: TK },
  { labelId: OBST.id, position: 1, label: OBST },
];

function item(id: string, label: { id: string; name: string; color: string } | null): ShoppingListItem {
  return {
    id,
    shoppingListId: "list-1",
    checked: false,
    position: 0,
    quantity: 1,
    note: "",
    display: id,
    foodId: null,
    food: null,
    labelId: label?.id ?? null,
    label,
    unitId: null,
    unit: null,
  };
}

describe("groupItemsByLabel", () => {
  it("orders groups by the position the user configured, not alphabetically", () => {
    const groups = groupItemsByLabel([item("a", OBST), item("b", TK)], labelSettings);
    expect(groups.map((g) => g.name)).toEqual(["Tiefkühlware", "Obst und Gemüse"]);
  });

  it("puts items without a label into a trailing group", () => {
    const groups = groupItemsByLabel([item("a", null), item("b", TK)], labelSettings);
    expect(groups.map((g) => g.name)).toEqual(["Tiefkühlware", "No Label"]);
  });

  it("omits groups that have no items", () => {
    const groups = groupItemsByLabel([item("a", TK)], labelSettings);
    expect(groups).toHaveLength(1);
  });

  it("keeps items whose label is missing from labelSettings", () => {
    const other = { id: "l-other", name: "Asia", color: "#870208" };
    const groups = groupItemsByLabel([item("a", other)], labelSettings);
    expect(groups.map((g) => g.name)).toEqual(["Asia"]);
  });

  it("returns an empty array for no items", () => {
    expect(groupItemsByLabel([], labelSettings)).toEqual([]);
  });
});
