import { describe, expect, it } from "vitest";
import { EQUIP_SLOTS, ITEMS, TASK_BY_ID } from "./data";
import {
  advance,
  equip,
  equipError,
  isEquipped,
  modifiers,
  newGame,
  playerArmor,
  playerDamage,
  rareChanceMult,
  startTask,
  taskDurationMs,
  unequip,
  xpForLevel,
} from "./engine";
import { exportSave, importSave } from "./migrate";
import { GameState, ItemId } from "./types";

const MINUTE = 60_000;

const withItems = (items: Partial<Record<ItemId, number>>, patch: Partial<GameState> = {}) =>
  ({ ...newGame(0), inventory: { ...items }, ...patch }) as GameState;

/** Levels given as tiers (1, 10, 20): the real level is three times that, less two. */
const tier = (n: number) => (n <= 1 ? n : 3 * n - 2);
const levelled = (combat: number, engineering = 0) => ({
  xp: {
    ...newGame(0).xp,
    combat: xpForLevel(tier(combat)),
    engineering: xpForLevel(tier(engineering)),
  },
});

describe("gear data", () => {
  const gear = Object.values(ITEMS).filter((i) => i.slot);

  it("gives every item with a gear stat a slot and a tier", () => {
    for (const item of Object.values(ITEMS)) {
      if (item.tool || item.weaponDamage || item.armor || item.rareBonus) {
        expect(item.slot, item.id).toBeTruthy();
        expect(item.tier, item.id).toBeGreaterThan(0);
      }
    }
  });

  it("puts every tool in the slot for its skill", () => {
    const toolSlot = { salvaging: "salvager", mining: "miner", foraging: "forager" };
    for (const item of gear.filter((i) => i.tool))
      expect(item.slot, item.id).toBe(toolSlot[item.tool!.skill as keyof typeof toolSlot]);
  });

  it("has gear for every slot, and more than one tier in most", () => {
    for (const slot of EQUIP_SLOTS)
      expect(
        gear.some((i) => i.slot === slot.id),
        slot.id,
      ).toBe(true);
    const tiers = (slot: string) => new Set(gear.filter((i) => i.slot === slot).map((i) => i.tier));
    for (const slot of ["weapon", "body", "head", "salvager", "miner", "forager"])
      expect(tiers(slot).size, slot).toBeGreaterThanOrEqual(2);
  });

  it("has a way to get every piece, by crafting or in the shop", () => {
    const crafted = new Set(Object.values(TASK_BY_ID).flatMap((t) => Object.keys(t.outputs ?? {})));
    for (const item of gear) if (!item.unsellable) expect(crafted.has(item.id), item.id).toBe(true);
  });
});

