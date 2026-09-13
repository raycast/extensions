import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLevel } from "../src/maze/level";
import {
  bfsDistances,
  cutPathAtGhost,
  iceExplore,
  iceRouteOk,
  shiftWalls,
  slidePath,
  stepGuard,
} from "../src/maze/rules";
import { DIRECTIONS, samePoint, type Direction } from "../src/maze/types";
import { closeWall, mazeIsWellFormed, openMaze, p, placedItems, reachable } from "./helpers";

describe("bfsDistances", () => {
  it("measures shortest paths and respects walls", () => {
    const maze = openMaze(3, 1);
    assert.deepEqual(bfsDistances(maze, p(0, 0))[0], [0, 1, 2]);
    closeWall(maze, 0, 0, "right");
    assert.deepEqual(bfsDistances(maze, p(0, 0))[0], [0, Infinity, Infinity]);
  });

  it("does not expand through the blocked cell but still reaches it", () => {
    const maze = openMaze(3, 1);
    const dist = bfsDistances(maze, p(0, 0), p(1, 0));
    assert.equal(dist[0][1], 1);
    assert.equal(dist[0][2], Infinity);
  });
});

describe("slidePath", () => {
  const exit = p(4, 0);

  it("moves a single cell when not on ice", () => {
    const maze = openMaze(5, 1);
    const slide = slidePath(maze, p(0, 0), "right", false, null, exit, false);
    assert.deepEqual(slide.cells, [p(1, 0)]);
    assert.equal(slide.warped, false);
  });

  it("returns no cells when facing a wall", () => {
    const maze = openMaze(5, 1);
    const slide = slidePath(maze, p(0, 0), "left", false, null, exit, false);
    assert.deepEqual(slide.cells, []);
    assert.equal(slide.blockedByDoor, false);
  });

  it("slides on ice until a wall", () => {
    const maze = openMaze(5, 1);
    closeWall(maze, 2, 0, "right");
    const slide = slidePath(maze, p(0, 0), "right", true, null, exit, false);
    assert.deepEqual(slide.cells, [p(1, 0), p(2, 0)]);
  });

  it("stops on the exit and reports a locked door only when it is the first step", () => {
    const maze = openMaze(5, 1);
    const open = slidePath(maze, p(0, 0), "right", true, null, exit, false);
    assert.deepEqual(open.cells.at(-1), exit);

    const lockedFar = slidePath(maze, p(0, 0), "right", true, null, exit, true);
    assert.deepEqual(lockedFar.cells, [p(1, 0), p(2, 0), p(3, 0)]);
    assert.equal(lockedFar.blockedByDoor, false);

    const lockedNear = slidePath(maze, p(3, 0), "right", false, null, exit, true);
    assert.deepEqual(lockedNear.cells, []);
    assert.equal(lockedNear.blockedByDoor, true);
  });

  it("warps through portals and stops on the other side", () => {
    const maze = openMaze(5, 2);
    const portals: [ReturnType<typeof p>, ReturnType<typeof p>] = [p(2, 0), p(0, 1)];
    const slide = slidePath(maze, p(0, 0), "right", true, portals, p(4, 1), false);
    assert.deepEqual(slide.cells, [p(1, 0), p(2, 0), p(0, 1)]);
    assert.equal(slide.warped, true);
  });
});

describe("iceExplore / iceRouteOk", () => {
  it("finds a straight slide to the exit solvable and escapable", () => {
    const maze = openMaze(4, 1);
    const result = iceExplore(maze, p(0, 0), p(3, 0), null, null);
    assert.equal(result.solvable, true);
    assert.equal(result.escapable, true);
    assert.equal(iceRouteOk(maze, p(0, 0), p(3, 0), null, null), true);
  });

  it("detects a reachable one-way trap (solvable but not escapable)", () => {
    // 3x3, start (2,0), exit (1,2).
    //   Win:  start ← (1,0), then ↓ slides through (1,1) onto the exit.
    //   Trap: start ↓ stops on (2,1) (wall below), ← slides to (0,1). From (0,1) a vertical
    //         slide lands on (0,0) or (0,2); those two only ever bounce between each other.
    const maze = openMaze(3, 3);
    closeWall(maze, 0, 0, "right");
    closeWall(maze, 0, 2, "right");
    closeWall(maze, 2, 1, "bottom");
    const start = p(2, 0);
    const exit = p(1, 2);
    const result = iceExplore(maze, start, exit, null, null);
    assert.equal(result.solvable, true, "start can reach the exit via (1,0)");
    assert.equal(result.escapable, false, "the (0,0)/(0,2) pocket can never win");
    assert.ok(result.visited.has("0,0") && result.visited.has("0,2"));
    assert.equal(iceRouteOk(maze, start, exit, null, null), false);
    // From inside the trap the level is unsolvable, which is what the "boxed in" check uses.
    assert.equal(iceExplore(maze, p(0, 0), exit, null, null).solvable, false);
  });

  it("collects the key mid-slide, and only the next slide may enter the exit", () => {
    const maze = openMaze(4, 1);
    const key = p(2, 0);
    const exit = p(3, 0);
    const first = slidePath(maze, p(0, 0), "right", true, null, exit, true);
    assert.deepEqual(first.cells, [p(1, 0), p(2, 0)], "door was locked when the slide began");
    const result = iceExplore(maze, p(0, 0), exit, key, null);
    assert.equal(result.visited.has("2,0"), true);
    assert.equal(result.solvable, true);
    assert.equal(result.escapable, true);
  });
});

