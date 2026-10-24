import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLevel, levelBriefing } from "../src/maze/level";
import { iceRouteOk } from "../src/maze/rules";
import { ptKey, type CustomSetup, type LevelState } from "../src/maze/types";
import { keysOf, mazeIsWellFormed, placedItems, reachable } from "./helpers";

function assertLevelInvariants(state: LevelState, label: string) {
  assert.ok(mazeIsWellFormed(state.maze), `${label}: maze border/symmetry broken`);
  assert.deepEqual(state.player, state.start, `${label}: player must start at the start`);
  assert.ok(reachable(state.maze, state.start, state.exit), `${label}: exit unreachable`);

  const items = placedItems(state);
  for (const item of items) {
    // Items must be reachable without stepping onto the exit (which ends the level).
    assert.ok(reachable(state.maze, state.start, item, state.exit), `${label}: item ${ptKey(item)} unreachable`);
  }

  const occupied = [state.start, state.exit, ...items, ...(state.guardHome ? [state.guardHome] : [])];
  assert.equal(keysOf(occupied).size, occupied.length, `${label}: two things share a cell`);

  assert.equal(state.gemTotal, state.gems.length);
  assert.equal(state.hasKey, false);
  assert.equal(state.needsKey, state.key !== null, `${label}: needsKey/key mismatch`);
  assert.equal(state.guard !== null, state.guardHome !== null);
  assert.equal(state.candle !== null, state.fogRadius !== null, `${label}: fog without candle`);

  if (state.ice) {
    assert.equal(state.iceFallback, false, `${label}: an icy level cannot also report an ice fallback`);
    assert.ok(
      iceRouteOk(state.maze, state.start, state.exit, state.key, state.portals),
      `${label}: ice level not solvable/escapable from start`,
    );
  }
}

describe("buildLevel", () => {
  it("produces valid campaign levels 1..30", () => {
    for (let level = 1; level <= 30; level++) {
      for (let i = 0; i < 8; i++) assertLevelInvariants(buildLevel(level), `campaign L${level}#${i}`);
    }
  });

  it("keeps ice on every campaign ice level and never reports a fallback for it", () => {
    // Levels 9, 10 and the combos at 14/16/17/19 (+7n) request ice.
    for (const level of [9, 10, 14, 16, 17, 19, 21, 23, 24, 26]) {
      for (let i = 0; i < 10; i++) {
        const state = buildLevel(level);
        assert.equal(state.ice, true, `level ${level}`);
        assert.equal(state.iceFallback, false, `level ${level}`);
      }
    }
  });

  it("does not report an ice fallback on levels that never asked for ice", () => {
    for (const level of [1, 2, 5, 8, 11, 13, 20]) assert.equal(buildLevel(level).iceFallback, false);
  });

  it("introduces modifiers on the documented campaign levels", () => {
    assert.equal(buildLevel(1).needsKey, false);
    assert.equal(buildLevel(2).needsKey, true);
    assert.notEqual(buildLevel(3).guardHome, null);
    assert.notEqual(buildLevel(4).portals, null);
    assert.notEqual(buildLevel(6).fogRadius, null);
    assert.equal(buildLevel(9).ice, true);
    assert.equal(buildLevel(11).shifting, true);
    assert.equal(buildLevel(4).trailLife, null);
    assert.equal(buildLevel(5).trailLife, 40);
    assert.equal(buildLevel(13).trailLife, 10);
  });

  it("produces valid custom levels with every modifier on, even on the smallest grid", () => {
    for (const level of [1, 2, 3, 5, 10, 99]) {
      const custom: CustomSetup = {
        level,
        key: true,
        ghost: true,
        portals: true,
        fog: true,
        ice: true,
        shifting: true,
        footprints: "fading",
      };
      for (let i = 0; i < 8; i++) {
        const state = buildLevel(level, custom);
        assertLevelInvariants(state, `custom L${level}#${i}`);
        assert.equal(state.needsKey, true);
        assert.notEqual(state.guardHome, null);
        assert.notEqual(state.portals, null);
        assert.notEqual(state.fogRadius, null);
        assert.equal(state.ice, true, "requested ice must never be silently dropped");
        assert.equal(state.shifting, true);
        assert.ok(state.trailLife !== null && state.trailLife > 0);
      }
    }
  });

  it("caps the grid at 26x15", () => {
    const state = buildLevel(99);
    assert.equal(state.maze[0].length, 26);
    assert.equal(state.maze.length, 15);
  });

  it("honours footprint settings in custom mode", () => {
    const base: CustomSetup = {
      level: 3,
      key: false,
      ghost: false,
      portals: false,
      fog: false,
      ice: false,
      shifting: false,
      footprints: "permanent",
    };
    assert.equal(buildLevel(3, base).trailLife, null);
    assert.equal(buildLevel(3, { ...base, footprints: "none" }).trailLife, 0);
    assert.equal(buildLevel(3, { ...base, footprints: "fading" }).trailLife, 40);
  });

  it("tolerates non-integer or out-of-range level numbers (corrupted saved data)", () => {
    for (const level of [2.5, 13.5, 0, -1, 1e9]) {
      assert.doesNotThrow(() => buildLevel(level), `level ${level}`);
    }
  });
});

describe("levelBriefing", () => {
  it("derives rank and badges from the built state", () => {
    const training = levelBriefing(buildLevel(1));
    assert.equal(training.rank, "TRAINING");
    assert.deepEqual(training.mods, []);

    const adventure = levelBriefing(buildLevel(2));
    assert.equal(adventure.rank, "ADVENTURE");
    assert.deepEqual(
      adventure.mods.map((m) => m.name),
      ["KEY"],
    );

    const rising = levelBriefing(buildLevel(3));
    assert.equal(rising.rank, "RISING");
    assert.ok(rising.mods.some((m) => m.name === "GHOST"));

    const perilous = levelBriefing(buildLevel(5));
    assert.equal(perilous.rank, "PERILOUS");
  });

  it("reports CHAOS only when every hazard is present", () => {
    const all: CustomSetup = {
      level: 20,
      key: true,
      ghost: true,
      portals: true,
      fog: true,
      ice: true,
      shifting: true,
      footprints: "none",
    };
    const chaos = levelBriefing(buildLevel(20, all));
    assert.equal(chaos.rank, chaos.mods.some((m) => m.name === "ICE") ? "CHAOS" : "NIGHTMARE");
    const nightmare = levelBriefing(buildLevel(20, { ...all, ice: false }));
    assert.equal(nightmare.rank, "NIGHTMARE");
    assert.ok(nightmare.mods.some((m) => m.name === "NO TRAIL"));
  });
});
