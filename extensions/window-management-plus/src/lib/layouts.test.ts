import { test } from "node:test";
import assert from "node:assert/strict";
import {
  carry,
  leading,
  master,
  nextPivot,
  ranked,
  rotated,
  rows,
  shares,
  sidebar,
  stacking,
  swappedNext,
  transposed,
  withMaster,
  type Item,
  type Placement,
} from "./layouts.ts";

const box = { x: 0, y: 0, width: 1200, height: 800 };
const item = (id: string, width = 100, height = 100, fixed?: Item["fixed"]): Item => ({
  id,
  frame: { x: 0, y: 0, width, height },
  fixed,
});

test("two rows split six windows into 3 + 3 with no gaps", () => {
  const out = rows(2)(
    ["a", "b", "c", "d", "e", "f"].map((id) => item(id)),
    box,
  );
  assert.equal(out.length, 6);
  assert.deepEqual(out[0].frame, { x: 0, y: 0, width: 400, height: 400 });
  assert.deepEqual(out[5].frame, { x: 800, y: 400, width: 400, height: 400 });
});

test("a fixed window keeps its size and the others share the rest", () => {
  const out = rows(2)([item("a"), item("b", 100, 100, { width: 400, height: 300 })], box);
  const b = out.find((p) => p.id === "b")!;
  assert.equal(b.frame.width, 400);
  assert.equal(b.frame.height, 300);
});

test("the master takes all the stack can spare, so the other windows are as narrow as they go", () => {
  const out = master({ side: "left" })([item("s1"), item("big", 900, 700), item("s2")], box);
  const big = out.find((p) => p.id === "big")!;
  assert.deepEqual(big.frame, { x: 0, y: 0, width: 960, height: 800 });
  assert.deepEqual(frameOf(out, "s1"), { x: 960, y: 0, width: 240, height: 400 });
});

test("a stack window keeps the minimum width its app insists on, and the master takes the rest", () => {
  const wide = { ...item("s1"), min: { width: 500 } };
  const out = master({ side: "left" })([wide, item("big", 900, 700), item("s2")], box);
  assert.equal(frameOf(out, "big").width, 700);
  assert.equal(frameOf(out, "s1").width, 500);
  assert.equal(frameOf(out, "s2").width, 500);
});

test("a smaller share shrinks the master and widens the stack", () => {
  const out = master({ side: "left", ratio: 0.7 })([item("s1"), item("big", 900, 700)], box);
  assert.equal(frameOf(out, "big").width, 840);
  assert.equal(frameOf(out, "s1").width, 360);
});

test("master in the center splits the stack across both sides", () => {
  const at = (id: string, x: number, w = 100) => ({ ...item(id, w, w), frame: { x, y: 0, width: w, height: w } });
  const out = master({ side: "center", ratio: 0.5 })([at("big", 400, 600), at("a", 0), at("b", 1100)], box);
  assert.deepEqual(frameOf(out, "big"), { x: 300, y: 0, width: 600, height: 800 });
  assert.equal(frameOf(out, "a").x, 0);
  assert.equal(frameOf(out, "b").x, 900);
});

test("sidebar pins one window full height on the right", () => {
  const out = sidebar((i) => i.id === "n", 300, rows(2))([item("a"), item("n")], box);
  assert.deepEqual(out.find((p) => p.id === "n")!.frame, {
    x: 900,
    y: 0,
    width: 300,
    height: 800,
  });
});

const frameOf = (out: Placement[], id: string): Placement["frame"] => out.find((p) => p.id === id)!.frame;

test("rotate moves every window one slot of the layout", () => {
  const a = { ...item("a"), frame: { x: 0, y: 0, width: 10, height: 10 } };
  const b = { ...item("b"), frame: { x: 900, y: 0, width: 10, height: 10 } };
  const tiled = rows()([a, b], box);
  const out = rotated(rows(), 1)([a, b], box);
  assert.deepEqual(frameOf(out, "a"), frameOf(tiled, "b"));
  assert.deepEqual(frameOf(out, "b"), frameOf(tiled, "a"));
});

