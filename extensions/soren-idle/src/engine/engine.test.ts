import { describe, expect, it } from "vitest";
import { MAX_LEVEL, MAX_OFFLINE_MS, TASK_BY_ID } from "./data";
import {
  advance,
  build,
  buildingCost,
  combatTier,
  count,
  eat,
  equip,
  levelFromXp,
  levelOf,
  maxHp,
  newGame,
  powerCapacity,
  powerEfficiency,
  startTask,
  stopTask,
  taskDurationMs,
  xpForLevel,
} from "./engine";
import { GameState, ItemId } from "./types";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

function withItems(
  items: Partial<Record<ItemId, number>>,
  patch: Partial<GameState> = {},
): GameState {
  return { ...newGame(0), inventory: { ...items }, ...patch };
}

function run(state: GameState, taskId: string, ms: number) {
  const started = startTask(state, taskId);
  expect(started.error).toBeUndefined();
  return advance(started.state, state.lastTick + ms);
}

describe("levels", () => {
  it("increase monotonically and cap at the max level", () => {
    for (let level = 1; level < MAX_LEVEL; level++) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level));
    }
    expect(levelFromXp(1e12)).toBe(MAX_LEVEL);
  });

  it("follow the Melvor curve: 99 is 13,034,431 XP and 92 is about half of it", () => {
    expect(MAX_LEVEL).toBe(99);
    expect(xpForLevel(99)).toBe(13_034_431);
    expect(xpForLevel(92)).toBe(6_517_253);
    expect(xpForLevel(10)).toBe(1_154);
  });

  it("scale combat in tiers of three levels, so old balance holds", () => {
    expect([1, 3, 4, 7, 28].map(combatTier)).toEqual([1, 1, 2, 3, 10]);
  });

  it("round-trips levels and xp", () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      if (level > 1) expect(levelFromXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });
});

describe("advance: gathering", () => {
  it("runs one cycle per task duration and awards xp", () => {
    const { state, report } = run(newGame(0), "salvage_hull", 30 * SECOND);
    expect(report.cycles).toBe(10);
    expect(count(state, "scrap_metal")).toBe(10);
    expect(state.xp.salvaging).toBe(10 * TASK_BY_ID.salvage_hull.xp);
  });

  it("carries partial progress between ticks", () => {
    const first = run(newGame(0), "salvage_hull", 2 * SECOND);
    expect(first.report.cycles).toBe(0);
    expect(first.state.taskProgressMs).toBe(2 * SECOND);
    const second = advance(first.state, 4 * SECOND);
    expect(second.report.cycles).toBe(1);
    expect(second.state.taskProgressMs).toBe(SECOND);
  });

  it("gives the same result in many small steps as in one big step", () => {
    const start = startTask(newGame(0), "mine_ferrite").state;
    let stepped = start;
    for (let t = 1; t <= 600; t++) stepped = advance(stepped, t * SECOND).state;
    const jumped = advance(start, 600 * SECOND).state;
    expect(stepped.inventory).toEqual(jumped.inventory);
    expect(stepped.xp).toEqual(jumped.xp);
    expect(stepped.taskProgressMs).toBe(jumped.taskProgressMs);
  });

  it("caps offline time", () => {
    const { report } = run(newGame(0), "salvage_hull", MAX_OFFLINE_MS * 3);
    expect(report.elapsedMs).toBe(MAX_OFFLINE_MS);
  });

  it("reports level ups", () => {
    const { report, state } = run(newGame(0), "salvage_hull", 10 * MINUTE);
    expect(report.levelUps.length).toBeGreaterThan(0);
    expect(report.levelUps.at(-1)?.level).toBe(levelOf(state, "salvaging"));
  });

  it("does nothing without a task except regenerate", () => {
    const hurt = withItems({}, { hp: 1 });
    const { state, report } = advance(hurt, 10 * SECOND);
    expect(report.cycles).toBe(0);
    expect(state.hp).toBeGreaterThan(1);
    expect(state.hp).toBeLessThanOrEqual(maxHp(state));
  });
});

