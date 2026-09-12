import { describe, expect, it } from "vitest";
import { filterFoods, normalizeForSearch } from "./foodSearch";
import type { IngredientFood } from "../types";

function food(name: string, id = name): IngredientFood {
  return { id, name, pluralName: null, labelId: null, label: null };
}

describe("normalizeForSearch", () => {
  it("lowercases and strips diacritics so umlauts match either way", () => {
    expect(normalizeForSearch("Gemüse")).toBe("gemuse");
    expect(normalizeForSearch("KÄSE")).toBe("kase");
    expect(normalizeForSearch("  Öl  ")).toBe("ol");
  });
});

describe("filterFoods", () => {
  const foods = [food("Basmatireis"), food("Reis"), food("Milchreis"), food("Käse"), food("Kartoffeln")];

  it("matches anywhere in the name, which Mealie's token search does not", () => {
    const names = filterFoods(foods, "reis").map((f) => f.name);
    expect(names).toContain("Basmatireis");
    expect(names).toContain("Milchreis");
    expect(names).toContain("Reis");
  });

  it("ranks a prefix match above a match in the middle", () => {
    const names = filterFoods(foods, "reis").map((f) => f.name);
    expect(names[0]).toBe("Reis");
  });

  it("ignores case and umlauts", () => {
    expect(filterFoods(foods, "kase").map((f) => f.name)).toEqual(["Käse"]);
    expect(filterFoods(foods, "KÄSE").map((f) => f.name)).toEqual(["Käse"]);
  });

  it("returns everything up to the limit for an empty term", () => {
    expect(filterFoods(foods, "   ", 3)).toHaveLength(3);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterFoods(foods, "zzz")).toEqual([]);
  });
});