test("rotate keeps a pinned sidebar in place and turns the rest", () => {
  const at = (id: string, x: number, title?: string): Item => ({
    ...item(id),
    title,
    frame: { x, y: 0, width: 100, height: 100 },
  });
  const pinned = (i: Item) => i.title === "Notes";
  const layout = sidebar(pinned, 300, rows());
  const items = [at("a", 0), at("b", 400), at("notes", 900, "Notes")];
  const tiled = layout(items, box);
  const out = rotated(layout, 1, pinned)(items, box);
  assert.deepEqual(frameOf(out, "notes"), frameOf(tiled, "notes"));
  assert.deepEqual(frameOf(out, "a"), frameOf(tiled, "b"));
  assert.deepEqual(frameOf(out, "b"), frameOf(tiled, "a"));
});

test("a window rotated into a slot narrower than its minimum still gets its minimum", () => {
  const at = (id: string, x: number, min?: number): Item => ({
    ...item(id),
    min: min ? { width: min } : undefined,
    frame: { x, y: 0, width: 100, height: 100 },
  });
  const out = rotated(rows(), 1)([at("big", 0, 500), at("b", 400), at("c", 900)], box);
  assert.ok(frameOf(out, "big").width >= 500);
  const xs = out.map((p) => p.frame).sort((p, q) => p.x - q.x);
  for (let k = 1; k < xs.length; k++) assert.ok(xs[k].x >= xs[k - 1].x + xs[k - 1].width, "no overlaps");
});

test("swap with master gives the active window the master's slot", () => {
  const layout = master({ side: "left" });
  const items = [item("big", 900, 700), { ...item("s"), active: true }, item("t")];
  const tiled = layout(items, box);
  const out = withMaster(layout)(items, box);
  assert.deepEqual(frameOf(out, "s"), frameOf(tiled, "big"));
  assert.deepEqual(frameOf(out, "big"), frameOf(tiled, "s"));
});

test("master wraps the stack into more columns when minimum heights don't fit", () => {
  const tall = (id: string): Item => ({ ...item(id), min: { height: 500 } });
  const out = master({ side: "left" })([item("big", 900, 700), tall("a"), tall("b")], box);
  const a = out.find((p) => p.id === "a")!.frame;
  const b = out.find((p) => p.id === "b")!.frame;
  assert.notEqual(a.x, b.x);
  assert.equal(out.find((p) => p.id === "big")!.frame.width, 720);
});

test("sidebar keeps the width its app insists on", () => {
  const out = sidebar((i) => i.id === "n", 300, rows(2))([item("a"), { ...item("n"), min: { width: 420 } }], box);
  assert.deepEqual(out.find((p) => p.id === "n")!.frame, {
    x: 780,
    y: 0,
    width: 420,
    height: 800,
  });
  assert.equal(out.find((p) => p.id === "a")!.frame.width, 780);
});

test("a window with a wide minimum gets a full-height column, the other fills the rest", () => {
  const out = rows(2)([{ ...item("settings"), min: { width: 800 } }, item("chat")], box);
  assert.deepEqual(out.find((p) => p.id === "settings")!.frame, {
    x: 0,
    y: 0,
    width: 800,
    height: 800,
  });
  assert.deepEqual(out.find((p) => p.id === "chat")!.frame, {
    x: 800,
    y: 0,
    width: 400,
    height: 800,
  });
});

test("two windows split left and right at full height", () => {
  const out = rows(2)([item("a"), item("b")], box);
  assert.deepEqual(out[0].frame, { x: 0, y: 0, width: 600, height: 800 });
  assert.deepEqual(out[1].frame, { x: 600, y: 0, width: 600, height: 800 });
});

test("tile keeps rough positions: a window dragged right stays right", () => {
  const at = (id: string, x: number): Item => ({
    ...item(id),
    frame: { x, y: 0, width: 100, height: 100 },
  });
  const out = rows(2)([at("a", 900), at("b", 0)], box);
  assert.equal(out.find((p) => p.id === "a")!.frame.x, 600);
  assert.equal(out.find((p) => p.id === "b")!.frame.x, 0);
});

test("rotate turns clockwise: across the top, then back along the bottom", () => {
  const at = (id: string, x: number, y: number): Item => ({
    ...item(id),
    frame: { x, y, width: 100, height: 100 },
  });
  const items = [at("tl", 0, 0), at("tr", 100, 0), at("bl", 0, 100), at("br", 100, 100)];
  const tiled = rows()(items, box);
  const out = rotated(rows(), 1)(items, box);
  assert.deepEqual(frameOf(out, "tl"), frameOf(tiled, "tr"));
  assert.deepEqual(frameOf(out, "tr"), frameOf(tiled, "br"));
  assert.deepEqual(frameOf(out, "br"), frameOf(tiled, "bl"));
  assert.deepEqual(frameOf(out, "bl"), frameOf(tiled, "tl"));
  // Backwards undoes it
  const back = rotated(rows(), -1)(
    items.map((i) => ({ ...i, frame: frameOf(out, i.id) })),
    box,
  );
  for (const i of items) assert.deepEqual(frameOf(back, i.id), frameOf(tiled, i.id));
});

