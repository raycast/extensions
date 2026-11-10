import { test } from "node:test";
import assert from "node:assert/strict";
import { arrange, assignDisplays, freshLimits, LIMIT_TTL_MS, type System, type Win } from "./arrange.ts";
import { master, rotated, rows, sidebar } from "./layouts.ts";

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
      const failed: { id: string; name: string }[] = [];
      for (const { id, frame } of placements) {
        const w = state.find((x) => x.id === id)!;
        if (w.stuck) {
          failed.push({ id, name: id });
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
  assert.deepEqual(await arrange(system, rows(2)), { count: 2, failed: [], passes: 1 });
  assert.equal(system.calls, 1);
});

test("one pass moves windows once even when an app clamps", async () => {
  const at = (x: number) => ({ x, y: 0, width: 600, height: 800 });
  const { system, frame } = fake([
    { id: "a", frame: at(0), minWidth: 700 },
    { id: "b", frame: at(600) },
  ]);
  await arrange(system, rotated(rows(), 1), 1);
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
  assert.deepEqual(await arrange(system, rows(2)), { count: 0, failed: [], passes: 1 });
  assert.equal(system.calls, 0);
});

test("windows that can't be moved are reported", async () => {
  const { system } = fake([{ id: "a" }, { id: "b", stuck: true }]);
  assert.deepEqual(await arrange(system, rows(2)), { count: 2, failed: [{ id: "b", name: "b" }], passes: 1 });
});

test("master keeps the window it picked first as the master when an app clamps", async () => {
  const { system, frame } = fake([
    { id: "big", frame: { x: 0, y: 0, width: 900, height: 700 } },
    { id: "wide", frame: { x: 0, y: 0, width: 1000, height: 400 }, minWidth: 1000 },
  ]);
  await arrange(system, master({ side: "left" }));
  assert.deepEqual(frame("big"), { x: 0, y: 0, width: 200, height: 800 });
  assert.equal(frame("wide").x, 200);
});

test("sizes learned on an earlier run are used straight away, so windows move once", async () => {
  const wins = [
    { id: "settings", minWidth: 800, frame: { x: 0, y: 0, width: 800, height: 600 } },
    { id: "chat", frame: { x: 900, y: 0, width: 100, height: 100 } },
  ];
  const learned = new Map();
  await arrange(fake(wins).system, rows(2), 3, learned);
  const { system, frame } = fake(wins);
  await arrange(system, rows(2), 3, learned);
  assert.equal(system.calls, 1);
  assert.deepEqual(frame("chat"), { x: 800, y: 0, width: 400, height: 800 });
});

test("a remembered minimum is forgotten once its window is seen smaller", async () => {
  const learned = new Map([["a", { min: { width: 900, height: 700 } }]]);
  const { system, frame } = fake([{ id: "a" }, { id: "b", frame: { x: 900, y: 0, width: 100, height: 100 } }]);
  await arrange(system, rows(2), 3, learned);
  assert.deepEqual(learned.get("a")?.min, {});
  assert.deepEqual(frame("a"), { x: 0, y: 0, width: 600, height: 800 });
});

test("on a retry only the windows that have to make room move again", async () => {
  const moved: string[][] = [];
  const at = (x: number, y: number) => ({ x, y, width: 100, height: 100 });
  const { system } = fake([
    { id: "a", frame: at(0, 0) },
    { id: "b", frame: at(500, 0), minWidth: 500 },
    { id: "e", frame: at(900, 0) },
    { id: "c", frame: at(0, 500) },
    { id: "d", frame: at(900, 500) },
  ]);
  const place = system.place;
  system.place = (p) => (moved.push(p.map((x) => x.id).sort()), place(p));
  await arrange(system, rows(2));
  // b clamps in the top row. It is asked once more to be sure, then its neighbours make room.
  // The bottom row is already right and stays put.
  assert.deepEqual(moved, [["a", "b", "c", "d", "e"], ["b"], ["a", "b", "e"]]);
});

test("a window with a maximum width keeps it and its neighbour fills the rest", async () => {
  const { system, frame } = fake([{ id: "a" }, { id: "settings", frame: { x: 900, y: 0, width: 100, height: 100 } }]);
  const place = system.place;
  system.place = async (p) => {
    const failed = await place(p);
    const w = frame("settings");
    w.width = Math.min(w.width, 400);
    return failed;
  };
  const learned = new Map();
  await arrange(system, rows(2), 3, learned);
  assert.deepEqual(frame("a"), { x: 0, y: 0, width: 800, height: 800 });
  assert.equal(frame("settings").width, 400);
  assert.deepEqual(learned.get("settings")?.max, { width: 400 });
});

test("a remembered maximum is forgotten once its window is seen bigger", async () => {
  const learned = new Map([["a", { max: { width: 300 } }]]);
  const { system, frame } = fake([
    { id: "a", frame: { x: 0, y: 0, width: 500, height: 500 } },
    { id: "b", frame: { x: 900, y: 0, width: 100, height: 100 } },
  ]);
  await arrange(system, rows(2), 3, learned);
  assert.deepEqual(learned.get("a")?.max, {});
  assert.equal(frame("a").width, 600);
});

test("running a layout again moves nothing", async () => {
  const { system } = fake([{ id: "a" }, { id: "b", frame: { x: 900, y: 0, width: 100, height: 100 } }]);
  await arrange(system, master({ side: "left" }));
  const calls = system.calls;
  await arrange(system, master({ side: "left" }));
  assert.equal(system.calls, calls);
});

