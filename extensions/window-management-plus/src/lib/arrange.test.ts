import { test } from "node:test";
import assert from "node:assert/strict";
import { arrange, type System, type Win } from "./arrange.ts";
import { focus, rotate, rows, sidebar } from "./layouts.ts";

const screen = { x: 0, y: 0, width: 1200, height: 800 };

type FakeWin = Partial<Win> & { id: string; minWidth?: number; stuck?: boolean };

/** An in-memory window system. Windows refuse to go narrower than `minWidth`, like real apps do. `stuck` ones can't be moved. */
const fake = (wins: FakeWin[], areas = [screen]) => {
  const state = wins.map((w) => ({
    screen: 0,
    resizable: true,
    frame: { x: 0, y: 0, width: 100, height: 100 },
    ...w,
  }));
  const system: System & { calls: number } = {
    calls: 0,
    areas: async () => areas,
    windows: async () => state.map((w) => ({ ...w })),
    place: async (placements) => {
      system.calls++;
      const failed: string[] = [];
      for (const { id, frame } of placements) {
        const w = state.find((x) => x.id === id)!;
        if (w.stuck) {
          failed.push(id);
          continue;
        }
        w.frame = w.resizable
          ? { ...frame, width: Math.max(frame.width, w.minWidth ?? 0) }
          : { ...w.frame, x: frame.x, y: frame.y };
      }
      return failed;
    },
  };
  const frame = (id: string) => state.find((w) => w.id === id)!.frame;
  return { system, frame };
};

test("an app that clamps its width keeps it, and the neighbour takes what is left", async () => {
  const { system, frame } = fake([
    { id: "settings", minWidth: 800 },
    { id: "chat", frame: { x: 900, y: 0, width: 100, height: 100 } },
  ]);
  await arrange(system, rows(2));
  assert.deepEqual(frame("settings"), { x: 0, y: 0, width: 800, height: 800 });
  assert.deepEqual(frame("chat"), { x: 800, y: 0, width: 400, height: 800 });
});

test("windows that take the size they are given are placed once", async () => {
  const { system } = fake([{ id: "a" }, { id: "b" }]);
  assert.deepEqual(await arrange(system, rows(2)), { count: 2, failed: [] });
  assert.equal(system.calls, 1);
});

test("one pass moves windows once even when an app clamps", async () => {
  const at = (x: number) => ({ x, y: 0, width: 600, height: 800 });
  const { system, frame } = fake([
    { id: "a", frame: at(0), minWidth: 700 },
    { id: "b", frame: at(600) },
  ]);
  await arrange(system, rotate(1), 1);
  assert.equal(system.calls, 1);
  assert.equal(frame("a").x, 600);
  assert.equal(frame("b").x, 0);
});

test("each screen is laid out in its own area", async () => {
  const small = { x: 0, y: 0, width: 800, height: 600 };
  const { system, frame } = fake([{ id: "a" }, { id: "b", screen: 1 }], [screen, small]);
  await arrange(system, rows(2));
  assert.deepEqual(frame("a"), screen);
  assert.deepEqual(frame("b"), small);
});

test("a window that can't resize is moved but keeps its size", async () => {
  const { system, frame } = fake([
    { id: "a" },
    {
      id: "calc",
      resizable: false,
      frame: { x: 700, y: 0, width: 300, height: 400 },
    },
  ]);
  await arrange(system, rows(2));
  assert.deepEqual(frame("calc"), { x: 900, y: 200, width: 300, height: 400 });
  assert.equal(frame("a").width, 900);
});

test("a sidebar that clamps wider than asked still ends flush with the right edge", async () => {
  const { system, frame } = fake([{ id: "a" }, { id: "notes", title: "Notes", minWidth: 420 }]);
  await arrange(
    system,
    sidebar((i) => i.title === "Notes", 200, rows(2)),
  );
  assert.deepEqual(frame("notes"), { x: 780, y: 0, width: 420, height: 800 });
  assert.equal(frame("a").width, 780);
});

test("nothing is placed when there are no windows", async () => {
  const { system } = fake([]);
  assert.deepEqual(await arrange(system, rows(2)), { count: 0, failed: [] });
  assert.equal(system.calls, 0);
});

test("windows that can't be moved are reported", async () => {
  const { system } = fake([{ id: "a" }, { id: "b", stuck: true }]);
  assert.deepEqual(await arrange(system, rows(2)), { count: 2, failed: ["b"] });
});

test("focus keeps the window it picked first as the main one when an app clamps", async () => {
  const { system, frame } = fake([
    { id: "big", frame: { x: 0, y: 0, width: 900, height: 700 } },
    { id: "wide", frame: { x: 0, y: 0, width: 1000, height: 400 }, minWidth: 1000 },
  ]);
  await arrange(system, focus({ mainOn: "left" }));
  assert.deepEqual(frame("big"), { x: 0, y: 0, width: 200, height: 800 });
  assert.equal(frame("wide").x, 200);
});