test("wide windows that can't fit side by side take a row each instead of overlapping", () => {
  const box = { x: 0, y: 0, width: 1200, height: 800 };
  const at = (y: number) => ({ x: 0, y, width: 700, height: 300 });
  const out = rows(2)(
    [
      { id: "a", frame: at(0), min: { width: 700 } },
      { id: "b", frame: at(400), min: { width: 700 } },
    ],
    box,
  );
  const [a, b] = ["a", "b"].map((id) => out.find((p) => p.id === id)!.frame);
  assert.deepEqual(a, { x: 0, y: 0, width: 1200, height: 400 });
  assert.deepEqual(b, { x: 0, y: 400, width: 1200, height: 400 });
});

test("a minimum is a floor: a window with room to spare still fills its share", () => {
  const box = { x: 0, y: 0, width: 1200, height: 800 };
  const at = (x: number) => ({ x, y: 0, width: 100, height: 100 });
  const out = rows(2)(
    [
      { id: "dia", frame: at(0), min: { width: 500, height: 446 } },
      { id: "code", frame: at(900) },
    ],
    box,
  );
  assert.deepEqual(out[0].frame, { x: 0, y: 0, width: 600, height: 800 });
  assert.deepEqual(out[1].frame, { x: 600, y: 0, width: 600, height: 800 });
});

test("a window with a maximum keeps it, and the others share what it leaves", () => {
  const box = { x: 0, y: 0, width: 1200, height: 800 };
  const at = (x: number) => ({ x, y: 0, width: 100, height: 100 });
  const out = rows(2)(
    [
      { id: "code", frame: at(0) },
      { id: "settings", frame: at(900), max: { width: 400 } },
    ],
    box,
  );
  assert.deepEqual(out[0].frame, { x: 0, y: 0, width: 800, height: 800 });
  assert.deepEqual(out[1].frame, { x: 800, y: 0, width: 400, height: 800 });
});

test("master run on its own result changes nothing, even when the side wraps into columns", () => {
  const box = { x: 0, y: 0, width: 2560, height: 1440 };
  const tall = { width: 500, height: 600 };
  const at = (x: number, y: number) => ({ x, y, width: 300, height: 300 });
  const items: Item[] = [
    { id: "main", frame: { x: 0, y: 0, width: 1500, height: 1200 } },
    { id: "a", frame: at(2000, 900), min: tall },
    { id: "b", frame: at(1600, 100), min: tall },
    { id: "c", frame: at(2200, 400), min: tall },
  ];
  const layout = master({ side: "left" });
  const once = layout(items, box);
  const moved = items.map((i) => ({ ...i, frame: once.find((p) => p.id === i.id)!.frame }));
  assert.deepEqual(layout(moved, box), once);
});

test("with the main window on the right, rotate goes from the top-left into main, then up the left column", () => {
  const at = (id: string, x: number, y: number, size = 100): Item => ({
    ...item(id),
    frame: { x, y, width: size, height: size },
  });
  const layout = master({ side: "right" });
  const items = [at("main", 600, 0, 600), at("s1", 0, 0), at("s2", 0, 300), at("s3", 0, 600)];
  const tiled = layout(items, box);
  const out = rotated(layout, 1)(items, box);
  assert.deepEqual(frameOf(out, "s1"), frameOf(tiled, "main"));
  assert.deepEqual(frameOf(out, "main"), frameOf(tiled, "s3"));
  assert.deepEqual(frameOf(out, "s3"), frameOf(tiled, "s2"));
  assert.deepEqual(frameOf(out, "s2"), frameOf(tiled, "s1"));
});

test("carry keeps a window's place and size relative to the new screen", () => {
  const big = { x: 0, y: 0, width: 2560, height: 1440 };
  const small = { x: 0, y: 32, width: 1512, height: 950 };
  const right = { ...item("r"), frame: { x: 1280, y: 0, width: 1280, height: 720 } };
  const f = carry(right, big, small);
  assert.deepEqual([f.x, f.y, f.width, f.height].map(Math.round), [756, 32, 756, 475]);
});