describe("equipping", () => {
  it("only counts gear that is worn", () => {
    const owned = withItems({ pulse_blade: 1, composite_armor: 1, cutting_torch: 1 });
    expect(playerDamage(owned)).toBe(3 + 1);
    expect(playerArmor(owned)).toBe(0);
    expect(taskDurationMs(owned, TASK_BY_ID.salvage_hull)).toBe(3000);
  });

  it("changes combat stats and gathering speed", () => {
    let s = withItems({ pulse_blade: 1, composite_armor: 1, cutting_torch: 1 });
    for (const id of ["pulse_blade", "composite_armor", "cutting_torch"] as const)
      s = equip(s, id).state;
    expect(playerDamage(s)).toBe(3 + 1 + 4);
    expect(playerArmor(s)).toBe(1);
    expect(taskDurationMs(s, TASK_BY_ID.salvage_hull)).toBe(2400);
    expect(isEquipped(s, "pulse_blade")).toBe(true);
  });

  it("takes effect in the simulation too", () => {
    const plain = withItems({}, { buildings: { storage: 5 } });
    const worn = equip(
      withItems({ cutting_torch: 1 }, { buildings: { storage: 5 } }),
      "cutting_torch",
    ).state;
    const a = advance(startTask(plain, "salvage_hull").state, 30 * MINUTE).state;
    const b = advance(startTask(worn, "salvage_hull").state, 30 * MINUTE).state;
    expect(b.inventory.scrap_metal ?? 0).toBeGreaterThan((a.inventory.scrap_metal ?? 0) * 1.2);
  });

  it("swaps gear in a slot and removes it again", () => {
    let s = withItems({ pulse_blade: 1, arc_saber: 1 }, levelled(12));
    s = equip(s, "pulse_blade").state;
    s = equip(s, "arc_saber").state;
    expect(s.equipped.weapon).toBe("arc_saber");
    expect(playerDamage(s)).toBe(3 + 12 + 9);
    s = unequip(s, "weapon");
    expect(s.equipped.weapon).toBeUndefined();
    expect(playerDamage(s)).toBe(3 + 12);
  });

  it("needs the item and the combat level", () => {
    expect(equip(newGame(0), "pulse_blade").error).toMatch(/do not have/);
    expect(equip(withItems({ ration: 1 }), "ration").error).toMatch(/cannot be equipped/);
    const saber = withItems({ arc_saber: 1 }, levelled(5));
    expect(equipError(saber, "arc_saber")).toMatch(/Combat level 34/);
    expect(equip(saber, "arc_saber").state.equipped.weapon).toBeUndefined();
    expect(equip({ ...saber, ...levelled(12) }, "arc_saber").error).toBeUndefined();
  });

  it("only applies the charm when it is worn", () => {
    const owned = withItems({ prospector_charm: 1 });
    expect(rareChanceMult(owned)).toBe(1);
    expect(rareChanceMult(equip(owned, "prospector_charm").state)).toBe(1.5);
  });

  it("stacks gear from different slots through one function", () => {
    let s = withItems({ prism_visor: 1, prospector_charm: 1, composite_armor: 1 });
    for (const id of ["prism_visor", "prospector_charm", "composite_armor"] as const)
      s = equip(s, id).state;
    const m = modifiers(s);
    expect(m.armor).toBe(3);
    expect(m.rare).toBeCloseTo(1.25 * 1.5);
  });
});

describe("auto-equip", () => {
  const craft = (
    taskId: string,
    items: Partial<Record<ItemId, number>>,
    patch: Partial<GameState>,
  ) => advance(startTask(withItems(items, patch), taskId).state, 10 * MINUTE).state;

  it("wears a crafted item when its slot is empty", () => {
    const s = craft("craft_scout_visor", { alloy_plate: 2, circuit_scrap: 3 }, levelled(1, 10));
    expect(s.equipped.head).toBe("scout_visor");
  });

  it("replaces a lower tier but not a higher one", () => {
    const up = craft(
      "craft_prism_visor",
      { alloy_plate: 3, circuit_scrap: 6, prism_geode: 2, scout_visor: 1 },
      { ...levelled(1, 20), equipped: { head: "scout_visor" } },
    );
    expect(up.equipped.head).toBe("prism_visor");

    const down = craft(
      "craft_scout_visor",
      { alloy_plate: 2, circuit_scrap: 3, prism_visor: 1 },
      { ...levelled(1, 20), equipped: { head: "prism_visor" } },
    );
    expect(down.equipped.head).toBe("prism_visor");
  });

  it("does not wear what you are too weak for", () => {
    const s = craft(
      "craft_arc_saber",
      { alloy_plate: 8, lumina_crystal: 4, resonance_coil: 1 },
      levelled(1, 25),
    );
    expect(s.inventory.arc_saber).toBe(1);
    expect(s.equipped.weapon).toBeUndefined();
  });
});

describe("saves", () => {
  it("put on the gear an old save owned", () => {
    const old = {
      ...withItems({ pulse_blade: 1, cutting_torch: 1, composite_armor: 1, skyweave_suit: 1 }),
      version: 2,
    } as Partial<GameState>;
    delete old.equipped;
    const { state, error } = importSave(JSON.stringify(old));
    expect(error).toBeUndefined();
    expect(state?.equipped).toEqual({
      weapon: "pulse_blade",
      salvager: "cutting_torch",
      body: "skyweave_suit",
    });
    expect(taskDurationMs(state as GameState, TASK_BY_ID.salvage_hull)).toBe(2400);
  });

  it("round-trip what is worn", () => {
    const s = equip(withItems({ pulse_blade: 1 }), "pulse_blade").state;
    expect(importSave(exportSave(s)).state?.equipped.weapon).toBe("pulse_blade");
  });
});
