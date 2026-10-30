import { describe, expect, it } from "vitest";
import { ITEMS, TASKS } from "./data";
import { advance, newGame, startTask } from "./engine";
import { GameState } from "./types";

const HOUR = 3_600_000;

/** Long runs need the offline cap lifted and room to hold what they find. */
const roomy = { buildings: { storage: 5, stasis_pod: 5 } } as Partial<GameState>;

const rareItems = [...new Set(TASKS.flatMap((t) => t.rareDrops?.map((d) => d.item) ?? []))];

/** Runs a task for `cycles` cycles from a given seed. */
function runCycles(taskId: string, cycles: number, patch: Partial<GameState> = {}) {
  const task = TASKS.find((t) => t.id === taskId)!;
  const base = { ...newGame(0), ...patch };
  base.inventory = { ration: 0, ...patch.inventory };
  // A fixed number of runs, and enough time for them even with waits for the node to respawn.
  const s = startTask(base, taskId, cycles).state;
  const cycleMs = task.durationMs + (task.node ? task.node.respawnMs / task.node.hp : 0);
  return advance(s, cycles * cycleMs + 1);
}

describe("rare drops", () => {
  it("exist for at least six items across several skills, all worth selling", () => {
    expect(rareItems.length).toBeGreaterThanOrEqual(6);
    const skills = new Set(TASKS.filter((t) => t.rareDrops).map((t) => t.skill));
    expect(skills.size).toBeGreaterThanOrEqual(4);
    for (const id of rareItems) expect(ITEMS[id].value, id).toBeGreaterThanOrEqual(100);
  });

  it("roll once per cycle at the stated rate, over many cycles", () => {
    // 20,000 cycles of Mine Ferrite at 0.4% is 80 on average, with a standard deviation of about 9
    const { state, report } = runCycles("mine_ferrite", 20_000, roomy);
    expect(report.cycles).toBe(20_000);
    const found = state.inventory.prism_geode ?? 0;
    expect(found).toBeGreaterThan(80 - 4 * 9);
    expect(found).toBeLessThan(80 + 4 * 9);
    expect(report.rare.prism_geode).toBe(found);
    expect(report.items.prism_geode).toBe(found);
  });

  it("is deterministic: the same save finds the same things", () => {
    const a = runCycles("salvage_wiring", 5_000, { ...roomy });
    const b = runCycles("salvage_wiring", 5_000, { ...roomy });
    expect(a.report.rare).toEqual(b.report.rare);
    expect(a.state.rng).toBe(b.state.rng);
  });

  it("is not distorted by simulating a long absence in one go or many short ones", () => {
    const task = TASKS.find((t) => t.id === "forage_glowcap")!;
    const cycles = 12 * (HOUR / task.durationMs);
    const long = runCycles("forage_glowcap", cycles, { ...roomy });
    const expected = cycles * 0.003;
    const found = long.state.inventory.golden_spore ?? 0;
    expect(found).toBeGreaterThan(expected - 4 * Math.sqrt(expected));
    expect(found).toBeLessThan(expected + 4 * Math.sqrt(expected));

    let s = startTask({ ...newGame(0), ...roomy }, "forage_glowcap").state;
    for (let t = 1; t <= 12 * 60; t++) s = advance(s, t * 60_000).state;
    const chunked = s.inventory.golden_spore ?? 0;
    expect(chunked).toBeGreaterThan(expected - 4 * Math.sqrt(expected));
    expect(chunked).toBeLessThan(expected + 4 * Math.sqrt(expected));
  });

  it("drop from combat too, per kill", () => {
    const { state } = runCycles("fight_stalker", 3_000, {
      hp: 1e9,
      xp: { ...newGame(0).xp, combat: 500_000 },
      inventory: { ration: 3_000 },
      ...roomy,
    });
    // each kill has a 1% chance of a Xeno Core; the Stalker drops chitin on every kill
    expect(state.inventory.xeno_core ?? 0).toBeGreaterThan(10);
  });

  it("is raised by the Prospector's Charm", () => {
    const plain = runCycles("mine_ferrite", 20_000, { ...roomy });
    const charmed = runCycles("mine_ferrite", 20_000, {
      ...roomy,
      inventory: { prospector_charm: 1 },
      equipped: { charm: "prospector_charm" },
    });
    expect(charmed.state.inventory.prism_geode ?? 0).toBeGreaterThan(
      (plain.state.inventory.prism_geode ?? 0) * 1.2,
    );
  });

  it("does not overflow storage", () => {
    const { state } = runCycles("mine_ferrite", 2_000, {
      inventory: { prism_geode: 1000 },
    });
    expect(state.inventory.prism_geode).toBe(1000);
  });
});