test("carry gives a window at least its minimum and keeps it on the new screen", () => {
  const big = { x: 0, y: 0, width: 2560, height: 1440 };
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const wide = { ...item("w"), frame: { x: 1720, y: 0, width: 840, height: 720 }, min: { width: 840 } };
  const f = carry(wide, big, small);
  assert.equal(f.width, 840);
  assert.equal(f.x + f.width, 1512);
});

test("swap with next trades two windows whether they sit side by side or stacked", () => {
  const at = (id: string, x: number, active = false): Item => ({
    ...item(id),
    active,
    frame: { x, y: 0, width: 100, height: 100 },
  });
  const items = [at("a", 0, true), at("b", 900)];
  for (const layout of [rows(), transposed(rows())]) {
    const tiled = layout(items, box);
    const out = swappedNext(layout)(items, box);
    assert.deepEqual(frameOf(out, "a"), frameOf(tiled, "b"));
    assert.deepEqual(frameOf(out, "b"), frameOf(tiled, "a"));
  }
});

test("swap with next goes round clockwise and wraps, leaving the other windows alone", () => {
  const at = (id: string, x: number, y: number, active = false): Item => ({
    ...item(id),
    active,
    frame: { x, y, width: 100, height: 100 },
  });
  const grid = (active: string) => [
    at("tl", 0, 0, active === "tl"),
    at("tr", 600, 0, active === "tr"),
    at("bl", 0, 500, active === "bl"),
    at("br", 600, 500, active === "br"),
  ];
  const tiled = rows()(grid(""), box);
  const fromTop = swappedNext(rows())(grid("tr"), box);
  assert.deepEqual(frameOf(fromTop, "tr"), frameOf(tiled, "br"));
  assert.deepEqual(frameOf(fromTop, "br"), frameOf(tiled, "tr"));
  assert.deepEqual(frameOf(fromTop, "tl"), frameOf(tiled, "tl"));
  // The last window round trades with the first
  const wrapped = swappedNext(rows())(grid("bl"), box);
  assert.deepEqual(frameOf(wrapped, "bl"), frameOf(tiled, "tl"));
});

test("toggle split turns rows into columns", () => {
  const at = (id: string, x: number): Item => ({ ...item(id), frame: { x, y: 0, width: 100, height: 100 } });
  const items = [at("a", 0), at("b", 500), at("c", 1000)];
  // Three side by side become three stacked, in the same order
  const out = transposed(rows())(items, box);
  const third = 800 / 3;
  assert.deepEqual(frameOf(out, "a"), { x: 0, y: 0, width: 1200, height: third });
  assert.deepEqual(frameOf(out, "b"), { x: 0, y: third, width: 1200, height: third });
  assert.deepEqual(frameOf(out, "c"), { x: 0, y: 2 * third, width: 1200, height: third });
});

test("rows give a window with a tall minimum the height it needs instead of overlapping the next row", () => {
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const at = (id: string, y: number, min: { width: number; height: number }): Item => ({
    ...item(id),
    min,
    frame: { x: 0, y, width: 100, height: 100 },
  });
  // Too wide to sit side by side, so they stack. The chat window can't go below 490 tall.
  const out = rows()([at("chat", 0, { width: 900, height: 490 }), at("dia", 500, { width: 900, height: 446 })], small);
  assert.deepEqual(frameOf(out, "chat"), { x: 0, y: 0, width: 1512, height: 490 });
  assert.deepEqual(frameOf(out, "dia"), { x: 0, y: 490, width: 1512, height: 460 });
});

test("when windows can't all fit, the smallest share one slot instead of half-covering each other", () => {
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const at = (id: string, x: number, y: number, min: { width: number; height: number }, active = false): Item => ({
    ...item(id),
    active,
    min,
    frame: { x, y, width: min.width, height: min.height },
  });
  const items = [
    at("settings", 0, 0, { width: 800, height: 434 }, true),
    at("dia", 900, 0, { width: 500, height: 446 }),
    at("dia2", 900, 450, { width: 500, height: 446 }),
    at("chat", 900, 900, { width: 416, height: 490 }),
  ];
  const out = stacking(rows())(items, small);
  // Nothing overlaps except windows sharing a slot exactly
  const frames = out.map((p) => JSON.stringify(p.frame));
  for (const [k, p] of out.entries())
    for (const q of out.slice(k + 1)) {
      if (frames[out.indexOf(q)] === frames[k]) continue;
      const a = p.frame;
      const b = q.frame;
      const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      assert.ok(ox <= 2 || oy <= 2, `${p.id} and ${q.id} half-overlap`);
    }
  // The active window keeps a slot of its own
  const settings = frameOf(out, "settings");
  assert.equal(out.filter((p) => JSON.stringify(p.frame) === JSON.stringify(settings)).length, 1);
});