describe("cutPathAtGhost", () => {
  const path = [p(1, 0), p(2, 0), p(3, 0), p(4, 0)];

  it("leaves the path alone without a ghost or when the ghost is off the path", () => {
    assert.deepEqual(cutPathAtGhost(path, null), path);
    assert.deepEqual(cutPathAtGhost(path, p(0, 5)), path);
  });

  it("stops the traversal on the ghost's cell, dropping everything past it", () => {
    assert.deepEqual(cutPathAtGhost(path, p(2, 0)), [p(1, 0), p(2, 0)]);
    assert.deepEqual(cutPathAtGhost(path, p(4, 0)), path);
    assert.deepEqual(cutPathAtGhost(path, p(1, 0)), [p(1, 0)]);
  });

  it("catches the player mid-slide on ice", () => {
    const maze = openMaze(6, 1);
    const slide = slidePath(maze, p(0, 0), "right", true, null, p(5, 0), false);
    assert.equal(slide.cells.length, 5, "full slide reaches the exit");
    const cut = cutPathAtGhost(slide.cells, p(3, 0));
    assert.deepEqual(cut.at(-1), p(3, 0), "player lands on the ghost, not the exit");
  });
});

describe("stepGuard", () => {
  it("stays put when boxed in", () => {
    const maze = openMaze(3, 1);
    closeWall(maze, 0, 0, "right");
    assert.deepEqual(stepGuard(maze, p(0, 0), p(2, 0), 1), p(0, 0));
  });

  it("always moves toward the player when chasing", () => {
    const maze = openMaze(5, 1);
    for (let i = 0; i < 20; i++) assert.deepEqual(stepGuard(maze, p(1, 0), p(4, 0), 1), p(2, 0));
  });
});

describe("shiftWalls", () => {
  const dirs = Object.keys(DIRECTIONS) as Direction[];

  it("keeps the maze well-formed and every target reachable from player and start (no ice)", () => {
    for (let i = 0; i < 150; i++) {
      const g = buildLevel(11);
      let maze = g.maze;
      // Walk a few random steps away from the start first.
      let player = g.start;
      for (let m = 0; m < 8; m++) {
        const slide = slidePath(maze, player, dirs[Math.floor(Math.random() * 4)], false, null, g.exit, true);
        if (slide.cells.length) player = slide.cells[0];
      }
      for (let s = 0; s < 10; s++) {
        const mustReach = [...placedItems(g), g.exit];
        const shifted = shiftWalls(maze, player, g.start, g.exit, mustReach, false, g.key, g.portals);
        if (!shifted) continue;
        maze = shifted;
        assert.ok(mazeIsWellFormed(maze), "border/symmetry broken");
        for (const target of mustReach) {
          assert.ok(reachable(maze, player, target, g.exit), `player lost ${target.x},${target.y}`);
          assert.ok(reachable(maze, g.start, target, g.exit), `start lost ${target.x},${target.y}`);
        }
      }
    }
  });

  it("on ice, the start cell stays solvable after a shift validated away from it (regression)", () => {
    const custom = {
      level: 6,
      key: false,
      ghost: false,
      portals: false,
      fog: false,
      ice: true,
      shifting: true,
      footprints: "permanent" as const,
    };
    let checked = 0;
    for (let i = 0; i < 300 && checked < 100; i++) {
      const g = buildLevel(6, custom);
      assert.equal(g.ice, true, "requested ice must be kept");
      let player = g.start;
      for (let m = 0; m < 6; m++) {
        const slide = slidePath(g.maze, player, dirs[Math.floor(Math.random() * 4)], true, null, g.exit, false);
        const landing = slide.cells.at(-1);
        if (landing && !samePoint(landing, g.exit)) player = landing;
      }
      if (samePoint(player, g.start)) continue;
      const shifted = shiftWalls(g.maze, player, g.start, g.exit, [g.exit], true, null, null);
      if (!shifted) continue;
      checked++;
      assert.ok(mazeIsWellFormed(shifted));
      assert.ok(iceRouteOk(shifted, player, g.exit, null, null), "player route broken");
      assert.ok(iceRouteOk(shifted, g.start, g.exit, null, null), "start route broken");
    }
    assert.ok(checked >= 50, `only ${checked} shifts could be checked`);
  });

  it("returns null instead of an invalid layout when nothing works", () => {
    // A 1-row corridor has no wall that can be closed without cutting the exit off.
    const maze = openMaze(3, 1);
    const result = shiftWalls(maze, p(0, 0), p(0, 0), p(2, 0), [p(2, 0)], false, null, null);
    // Opening is impossible (no closed interior wall) so the function bails out early.
    assert.equal(result, null);
  });
});