describe("advance: crafting", () => {
  it("consumes inputs and stops when they run out", () => {
    const state = withItems({ glowcap: 5 });
    const { state: after, report } = run(state, "craft_ration", 10 * MINUTE);
    expect(count(after, "ration")).toBe(2);
    expect(count(after, "glowcap")).toBe(1);
    expect(after.activeTask).toBeNull();
    expect(report.stoppedReason).toMatch(/Out of materials/);
  });

  it("one-off crafts stop after a single cycle", () => {
    const state = withItems(
      { alloy_plate: 10, circuit_scrap: 10 },
      { xp: { ...newGame().xp, engineering: xpForLevel(13) } },
    );
    const { state: after } = run(state, "craft_torch", 10 * MINUTE);
    expect(count(after, "cutting_torch")).toBe(1);
    expect(count(after, "alloy_plate")).toBe(8);
    expect(after.activeTask).toBeNull();
  });

  it("tools shorten matching tasks only", () => {
    const base = newGame(0);
    const withTorch = equip(withItems({ cutting_torch: 1 }), "cutting_torch").state;
    expect(taskDurationMs(withTorch, TASK_BY_ID.salvage_hull)).toBeLessThan(
      taskDurationMs(base, TASK_BY_ID.salvage_hull),
    );
    expect(taskDurationMs(withTorch, TASK_BY_ID.mine_ferrite)).toBe(
      taskDurationMs(base, TASK_BY_ID.mine_ferrite),
    );
  });
});

describe("startTask", () => {
  it("rejects locked, unaffordable and already owned tasks", () => {
    expect(startTask(newGame(0), "mine_lumina").error).toMatch(/level/);
    expect(startTask(newGame(0), "craft_ration").error).toMatch(/materials/);
    const owner = withItems(
      { cutting_torch: 1, alloy_plate: 9, circuit_scrap: 9 },
      { xp: { ...newGame().xp, engineering: xpForLevel(13) } },
    );
    expect(startTask(owner, "craft_torch").error).toMatch(/already own/);
  });

  it("stops cleanly", () => {
    const running = startTask(newGame(0), "salvage_hull").state;
    const stopped = stopTask(advance(running, 2 * SECOND).state);
    expect(stopped.activeTask).toBeNull();
    expect(stopped.taskProgressMs).toBe(0);
  });
});

describe("combat", () => {
  it("costs hp, counts kills and drops loot", () => {
    const { state, report } = run(newGame(0), "fight_skitter", 8 * SECOND);
    expect(report.cycles).toBe(2);
    expect(state.stats.kills).toBe(2);
    expect(count(state, "chitin_shard")).toBe(2);
    expect(state.hp).toBeLessThan(maxHp(state));
  });

  it("eats rations to keep fighting", () => {
    const state = withItems({ ration: 50 });
    const { state: after } = run(state, "fight_skitter", 10 * MINUTE);
    expect(count(after, "ration")).toBeLessThan(50);
    expect(after.stats.kills).toBeGreaterThan(40);
  });

  it("retreats when wounded with no food", () => {
    const { state, report } = run(newGame(0), "fight_skitter", 10 * MINUTE);
    expect(state.activeTask).toBeNull();
    expect(report.stoppedReason).toMatch(/Retreated/);
    expect(state.hp).toBeGreaterThan(0);
  });

  it("does not regenerate between fights without a shelter", () => {
    const { state } = run(newGame(0), "fight_skitter", 8 * SECOND);
    expect(state.hp).toBeLessThan(maxHp(state));
  });
});

describe("eat", () => {
  it("heals and consumes a ration", () => {
    const { state, error } = eat(withItems({ ration: 2 }, { hp: 10 }));
    expect(error).toBeUndefined();
    expect(state.hp).toBe(25);
    expect(count(state, "ration")).toBe(1);
  });

  it("refuses without rations or at full health", () => {
    expect(eat(withItems({}, { hp: 10 })).error).toMatch(/No rations/);
    expect(eat(withItems({ ration: 1 })).error).toMatch(/full health/);
  });
});

