import { describe, expect, it } from "vitest";
import { CROP_BY_ID, MAX_LEVEL, TASK_BY_ID } from "./data";
import {
  advance,
  build,
  count,
  equip,
  foodOwned,
  levelOf,
  newGame,
  startTask,
  stopTask,
  taskRates,
  xpForLevel,
} from "./engine";
import { harvest, harvestAll, plant, plotCount, ripeCount } from "./hydroponics";
import { keepCount, sell, sellableCount, sellEverything, setKeep } from "./trade";
import { GameState, ItemId } from "./types";

const MINUTE = 60_000;

const withItems = (items: Partial<Record<ItemId, number>>, patch: Partial<GameState> = {}) =>
  ({ ...newGame(0), inventory: { ...items }, ...patch }) as GameState;

describe("fixed runs", () => {
  it("stop by themselves after N cycles and say so", () => {
    const s = startTask(withItems({ glowcap: 50 }), "craft_ration", 5).state;
    const { state, report } = advance(s, 60 * MINUTE);
    expect(count(state, "ration")).toBe(5);
    expect(state.activeTask).toBeNull();
    expect(state.taskRemaining).toBeNull();
    expect(report.completed).toMatch(/Finished/);
    expect(report.stoppedReason).toBeUndefined();
  });

  it("count down while time passes", () => {
    const s = startTask(newGame(0), "salvage_hull", 10).state;
    const { state } = advance(s, 10_000);
    expect(state.taskRemaining).toBe(7);
    expect(state.activeTask).toBe("salvage_hull");
  });

  it("run until the task cannot continue when no number is given", () => {
    const s = startTask(newGame(0), "salvage_hull").state;
    expect(s.taskRemaining).toBeNull();
  });

  it("make a one-off craft a single run, even in an old save", () => {
    const old = {
      ...withItems({ scrap_metal: 99, circuit_scrap: 99, alloy_plate: 99 }),
      activeTask: "craft_torch",
    };
    const { state, report } = advance(old, 5 * MINUTE);
    expect(state.activeTask).toBeNull();
    expect(report.completed).toBeTruthy();
  });

  it("are cleared by stopping", () => {
    const s = startTask(newGame(0), "salvage_hull", 4).state;
    expect(stopTask(s).taskRemaining).toBeNull();
  });
});

describe("task rates", () => {
  it("scale a cycle up to an hour", () => {
    const task = TASK_BY_ID["salvage_hull"];
    const rates = taskRates(newGame(0), task);
    // a node's wait for respawn is spread over its hits
    const cycles = 3_600_000 / (task.durationMs + task.node!.respawnMs / task.node!.hp);
    expect(rates.xpPerHour).toBeCloseTo(task.xp * cycles);
    expect(rates.itemsPerHour.scrap_metal).toBeCloseTo((task.outputs?.scrap_metal ?? 0) * cycles);
  });

  it("use the faster time that a tool gives", () => {
    const slow = taskRates(newGame(0), TASK_BY_ID["mine_ferrite"]);
    const fast = taskRates(
      equip(withItems({ plasma_drill: 1 }), "plasma_drill").state,
      TASK_BY_ID["mine_ferrite"],
    );
    expect(fast.xpPerHour).toBeGreaterThan(slow.xpPerHour);
  });

  it("give the time to the next level", () => {
    const task = TASK_BY_ID["salvage_hull"];
    const rates = taskRates(newGame(0), task);
    expect(rates.nextLevelMs).toBeCloseTo((xpForLevel(2) / rates.xpPerHour) * 3_600_000, -3);
    const maxed = withItems({}, { xp: { ...newGame().xp, salvaging: xpForLevel(MAX_LEVEL) } });
    expect(taskRates(maxed, task).nextLevelMs).toBeNull();
  });

  it("report HP lost per hour only for fights", () => {
    expect(taskRates(newGame(0), TASK_BY_ID["salvage_hull"]).hpLossPerHour).toBe(0);
    expect(taskRates(newGame(0), TASK_BY_ID["fight_skitter"]).hpLossPerHour).toBeGreaterThan(0);
  });
});

describe("keep when selling", () => {
  const trader = (items: Partial<Record<ItemId, number>>) =>
    withItems(items, { buildings: { hub: 1 } });

  it("holds back the amount the player set", () => {
    const s = setKeep(trader({ scrap_metal: 30 }), "scrap_metal", 12);
    expect(sellableCount(s, "scrap_metal")).toBe(18);
    expect(sell(s, "scrap_metal", "all").state.inventory.scrap_metal).toBe(12);
  });

  it("clears the setting at zero", () => {
    const s = setKeep(setKeep(trader({}), "scrap_metal", 5), "scrap_metal", 0);
    expect(s.keep.scrap_metal).toBeUndefined();
  });

  it("never drops below the one copy of gear that is always kept", () => {
    expect(keepCount(trader({ pulse_blade: 1 }), "pulse_blade")).toBe(1);
  });

  it("sells everything that is not set aside, and counts the credits", () => {
    const s = setKeep(trader({ scrap_metal: 10, ferrite_ore: 10 }), "ferrite_ore", 10);
    const { state, credits } = sellEverything(s);
    expect(credits).toBeGreaterThan(0);
    expect(count(state, "scrap_metal")).toBe(0);
    expect(count(state, "ferrite_ore")).toBe(10);
    expect(state.stats.creditsEarned).toBe(credits);
  });

  it("explains when there is nothing to sell", () => {
    expect(sellEverything(trader({})).error).toMatch(/Nothing/);
    expect(sellEverything(newGame(0)).error).toMatch(/Hub/);
  });
});

