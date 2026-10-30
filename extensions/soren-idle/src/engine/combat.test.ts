import { describe, expect, it } from "vitest";
import { areaKills, areaOf, bossLockReason, counterTo, matchup } from "./areas";
import { AREAS, ITEMS, TASK_BY_ID, TASKS } from "./data";
import { advance, damageAgainst, equip, fightDamage, hitDamage, newGame, startTask, xpForLevel } from "./engine";
import { GameState, ItemId } from "./types";

const MINUTE = 60_000;

const withItems = (items: Partial<Record<ItemId, number>>, patch: Partial<GameState> = {}) =>
  ({ ...newGame(0), inventory: { ...items }, ...patch }) as GameState;

const strong = (combat: number): Partial<GameState> => ({
  xp: { ...newGame(0).xp, combat: xpForLevel(combat) },
  hp: 10_000,
});

describe("areas", () => {
  it("put every creature in exactly one area, each with several hunts and a boss", () => {
    for (const task of TASKS.filter((t) => t.monster))
      expect(
        AREAS.filter((a) => a.boss === task.id || a.hunts.includes(task.id)),
        task.id,
      ).toHaveLength(1);
    for (const area of AREAS) {
      expect(area.hunts.length).toBeGreaterThanOrEqual(2);
      expect(TASK_BY_ID[area.boss].boss).toBe(true);
      for (const id of area.hunts) expect(TASK_BY_ID[id].boss).toBeFalsy();
    }
  });

  it("make every boss harder than its area's hunts and drop something unique", () => {
    for (const area of AREAS) {
      const boss = TASK_BY_ID[area.boss].monster!;
      for (const id of area.hunts) expect(boss.hp).toBeGreaterThan(TASK_BY_ID[id].monster!.hp);
      const others = TASKS.filter((t) => t.id !== area.boss).flatMap((t) => Object.keys(t.monster?.drops ?? {}));
      const unique = Object.keys(boss.drops).filter((id) => !others.includes(id));
      expect(unique.length, area.id).toBeGreaterThan(0);
    }
  });

  it("counts kills per hunt, offline too", () => {
    const { state } = advance(startTask(withItems({}, strong(28)), "fight_skitter").state, 10 * MINUTE);
    expect(state.stats.hunts.fight_skitter).toBe(state.stats.kills);
    expect(areaKills(state, areaOf("fight_skitter")!)).toBe(state.stats.kills);
  });

  it("counts a retreat when the survivor is too wounded to keep fighting", () => {
    const { state, report } = advance(startTask(withItems({}, strong(28)), "fight_skitter").state, MINUTE);
    expect(state.stats.retreats).toBe(0);
    const hurt = { ...startTask(withItems({}, { hp: 1 }), "fight_skitter").state };
    const after = advance(hurt, 10 * MINUTE);
    expect(after.report.stoppedReason).toMatch(/Retreated/);
    expect(after.state.stats.retreats).toBe(1);
    expect(report.stoppedReason).toBeUndefined();
  });
});

describe("bosses", () => {
  const boss = TASK_BY_ID.fight_matriarch;
  const area = AREAS[0];

  it("stay hidden until the area has been thinned out", () => {
    const s = withItems({}, strong(88));
    expect(bossLockReason(s, boss)).toMatch(/Canyon Floor/);
    expect(startTask(s, boss.id).error).toMatch(/Canyon Floor/);
    const ready = { ...s, stats: { ...s.stats, hunts: { fight_skitter: area.bossKills } } };
    expect(bossLockReason(ready, boss)).toBeUndefined();
    expect(startTask(ready, boss.id).error).toBeUndefined();
  });

  it("refuse a survivor who is too wounded to start", () => {
    const s = withItems({}, { ...strong(88), hp: 1, stats: { ...newGame(0).stats, hunts: { fight_skitter: 99 } } });
    expect(startTask(s, boss.id).error).toMatch(/Too wounded/);
  });

  it("are fought without eating, and drop their unique items", () => {
    const base = withItems(
      { ration: 50 },
      {
        ...strong(34),
        stats: { ...newGame(0).stats, hunts: { fight_skitter: 99 } },
      },
    );
    base.hp = 85;
    const started = startTask(base, boss.id);
    expect(started.error).toBeUndefined();
    const { state, report } = advance(started.state, 30 * 60 * 1000);
    // rations are never touched mid-run, so the run ends once HP runs out
    expect(state.inventory.ration).toBe(50);
    expect(report.stoppedReason).toMatch(/Retreated from Hive Matriarch/);
    expect(state.inventory.matriarch_chitin ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("let ordinary hunts keep eating", () => {
    const base = withItems({ ration: 50 }, { ...strong(1), hp: 20 });
    const { state } = advance(startTask(base, "fight_skitter").state, 5 * MINUTE);
    expect(state.inventory.ration).toBeLessThan(50);
  });

  it("unlock the unique gear their drops make", () => {
    for (const id of ["chitin_crown", "fang_blade", "sovereign_mail"] as const) {
      const recipe = TASKS.find((t) => t.outputs?.[id]);
      expect(recipe, id).toBeTruthy();
      const trophies = Object.keys(recipe!.inputs ?? {}).filter((i) =>
        TASKS.some((t) => t.boss && t.monster?.drops[i as ItemId]),
      );
      expect(trophies.length, id).toBeGreaterThan(0);
    }
  });
});

describe("the combat triangle", () => {
  it("is a cycle: each type beats one and loses to one", () => {
    expect(matchup("kinetic", "bio")).toBe(1.25);
    expect(matchup("bio", "energy")).toBe(1.25);
    expect(matchup("energy", "kinetic")).toBe(1.25);
    expect(matchup("bio", "kinetic")).toBe(0.8);
    expect(matchup("kinetic", "kinetic")).toBe(1);
    expect(matchup(undefined, "bio")).toBe(1);
    expect(counterTo("bio")).toBe("kinetic");
  });

  it("is in the gear: every tier-1 weapon type exists", () => {
    const types = new Set(
      Object.values(ITEMS)
        .filter((i) => i.slot === "weapon" && i.tier === 1)
        .map((i) => i.damageType),
    );
    expect(types).toEqual(new Set(["kinetic", "energy", "bio"]));
  });

  it("makes the right weapon matter", () => {
    const skitter = TASK_BY_ID.fight_skitter; // bio
    const wield = (id: ItemId) => equip(withItems({ [id]: 1 }, strong(28)), id).state;
    const kinetic = damageAgainst(wield("shard_cleaver"), skitter);
    const energy = damageAgainst(wield("pulse_blade"), skitter);
    expect(kinetic).toBeGreaterThan(energy);
    expect(fightDamage(wield("shard_cleaver"), skitter)).toBeLessThanOrEqual(
      fightDamage(wield("pulse_blade"), skitter),
    );
  });

  it("makes the right armor matter", () => {
    const stalker = TASK_BY_ID.fight_stalker; // energy: bio armor beats it, kinetic armor loses to it
    const wear = (id: ItemId) => equip(withItems({ [id]: 1 }, strong(58)), id).state;
    expect(counterTo("energy")).toBe("bio");
    expect(hitDamage(wear("skyweave_suit"), stalker)).toBeLessThan(hitDamage(wear("composite_armor"), stalker));
    // untyped stays neutral
    expect(hitDamage(withItems({}, strong(1)), stalker)).toBe(stalker.monster!.damage);
  });
});