test("windows that fit are left as the layout made them", () => {
  const at = (id: string, x: number): Item => ({ ...item(id), frame: { x, y: 0, width: 100, height: 100 } });
  const items = [at("a", 0), at("b", 600)];
  assert.deepEqual(stacking(rows())(items, box), rows()(items, box));
});

test("ranked frames make layouts follow a given order, with the first window as the master", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const items = ids.map((id, k): Item => ({ id, frame: ranked(k) }));
  const grid = rows()(items, box);
  const reading = [...grid].sort((p, q) => p.frame.y - q.frame.y || p.frame.x - q.frame.x).map((p) => p.id);
  assert.deepEqual(reading, ids);
  const out = master({ side: "left" })(items, box);
  assert.equal(frameOf(out, "a").x, 0);
  assert.equal(frameOf(out, "a").height, 800);
  const stack = out.filter((p) => p.id !== "a").sort((p, q) => p.frame.x - q.frame.x || p.frame.y - q.frame.y);
  assert.deepEqual(
    stack.map((p) => p.id),
    ["b", "c", "d", "e"],
  );
});

test("the window set aside is one whose leaving lets the rest fit, not just the smallest", () => {
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const at = (id: string, w: number, h: number, min: { width: number; height: number }): Item => ({
    ...item(id),
    min,
    frame: { x: 0, y: 0, width: w, height: h },
  });
  // Two wide windows can't share the screen. The narrow one is smallest, but setting it aside fixes nothing.
  const items = [
    at("music", 800, 950, { width: 800, height: 600 }),
    at("settings", 800, 950, { width: 800, height: 434 }),
    at("chat", 712, 950, { width: 416, height: 490 }),
  ];
  const out = stacking(rows())(items, small);
  assert.equal(frameOf(out, "chat").width, 712);
  assert.deepEqual(frameOf(out, "music"), frameOf(out, "settings"));
});

test("a set-aside window too wide for the others' slots shares the active window's instead", () => {
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const at = (id: string, min: { width: number; height: number }, active = false): Item => ({
    ...item(id),
    active,
    min,
    frame: { x: 0, y: 0, width: min.width, height: min.height },
  });
  const items = [
    at("settings", { width: 800, height: 434 }, true),
    at("music", { width: 800, height: 600 }),
    at("chat", { width: 416, height: 490 }),
  ];
  const out = stacking(rows())(items, small);
  assert.deepEqual(frameOf(out, "music"), frameOf(out, "settings"));
  assert.equal(frameOf(out, "chat").x, 800);
});

test("asked to lead with the focused window, master takes it even when another is larger", () => {
  const items = [item("big", 900, 700), { ...item("small"), active: true }, item("other")];
  const out = master({ side: "left", lead: "focused" })(items, box);
  assert.deepEqual(frameOf(out, "small"), { x: 0, y: 0, width: 960, height: 800 });
  // Without the focused window on this display, the largest leads
  const unfocused = items.map((i) => ({ ...i, active: false }));
  assert.equal(frameOf(master({ side: "left", lead: "focused" })(unfocused, box), "big").x, 0);
});

test("shares split windows between displays by size and always add up", () => {
  const big = { width: 2560, height: 1440 };
  const small = { width: 1512, height: 950 };
  assert.deepEqual(shares(7, [big, small]), [5, 2]);
  assert.deepEqual(shares(11, [big, small]), [8, 3]);
  assert.deepEqual(shares(1, [big, small]), [1, 0]);
  assert.deepEqual(shares(4, [big, big]), [2, 2]);
});

test("a master that can't grow to its share leaves the rest to the stack, with no gap", () => {
  const items = [{ ...item("settings", 900, 700), max: { width: 400 } }, item("a"), item("b")];
  const out = master({ side: "left" })(items, box);
  assert.equal(frameOf(out, "settings").width, 400);
  assert.equal(frameOf(out, "a").x, 400);
  assert.equal(frameOf(out, "a").width, 800);
});