describe("base", () => {
  const engineer = (items: Partial<Record<ItemId, number>>) =>
    withItems(items, { xp: { ...newGame().xp, engineering: xpForLevel(88) } });

  it("scales costs with level and consumes materials", () => {
    let s = engineer({ scrap_metal: 1000, alloy_plate: 1000 });
    const first = buildingCost(s, "shelter");
    s = build(s, "shelter").state;
    expect(count(s, "scrap_metal")).toBe(1000 - (first.scrap_metal ?? 0));
    expect(buildingCost(s, "shelter").scrap_metal).toBe(2 * (first.scrap_metal ?? 0));
  });

  it("enforces max level, requirements and materials", () => {
    expect(build(newGame(0), "generator").error).toMatch(/Requires/);
    expect(build(engineer({}), "shelter").error).toMatch(/Missing/);
    let s = engineer({ scrap_metal: 1e6, alloy_plate: 1e6 });
    for (let i = 0; i < 5; i++) s = build(s, "shelter").state;
    expect(build(s, "shelter").error).toMatch(/max level/);
  });

  it("drones need power", () => {
    const s = engineer({ scrap_metal: 100, alloy_plate: 100, circuit_scrap: 100 });
    expect(build(s, "salvage_drone").error).toMatch(/power/);
    const powered = build(s, "generator").state;
    expect(powerCapacity(powered)).toBe(3);
    expect(build(powered, "salvage_drone").error).toBeUndefined();
  });

  it("shelter raises max hp", () => {
    const s = engineer({ scrap_metal: 100, alloy_plate: 100 });
    expect(maxHp(build(s, "shelter").state)).toBe(maxHp(s) + 10);
  });

  it("drones produce while idle and carry fractions between ticks", () => {
    let s = engineer({ scrap_metal: 100, alloy_plate: 100, circuit_scrap: 100 });
    s = build(build(s, "generator").state, "salvage_drone").state;
    const before = count(s, "scrap_metal");
    // 20s per item per level: 50s is 2.5 items.
    const first = advance(s, 50 * SECOND);
    expect(count(first.state, "scrap_metal") - before).toBe(2);
    // advance() takes an absolute time: 110s in total is 5.5 items.
    const second = advance(first.state, 110 * SECOND);
    expect(count(second.state, "scrap_metal") - before).toBe(5);
  });

  it("workshop speeds up engineering only", () => {
    const s = engineer({ alloy_plate: 100, circuit_scrap: 100 });
    const built = build(s, "workshop").state;
    expect(taskDurationMs(built, TASK_BY_ID.craft_alloy)).toBeLessThan(
      taskDurationMs(s, TASK_BY_ID.craft_alloy),
    );
    expect(taskDurationMs(built, TASK_BY_ID.craft_ration)).toBe(
      taskDurationMs(s, TASK_BY_ID.craft_ration),
    );
    expect(taskDurationMs(built, TASK_BY_ID.mine_ferrite)).toBe(
      taskDurationMs(s, TASK_BY_ID.mine_ferrite),
    );
  });
});

describe("drone power", () => {
  const drones = (generator: number) =>
    withItems({}, { buildings: { salvage_drone: 4, mining_drone: 4, generator, storage: 5 } });
  const hour = 60 * MINUTE;

  it("runs at full output when there is enough power", () => {
    expect(powerEfficiency(drones(3))).toBe(1); // 8 drawn, 9 given
    expect(advance(drones(3), hour).state.inventory.scrap_metal).toBe(4 * (hour / 20_000));
  });

  it("scales output down when drones draw more than the generators give", () => {
    expect(powerEfficiency(drones(2))).toBeCloseTo(6 / 8);
    expect(advance(drones(2), hour).state.inventory.scrap_metal).toBe(
      Math.floor(4 * (hour / 20_000) * 0.75),
    );
    expect(advance(drones(0), hour).state.inventory.scrap_metal).toBeUndefined();
  });
});