test("with activeOnly, only the screen holding the active window moves", async () => {
  const small = { x: 0, y: 0, width: 800, height: 600 };
  const { system, frame } = fake(
    [
      { id: "a", active: true },
      { id: "b", frame: { x: 700, y: 0, width: 100, height: 100 } },
      { id: "c", screen: 1, frame: { x: 10, y: 10, width: 100, height: 100 } },
    ],
    [screen, small],
  );
  await arrange(system, rows(2), 3, new Map(), true);
  assert.equal(frame("a").width, 600);
  assert.deepEqual(frame("c"), { x: 10, y: 10, width: 100, height: 100 });
});

test("a window that is slow to resize is asked again, not remembered as a limit", async () => {
  const { system, frame } = fake([{ id: "a" }, { id: "slow", frame: { x: 900, y: 0, width: 100, height: 100 } }]);
  // The first time it is moved, "slow" keeps its old size
  let first = true;
  const place = system.place;
  system.place = async (p) => {
    const before = { ...frame("slow") };
    const failed = await place(p);
    if (first && p.some((x) => x.id === "slow")) {
      first = false;
      Object.assign(frame("slow"), { width: before.width, height: before.height });
    }
    return failed;
  };
  const learned = new Map();
  await arrange(system, rows(2), 3, learned);
  assert.equal(learned.size, 0);
  assert.deepEqual(frame("slow"), { x: 600, y: 0, width: 600, height: 800 });
});

test("distribute gives each display a share by size and keeps the active window where it is", () => {
  const big = { x: 0, y: 0, width: 2560, height: 1440 };
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const win = (id: string, screen: number, x: number, active = false): Win => ({
    id,
    screen,
    active,
    resizable: true,
    frame: { x, y: 0, width: 100 + x / 10, height: 100 },
  });
  // Everything on the small display
  const wins = [win("a", 1, 0, true), win("b", 1, 300), win("c", 1, 600), win("d", 1, 900)];
  const on = assignDisplays(wins, [big, small], rows(2));
  assert.equal(on.get("a"), 1);
  const counts = [0, 1].map((k) => [...on.values()].filter((s) => s === k).length);
  assert.ok(counts[0] >= 2, `big display got ${counts[0]}`);
});

test("distribute moves windows off a display that can't fit them", () => {
  const big = { x: 0, y: 0, width: 2560, height: 1440 };
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const win = (id: string, screen: number, minW: number, active = false): Win => ({
    id,
    screen,
    active,
    resizable: true,
    frame: { x: 0, y: 0, width: minW, height: 400 },
  });
  // Too wide to sit side by side and too tall to stack on the small display
  const learned = new Map([
    ["s", { min: { width: 800, height: 600 } }],
    ["t", { min: { width: 840, height: 600 } }],
  ]);
  const wins = [win("s", 1, 800, true), win("t", 1, 840), win("x", 0, 300), win("y", 0, 300), win("z", 0, 300)];
  const on = assignDisplays(wins, [big, small], rows(2), learned);
  assert.equal(on.get("s"), 1);
  assert.equal(on.get("t"), 0);
});

test("distribute moves the window already nearest the other display", () => {
  const big = { x: 0, y: 0, width: 2560, height: 1440 };
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  // The small display sits below the big one
  const origins = [
    { x: 0, y: 0 },
    { x: 500, y: 1440 },
  ];
  const win = (id: string, x: number, y: number, active = false): Win => ({
    id,
    screen: 0,
    active,
    resizable: true,
    frame: { x, y, width: 800, height: 700 },
  });
  const wins = [win("top-left", 0, 0, true), win("top-right", 1700, 0), win("bottom", 900, 740), win("top", 850, 0)];
  const on = assignDisplays(wins, [big, small], rows(2), new Map(), origins);
  assert.deepEqual(
    wins.map((w) => on.get(w.id)),
    [0, 0, 1, 0],
  );
});

test("distribute swaps a window that doesn't fit for one that does, instead of leaving a display short", () => {
  const big = { x: 0, y: 0, width: 2560, height: 1440 };
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const win = (id: string, screen: number, x: number, active = false): Win => ({
    id,
    screen,
    active,
    resizable: true,
    frame: { x, y: 0, width: 500, height: 700 },
  });
  // Settings and music are both too wide and too tall to share the small display
  const learned = new Map([
    ["settings", { min: { width: 800, height: 434 }, max: { width: 800 } }],
    ["music", { min: { width: 800, height: 600 } }],
  ]);
  const wins = [
    win("settings", 1, 0),
    win("music", 1, 700),
    win("a", 0, 0, true),
    win("b", 0, 520),
    win("c", 0, 1040),
    win("d", 0, 1560),
    win("e", 0, 2060),
  ];
  const on = assignDisplays(wins, [big, small], rows(2), learned);
  const onSmall = wins.filter((w) => on.get(w.id) === 1).map((w) => w.id);
  assert.equal(onSmall.length, 2);
  assert.ok(!(onSmall.includes("settings") && onSmall.includes("music")));
});

test("learned limits expire, so one bad reading can't stick", () => {
  const now = 1_000_000_000;
  const learned = new Map([
    ["fresh", { min: { width: 800 }, at: now - 1000 }],
    ["stale", { min: { width: 1375 }, at: now - LIMIT_TTL_MS - 1 }],
    ["undated", { min: { width: 900 } }],
  ]);
  assert.deepEqual([...freshLimits(learned, now).keys()], ["fresh"]);
});