test("on a display that is far too full, as many windows as possible stay tiled and the rest share a slot", () => {
  const small = { x: 0, y: 0, width: 1512, height: 950 };
  const at = (id: string, w: number, h: number, max?: number): Item => ({
    ...item(id),
    min: { width: w, height: h },
    max: max ? { width: max } : undefined,
    frame: { x: 0, y: 0, width: w, height: h },
  });
  const items = [
    at("code", 840, 620),
    at("design", 900, 600),
    at("music", 800, 600),
    at("settings", 800, 434, 800),
    at("web", 500, 446),
    at("web2", 500, 446),
    at("editor", 400, 270),
  ];
  const out = stacking(rows())(items, small);
  const slots = new Set(out.map((p) => `${p.frame.x},${p.frame.y}`));
  // More than one window stays visible, and none is half-covered
  assert.ok(slots.size >= 2, `only ${slots.size} slot`);
  for (const [k, p] of out.entries())
    for (const q of out.slice(k + 1)) {
      if (p.frame.x === q.frame.x && p.frame.y === q.frame.y) continue;
      const ox = Math.min(p.frame.x + p.frame.width, q.frame.x + q.frame.width) - Math.max(p.frame.x, q.frame.x);
      const oy = Math.min(p.frame.y + p.frame.height, q.frame.y + q.frame.height) - Math.max(p.frame.y, q.frame.y);
      assert.ok(ox <= 2 || oy <= 2, `${p.id} and ${q.id} half-overlap`);
    }
});

test("asked for a grid from three windows, rows puts two above and one below", () => {
  const at = (id: string, x: number): Item => ({ ...item(id), frame: { x, y: 0, width: 100, height: 100 } });
  const items = [at("a", 0), at("b", 500), at("c", 1000)];
  // On its own, three windows sit in a line
  assert.equal(frameOf(rows()(items, box), "c").y, 0);
  const out = rows(2, 0, 3)(items, box);
  assert.deepEqual(frameOf(out, "a"), { x: 0, y: 0, width: 600, height: 400 });
  assert.deepEqual(frameOf(out, "b"), { x: 600, y: 0, width: 600, height: 400 });
  assert.deepEqual(frameOf(out, "c"), { x: 0, y: 400, width: 1200, height: 400 });
  // And a line is always a line
  assert.equal(frameOf(rows(1)([...items, at("d", 1100), at("e", 1150)], box), "e").y, 0);
});

test("pivot goes round side by side, two rows, two columns, and back", () => {
  const line = { shape: "line", sideways: false } as const;
  const rowsGrid = nextPivot(line, 3);
  const columnsGrid = nextPivot(rowsGrid, 3);
  assert.deepEqual(rowsGrid, { shape: "grid", sideways: false });
  assert.deepEqual(columnsGrid, { shape: "grid", sideways: true });
  assert.deepEqual(nextPivot(columnsGrid, 3), line);
  // Two windows can only be side by side or stacked
  assert.deepEqual(nextPivot(line, 2), { shape: "line", sideways: true });
  assert.deepEqual(nextPivot({ shape: "line", sideways: true }, 2), line);
});

test("swap with master changes the master even when the old one is remembered", () => {
  const items = [item("old", 900, 700), { ...item("new"), active: true }, item("other")];
  // The layout remembers "old" as its master, as it does between commands
  const layout = leading(master({ side: "left" }), new Set(["old"]));
  const tiled = layout(items, box);
  assert.equal(tiled.find((p) => p.master)?.id, "old");
  const out = withMaster(layout)(items, box);
  assert.equal(out.find((p) => p.master)?.id, "new");
  assert.deepEqual(frameOf(out, "new"), frameOf(tiled, "old"));
});

test("with two windows, swap and rotate still trade them when the master is remembered", () => {
  const items = [item("a", 900, 700), { ...item("b"), active: true }];
  const layout = leading(master({ side: "left" }), new Set(["a"]));
  const tiled = layout(items, box);
  for (const moved of [swappedNext(layout)(items, box), rotated(layout, 1)(items, box)]) {
    assert.deepEqual(frameOf(moved, "b"), frameOf(tiled, "a"));
    assert.deepEqual(frameOf(moved, "a"), frameOf(tiled, "b"));
  }
});

test("a remembered master stays the master when it is the smaller window", () => {
  const items = [item("big", 900, 700), item("small")];
  const out = leading(master({ side: "left", ratio: 0.3 }), new Set(["small"]))(items, box);
  assert.equal(frameOf(out, "small").x, 0);
  assert.equal(frameOf(out, "small").width, 360);
});
