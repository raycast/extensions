import { test } from "node:test";
import assert from "node:assert/strict";
import { pickWindow, planMoves, type Screen, type WindowInfo } from "../src/lib/geometry.ts";

// MacBook-ish: 1512x982, 37px menu bar, 70px Dock at the bottom.
const laptop: Screen = { frame: { x: 0, y: 0, w: 1512, h: 982 }, visible: { x: 0, y: 37, w: 1512, h: 875 } };
const dock = { x: 300, y: 916, w: 900, h: 66 };
const opts = { margin: 8, shrink: true, ignoredApps: [] as string[] };

const win = (frame: WindowInfo["frame"], extra: Partial<WindowInfo> = {}): WindowInfo => ({
  pid: 1,
  app: "SomeApp",
  index: 0,
  title: "",
  frame,
  minimized: false,
  fullscreen: false,
  ...extra,
});

test("lifts a window that pokes under the Dock", () => {
  const [m] = planMoves([laptop], [win({ x: 400, y: 600, w: 500, h: 400 })], dock, opts);
  assert.deepEqual(m.to, { x: 400, y: 904 - 400, w: 500, h: 400 });
});

test("leaves windows that already fit", () => {
  assert.equal(planMoves([laptop], [win({ x: 400, y: 100, w: 500, h: 400 })], dock, opts).length, 0);
});

test("ignores windows in the strip but not over the Dock icons", () => {
  assert.equal(planMoves([laptop], [win({ x: 10, y: 700, w: 200, h: 260 })], dock, opts).length, 0);
});

test("without a known Dock rect, anything in the strip moves", () => {
  assert.equal(planMoves([laptop], [win({ x: 10, y: 700, w: 200, h: 260 })], null, opts).length, 1);
});

test("shrinks windows taller than the free space", () => {
  const [m] = planMoves([laptop], [win({ x: 400, y: 37, w: 500, h: 945 })], dock, opts);
  assert.deepEqual(m.to, { x: 400, y: 37, w: 500, h: 904 - 37 });
});

test("moves without shrinking when shrink is off", () => {
  const noShrink = { ...opts, shrink: false };
  const [m] = planMoves([laptop], [win({ x: 400, y: 100, w: 500, h: 900 })], dock, noShrink);
  assert.deepEqual(m.to, { x: 400, y: 37, w: 500, h: 900 });
  // already as high as it goes: nothing to do
  assert.equal(planMoves([laptop], [win({ x: 400, y: 37, w: 500, h: 945 })], dock, noShrink).length, 0);
});

test("skips minimized, fullscreen, tiny, system and ignored apps", () => {
  const f = { x: 400, y: 600, w: 500, h: 400 };
  const moves = planMoves(
    [laptop],
    [
      win(f, { minimized: true }),
      win(f, { fullscreen: true }),
      win({ x: 400, y: 900, w: 20, h: 20 }),
      win(f, { app: "Dock" }),
      win(f, { app: "Raycast" }),
      win(f, { app: "Finder" }),
    ],
    dock,
    { ...opts, ignoredApps: ["finder"] },
  );
  assert.equal(moves.length, 0);
});

test("does nothing when the Dock auto-hides (visible == frame at the bottom)", () => {
  const autohide: Screen = { frame: laptop.frame, visible: { x: 0, y: 37, w: 1512, h: 945 } };
  assert.equal(planMoves([autohide], [win({ x: 400, y: 700, w: 500, h: 400 })], null, opts).length, 0);
});

test("Dock on the left pushes windows right", () => {
  const left: Screen = { frame: laptop.frame, visible: { x: 80, y: 37, w: 1432, h: 945 } };
  const leftDock = { x: 4, y: 200, w: 70, h: 600 };
  const [m] = planMoves([left], [win({ x: 20, y: 300, w: 600, h: 400 })], leftDock, opts);
  assert.deepEqual(m.to, { x: 88, y: 300, w: 600, h: 400 });
});

test("Dock on the right pushes windows left", () => {
  const right: Screen = { frame: laptop.frame, visible: { x: 0, y: 37, w: 1432, h: 945 } };
  const rightDock = { x: 1438, y: 200, w: 70, h: 600 };
  const [m] = planMoves([right], [win({ x: 1000, y: 300, w: 600, h: 400 })], rightDock, opts);
  assert.deepEqual(m.to, { x: 1424 - 600, y: 300, w: 600, h: 400 });
});

test("second display without a Dock is left alone", () => {
  const external: Screen = {
    frame: { x: 1512, y: -500, w: 2560, h: 1440 },
    visible: { x: 1512, y: -475, w: 2560, h: 1415 },
  };
  const moves = planMoves([laptop, external], [win({ x: 2000, y: 600, w: 800, h: 335 })], dock, opts);
  assert.equal(moves.length, 0);
});

test("Dock on the external display, window on the laptop is untouched by the laptop strip", () => {
  const laptopNoDock: Screen = { frame: laptop.frame, visible: { x: 0, y: 37, w: 1512, h: 945 } };
  const external: Screen = {
    frame: { x: 1512, y: 0, w: 2560, h: 1440 },
    visible: { x: 1512, y: 25, w: 2560, h: 1335 },
  };
  const extDock = { x: 2300, y: 1364, w: 1000, h: 76 };
  const moves = planMoves(
    [laptopNoDock, external],
    [win({ x: 100, y: 600, w: 500, h: 380 }), win({ x: 2500, y: 1000, w: 600, h: 420 }, { pid: 2 })],
    extDock,
    opts,
  );
  assert.equal(moves.length, 1);
  assert.equal(moves[0].pid, 2);
  assert.deepEqual(moves[0].to, { x: 2500, y: 1352 - 420, w: 600, h: 420 });
});

test("a gap that leaves no room moves nothing instead of squashing windows", () => {
  const huge = { ...opts, margin: 900 };
  assert.equal(planMoves([laptop], [win({ x: 400, y: 600, w: 500, h: 400 })], dock, huge).length, 0);
  const left: Screen = { frame: laptop.frame, visible: { x: 80, y: 37, w: 1432, h: 945 } };
  assert.equal(planMoves([left], [win({ x: 20, y: 300, w: 600, h: 400 })], null, { ...opts, margin: 1500 }).length, 0);
});

test("two same-app windows with the same frame each get moved", () => {
  const f = { x: 400, y: 600, w: 500, h: 400 };
  const moves = planMoves([laptop], [win(f, { index: -1 }), win(f, { index: -1 })], dock, opts);
  assert.equal(moves.length, 2);

  // What the apply script sees for that app: both windows still at the old frame.
  const pos = [
    [f.x, f.y],
    [f.x, f.y],
  ];
  const size = [
    [f.w, f.h],
    [f.w, f.h],
  ];
  const used: number[] = [];
  for (const m of moves) {
    const idx = pickWindow(pos, size, m.from, m.index, used);
    assert.notEqual(idx, -1);
    used.push(idx);
  }
  assert.deepEqual(used, [0, 1]);
  assert.equal(pickWindow(pos, size, f, -1, used), -1);
});

test("pickWindow prefers the hinted index and skips moved windows", () => {
  const pos = [
    [0, 0],
    [400, 600],
    [400, 600],
  ];
  const size = [
    [100, 100],
    [500, 400],
    [500, 400],
  ];
  const from = { x: 400, y: 600, w: 500, h: 400 };
  assert.equal(pickWindow(pos, size, from, 2, []), 2);
  assert.equal(pickWindow(pos, size, from, 0, []), 1);
  assert.equal(pickWindow(pos, size, { x: 1, y: 1, w: 1, h: 1 }, -1, []), -1);
});
