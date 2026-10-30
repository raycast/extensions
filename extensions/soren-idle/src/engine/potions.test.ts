import { describe, expect, it } from "vitest";
import { ITEMS, TASK_BY_ID } from "./data";
import {
  advance,
  activeBuff,
  drink,
  fightDamage,
  newGame,
  playerDamage,
  startTask,
  taskDurationMs,
  xpForLevel,
} from "./engine";
import { formatBuffs } from "./format";
import { GameState, ItemId } from "./types";

const MINUTE = 60_000;

const withItems = (items: Partial<Record<ItemId, number>>, patch: Partial<GameState> = {}) =>
  ({ ...newGame(0), inventory: { ...items }, ...patch }) as GameState;

describe("Xenochemistry", () => {
  it("brews every potion from surplus materials", () => {
    const brewed = Object.values(TASK_BY_ID).filter((t) => t.skill === "xenochemistry");
    const potions = Object.values(ITEMS).filter((i) => i.potion);
    expect(brewed.length).toBe(potions.length);
    for (const potion of potions)
      expect(
        brewed.some((t) => t.outputs?.[potion.id]),
        potion.id,
      ).toBe(true);
  });

  it("makes a potion from a task", () => {
    const s = startTask(withItems({ ferrite_ore: 8, glowcap: 4 }), "brew_swift", 2).state;
    const { state } = advance(s, 5 * MINUTE);
    expect(state.inventory.swift_tonic).toBe(2);
    expect(state.xp.xenochemistry).toBeGreaterThan(0);
  });
});

describe("potions", () => {
  it("start a timed buff and use the potion up", () => {
    const { state, error } = drink(withItems({ swift_tonic: 2 }), "swift_tonic");
    expect(error).toBeUndefined();
    expect(state.inventory.swift_tonic).toBe(1);
    expect(activeBuff(state, "speed")?.power).toBe(0.85);
    expect(formatBuffs(state)[0]).toMatch(/Swift Tonic, 15m 0s left/);
  });

  it("refuse items that are not potions or that you do not have", () => {
    expect(drink(withItems({ ration: 1 }), "ration").error).toBeTruthy();
    expect(drink(newGame(0), "swift_tonic").error).toBeTruthy();
  });

  it("do not let a weaker potion replace a stronger one", () => {
    const strong = drink(withItems({ quicksilver_tonic: 1, swift_tonic: 1 }), "quicksilver_tonic").state;
    expect(drink(strong, "swift_tonic").error).toMatch(/stronger/);
    const weak = drink(withItems({ quicksilver_tonic: 1, swift_tonic: 1 }), "swift_tonic").state;
    expect(drink(weak, "quicksilver_tonic").state.buffs.speed?.item).toBe("quicksilver_tonic");
  });

  it("speed tasks up", () => {
    const task = TASK_BY_ID.salvage_hull;
    const plain = withItems({});
    const buffed = drink(withItems({ swift_tonic: 1 }), "swift_tonic").state;
    expect(taskDurationMs(buffed, task)).toBe(Math.round(task.durationMs * 0.85));
    expect(taskDurationMs(plain, task)).toBe(task.durationMs);
  });

  it("add damage in combat", () => {
    const buffed = drink(withItems({ fury_serum: 1 }), "fury_serum").state;
    expect(playerDamage(buffed)).toBe(playerDamage(withItems({})) + 4);
    expect(fightDamage(buffed, TASK_BY_ID.fight_stalker)).toBeLessThan(
      fightDamage(withItems({}), TASK_BY_ID.fight_stalker),
    );
  });

  it("raise yield, over many cycles", () => {
    const run = (potion: boolean) => {
      let s = withItems({ fortune_draught: 1 }, { buildings: { storage: 5, stasis_pod: 5 } });
      if (potion) s = drink(s, "fortune_draught").state;
      // the potion lasts 15 minutes, a few hundred cycles
      return advance(startTask(s, "salvage_hull").state, 15 * MINUTE).state.inventory.scrap_metal ?? 0;
    };
    const base = run(false);
    expect(base).toBeGreaterThan(200);
    const boosted = run(true);
    expect(boosted).toBeGreaterThan(base * 1.15);
    expect(boosted).toBeLessThan(base * 1.35);
  });

  it("run out partway through a long absence", () => {
    const roomy = { buildings: { storage: 5 } };
    const s = drink(withItems({ swift_tonic: 1 }, roomy), "swift_tonic").state;
    const hour = advance(startTask(s, "salvage_hull").state, 60 * MINUTE);
    const plain = advance(startTask(withItems({}, roomy), "salvage_hull").state, 60 * MINUTE);
    // only the first 15 of the 60 minutes run faster, so the gain is small
    const gain = (hour.state.inventory.scrap_metal ?? 0) / (plain.state.inventory.scrap_metal ?? 1);
    expect(gain).toBeGreaterThan(1.01);
    expect(gain).toBeLessThan(1.08);
    expect(hour.state.buffs.speed).toBeUndefined();
  });

  it("do not boost one-off crafts", () => {
    const base = withItems(
      { fortune_draught: 1, alloy_plate: 2, circuit_scrap: 2 },
      { xp: { ...newGame(0).xp, engineering: xpForLevel(28) } },
    );
    const s = startTask(drink(base, "fortune_draught").state, "craft_torch").state;
    expect(advance(s, 10 * MINUTE).state.inventory.cutting_torch).toBe(1);
  });
});
