import { describe, expect, it } from "vitest";
import { TASK_BY_ID, TASKS } from "./data";
import { advance, newGame, startTask, taskDurationMs, taskRates } from "./engine";
import {
  hasMastery,
  masteryLevel,
  masteryLevelFromXp,
  masterySpeed,
  masteryXpForLevel,
  masteryYield,
  nodeHp,
  nodeMaxHp,
  nodeRespawnMs,
} from "./mastery";
import { migrateSave } from "./migrate";
import { GameState } from "./types";

const SECOND = 1000;
const ferrite = TASK_BY_ID.mine_ferrite;

const withMastery = (taskId: string, level: number): GameState => {
  const s = newGame(0);
  s.mastery[taskId] = masteryXpForLevel(level);
  return s;
};

describe("resource nodes", () => {
  it("are the gathering tasks, each with health and a respawn time", () => {
    const nodes = TASKS.filter((t) => t.node);
    expect(nodes.length).toBeGreaterThanOrEqual(7);
    for (const task of nodes) {
      expect(["salvaging", "mining", "foraging"], task.id).toContain(task.skill);
      expect(task.node!.hp, task.id).toBeGreaterThan(1);
      expect(task.node!.respawnMs, task.id).toBeGreaterThan(0);
    }
  });

  it("lose one health per cycle", () => {
    const s = startTask(newGame(0), "mine_ferrite").state;
    const { state } = advance(s, 5 * ferrite.durationMs + 1);
    expect(state.inventory.ferrite_ore).toBe(5);
    expect(nodeHp(state, ferrite)).toBe(ferrite.node!.hp - 5);
  });

  it("run out, make you wait, then come back at full health", () => {
    const hp = ferrite.node!.hp;
    // exactly enough cycles to empty it
    const s = startTask(newGame(0), "mine_ferrite", hp).state;
    const emptied = advance(s, hp * ferrite.durationMs + 1).state;
    expect(emptied.inventory.ferrite_ore).toBe(hp);
    expect(emptied.activeTask).toBeNull();
    expect(nodeRespawnMs(emptied, ferrite)).toBeGreaterThan(0);

    // nothing is mined while it respawns
    const again = startTask(emptied, "mine_ferrite").state;
    const waiting = advance(again, again.lastTick + ferrite.node!.respawnMs - 2 * SECOND).state;
    expect(waiting.inventory.ferrite_ore).toBe(hp);
    expect(waiting.activeTask).toBe("mine_ferrite");

    // and then it is mined again, from full health
    const later = advance(waiting, waiting.lastTick + 2 * SECOND + 2 * ferrite.durationMs).state;
    expect(later.inventory.ferrite_ore).toBeGreaterThan(hp);
    expect(nodeHp(later, ferrite)).toBeGreaterThan(hp - 5);
  });

  it("lower the hourly rate by the time spent waiting", () => {
    const perHour = taskRates(newGame(0), ferrite).itemsPerHour.ferrite_ore ?? 0;
    const nonstop = 3_600_000 / ferrite.durationMs;
    expect(perHour).toBeLessThan(nonstop);
    expect(perHour).toBeGreaterThan(nonstop * 0.85);
  });

  it("give the same result in many small steps as in one big step", () => {
    const start = startTask(newGame(0), "mine_ferrite").state;
    let stepped = start;
    for (let t = 1; t <= 900; t++) stepped = advance(stepped, t * SECOND).state;
    const jumped = advance(start, 900 * SECOND).state;
    expect(stepped.inventory).toEqual(jumped.inventory);
    expect(stepped.nodes).toEqual(jumped.nodes);
    expect(stepped.mastery).toEqual(jumped.mastery);
  });
});

describe("mastery", () => {
  it("covers repeatable tasks, but not combat or one-off crafts", () => {
    expect(hasMastery(TASK_BY_ID.mine_ferrite)).toBe(true);
    expect(hasMastery(TASK_BY_ID.craft_ration)).toBe(true);
    expect(hasMastery(TASK_BY_ID.fight_skitter)).toBe(false);
    expect(hasMastery(TASK_BY_ID.craft_torch)).toBe(false);
  });

  it("follows the skill curve at a twentieth of the cost", () => {
    expect(masteryXpForLevel(99)).toBe(Math.floor(13_034_431 / 20));
    expect(masteryLevelFromXp(masteryXpForLevel(50))).toBe(50);
    expect(masteryLevelFromXp(0)).toBe(1);
  });

  it("grows per task as it is repeated", () => {
    const s = startTask(newGame(0), "salvage_hull").state;
    const { state } = advance(s, 60 * SECOND);
    expect(state.mastery.salvage_hull).toBeGreaterThan(0);
    expect(state.mastery.salvage_wiring).toBeUndefined();
    expect(masteryLevel(state, TASK_BY_ID.salvage_hull)).toBeGreaterThan(1);
  });

  it("adds one health to the node for every level past the first", () => {
    expect(nodeMaxHp(newGame(0), ferrite)).toBe(ferrite.node!.hp);
    expect(nodeMaxHp(withMastery("mine_ferrite", 51), ferrite)).toBe(ferrite.node!.hp + 50);
  });

  it("speeds a task up every ten levels", () => {
    expect(masterySpeed(9)).toBe(1);
    expect(masterySpeed(10)).toBeLessThan(1);
    const base = taskDurationMs(newGame(0), ferrite);
    expect(taskDurationMs(withMastery("mine_ferrite", 50), ferrite)).toBeLessThan(base);
    // mastery of one task does not speed up another
    expect(taskDurationMs(withMastery("mine_lumina", 99), ferrite)).toBe(base);
  });

  it("adds bonus yield at its milestones", () => {
    expect(masteryYield(24)).toBe(0);
    expect(masteryYield(25)).toBeGreaterThan(0);
    expect(masteryYield(99)).toBeGreaterThan(masteryYield(50));
  });

  it("gives more from a mastered task than a fresh one over many cycles", () => {
    const run = (s: GameState) =>
      advance(startTask({ ...s, buildings: { storage: 5 } }, "salvage_hull", 400).state, 1e9).state
        .inventory.scrap_metal ?? 0;
    expect(run(withMastery("salvage_hull", 99))).toBeGreaterThan(run(newGame(0)));
  });

  it("is added to old saves", () => {
    const old = { ...newGame(0) } as Partial<GameState>;
    delete old.mastery;
    delete old.nodes;
    const migrated = migrateSave(old);
    expect(migrated.mastery).toEqual({});
    expect(migrated.nodes).toEqual({});
  });
});
