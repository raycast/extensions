import { describe, expect, it } from "vitest";
import { BUILDING_BY_ID } from "./data";
import { build, buildingCost, buildingLevel, count, newGame, xpForLevel } from "./engine";
import { GameState, ItemId } from "./types";

const def = BUILDING_BY_ID.translator;

function state(items: Partial<Record<ItemId, number>>, contact = true): GameState {
  return {
    ...newGame(1000),
    contactAt: contact ? 0 : null,
    xp: { ...newGame().xp, engineering: xpForLevel(88) },
    inventory: items,
  };
}

const everything: Partial<Record<ItemId, number>> = {
  alloy_plate: 999,
  circuit_scrap: 999,
  lumina_crystal: 999,
  glyph_tablet: 999,
  resonance_coil: 999,
  void_lens: 999,
  aether_cell: 999,
};

describe("Translation Device", () => {
  it("has a cost and a note for every level", () => {
    expect(def.levelCosts).toHaveLength(def.maxLevel);
    expect(def.levelNotes).toHaveLength(def.maxLevel);
  });

  it("needs first contact", () => {
    expect(build(state(everything, false), "translator").error).toMatch(/nobody to talk to/);
  });

  it("needs engineering level 14", () => {
    const s = { ...state(everything), xp: newGame().xp };
    expect(build(s, "translator").error).toMatch(/Requires/);
  });

  it("upgrades one level at a time, paying that level's cost", () => {
    let s = state(everything);
    for (let level = 1; level <= def.maxLevel; level++) {
      const cost = buildingCost(s, "translator");
      expect(cost).toEqual(def.levelCosts?.[level - 1]);
      const before = s;
      s = build(s, "translator").state;
      expect(buildingLevel(s, "translator")).toBe(level);
      for (const [id, n] of Object.entries(cost) as [ItemId, number][]) {
        expect(count(s, id)).toBe(count(before, id) - n);
      }
    }
    expect(build(s, "translator").error).toMatch(/max level/);
  });

  it("cannot reach higher levels without goods only the locals sell", () => {
    const earned: Partial<Record<ItemId, number>> = {
      alloy_plate: 999,
      circuit_scrap: 999,
      lumina_crystal: 999,
    };
    let s = state(earned);
    s = build(s, "translator").state; // level 1 is all craftable
    expect(buildingLevel(s, "translator")).toBe(1);
    expect(build(s, "translator").error).toMatch(/materials/);
  });
});