describe("lifetime totals", () => {
  it("add up everything gained across advances", () => {
    let s = startTask(newGame(0), "salvage_hull").state;
    s = advance(s, 30_000).state;
    s = advance(s, 60_000).state;
    expect(s.stats.produced.scrap_metal).toBe(count(s, "scrap_metal"));
    expect(s.stats.produced.scrap_metal).toBeGreaterThan(0);
  });

  it("include what drones bring back while idle", () => {
    const s = withItems({}, { buildings: { salvage_drone: 2, generator: 1 } });
    const { state } = advance(s, 10 * MINUTE);
    expect(state.stats.produced.scrap_metal).toBeGreaterThan(0);
  });
});

describe("auto-eat settings", () => {
  const fighting = (hp: number, eatBelow: number) =>
    startTask(
      withItems(
        { ration: 5, honey_ration: 5 },
        { hp, settings: { eatBelow, foodPriority: "weakest" } },
      ),
      "fight_skitter",
    ).state;

  it("eats only when needed by default", () => {
    const { state } = advance(fighting(30, 0), 4000);
    expect(count(state, "ration")).toBe(5);
  });

  it("eats once HP falls below the chosen share", () => {
    const { state } = advance(fighting(30, 0.9), 4000);
    expect(count(state, "ration")).toBeLessThan(5);
  });

  it("picks the strongest food first when asked", () => {
    const s = withItems({ ration: 1, honey_ration: 1 });
    expect(foodOwned(s, "weakest")).toBe("ration");
    expect(foodOwned(s, "strongest")).toBe("honey_ration");
    expect(foodOwned({ ...s, settings: { ...s.settings, foodPriority: "strongest" } })).toBe(
      "honey_ration",
    );
  });
});

describe("hydroponics", () => {
  const bay = (patch: Partial<GameState> = {}) =>
    withItems(
      { glowcap: 10, alloy_plate: 50, scrap_metal: 100, circuit_scrap: 50 },
      {
        buildings: { generator: 1, hydroponic_bay: 2 },
        xp: { ...newGame().xp, engineering: xpForLevel(22) },
        ...patch,
      },
    );

  it("needs the bay, engineering and power to build", () => {
    const s = withItems({ alloy_plate: 50, scrap_metal: 100, glowcap: 50 });
    expect(build(s, "hydroponic_bay").error).toBeTruthy();
    const ready = { ...s, xp: { ...s.xp, engineering: xpForLevel(16) } };
    expect(build(ready, "hydroponic_bay").error).toMatch(/power/i);
    expect(
      build({ ...ready, buildings: { generator: 1 } }, "hydroponic_bay").error,
    ).toBeUndefined();
  });

  it("gives one plot per bay level", () => {
    expect(plotCount(bay())).toBe(2);
  });

  it("plants for seeds and refuses bad plots", () => {
    const planted = plant(bay(), 0, "glowcap_bed");
    expect(planted.error).toBeUndefined();
    expect(count(planted.state, "glowcap")).toBe(8);
    expect(plant(planted.state, 0, "glowcap_bed").error).toMatch(/already/);
    expect(plant(bay(), 2, "glowcap_bed").error).toMatch(/plot/);
    expect(
      plant(withItems({}, { buildings: { hydroponic_bay: 1 } }), 0, "glowcap_bed").error,
    ).toMatch(/seeds/);
    expect(plant(bay(), 0, "lumina_bloom").error).toMatch(/level/);
  });

  it("grows while time passes, even with no task running", () => {
    const planted = plant(bay(), 0, "glowcap_bed").state;
    expect(harvest(planted, 0).error).toMatch(/ripe/);
    const later = advance(planted, 6 * MINUTE).state;
    expect(ripeCount(later)).toBe(1);
  });

  it("pays out the yield and XP on harvest, and frees the plot", () => {
    const later = advance(plant(bay(), 0, "glowcap_bed").state, 6 * MINUTE).state;
    const { state } = harvest(later, 0);
    expect(count(state, "glowcap")).toBe(16);
    expect(state.xp.hydroponics).toBe(CROP_BY_ID.glowcap_bed.xp);
    expect(state.stats.produced.glowcap).toBe(8);
    expect(plant(state, 0, "glowcap_bed").error).toBeUndefined();
  });

  it("levels up from harvesting", () => {
    const s = bay({ xp: { ...newGame().xp, hydroponics: xpForLevel(2) - 1 } });
    const later = advance(plant(s, 0, "glowcap_bed").state, 6 * MINUTE).state;
    expect(levelOf(harvest(later, 0).state, "hydroponics")).toBeGreaterThan(1);
  });

  it("harvests all ripe plots at once", () => {
    let s = plant(bay(), 0, "glowcap_bed").state;
    s = plant(s, 1, "glowcap_bed").state;
    expect(harvestAll(s).error).toMatch(/ripe/);
    const later = advance(s, 6 * MINUTE).state;
    const { state, items } = harvestAll(later);
    expect(items?.glowcap).toBe(16);
    expect(ripeCount(state)).toBe(0);
  });
});
