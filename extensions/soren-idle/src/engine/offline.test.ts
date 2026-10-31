import { describe, expect, it } from "vitest";
import { advance, count, maxHp, newGame, startTask, storageCap } from "./engine";
import { GameState } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Plays `total` ms as one absence, or as many short ticks like an open Raycast window would. */
function play(start: GameState, total: number, step?: number): GameState {
  let s = start;
  const end = start.lastTick + total;
  for (let t = start.lastTick + (step ?? total); ; t += step ?? total) {
    s = advance(s, Math.min(t, end)).state;
    if (t >= end) return s;
  }
}

describe("a long absence matches the same time played in short ticks", () => {
  it("lets drone output keep feeding a task that frees up room", () => {
    const base = newGame(0);
    const full = { ...base, buildings: { forager_drone: 1, generator: 1 } };
    const s = startTask({ ...full, inventory: { glowcap: storageCap(full) } } as GameState, "craft_ration").state;
    const once = play(s, 2 * HOUR);
    const ticked = play(s, 2 * HOUR, MINUTE);
    expect(count(once, "ration")).toBeGreaterThan(0);
    expect(Math.abs(count(once, "ration") - count(ticked, "ration"))).toBeLessThanOrEqual(2);
    expect(Math.abs(count(once, "glowcap") - count(ticked, "glowcap"))).toBeLessThanOrEqual(3);
  });

  it("heals between fights, not all at once before the first", () => {
    const base = { ...newGame(0), buildings: { shelter: 5 } } as GameState;
    const s = startTask({ ...base, hp: maxHp(base), inventory: { ration: 0 } }, "fight_skitter").state;
    const once = play(s, 2 * HOUR);
    // a cycle is a few seconds, so this is as close as an open window gets to continuous play
    const ticked = play(s, 2 * HOUR, 4000);
    expect(once.stats.kills).toBeGreaterThan(20);
    expect(Math.abs(once.stats.kills - ticked.stats.kills)).toBeLessThanOrEqual(1);
    expect(once.stats.retreats).toBe(ticked.stats.retreats);
  });
});

describe("potions", () => {
  it("stay until the cycle that started under them has finished", () => {
    const s = startTask(newGame(0), "mine_ferrite").state;
    const buffed: GameState = {
      ...s,
      lastTick: 10_000,
      taskProgressMs: 2000,
      buffs: { speed: { item: "swift_tonic", power: 0.85, expiresAt: 9000 } },
    };
    expect(advance(buffed, 10_000).state.buffs.speed).toBeDefined();
    // once no cycle started under it, it goes
    const idle = { ...buffed, taskProgressMs: 0 };
    expect(advance(idle, 10_000).state.buffs.speed).toBeUndefined();
  });
});
