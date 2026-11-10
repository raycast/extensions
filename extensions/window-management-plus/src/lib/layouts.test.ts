import { test } from "node:test";
import assert from "node:assert/strict";
import { rows, focus, rotate, swapMaster, sidebar, type Item } from "./layouts.ts";

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

test("focus gives the largest window everything the small ones leave", () => {
  const out = focus({ mainOn: "left" })([item("s1"), item("big", 900, 700), item("s2")], box);
  const big = out.find((p) => p.id === "big")!;
  assert.deepEqual(big.frame, { x: 0, y: 0, width: 960, height: 800 });
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

test("rotate moves every window one slot", () => {
  const a = { ...item("a"), frame: { x: 0, y: 0, width: 10, height: 10 } };
  const b = { ...item("b"), frame: { x: 10, y: 0, width: 10, height: 10 } };
  const out = rotate(1)([a, b], box);
  assert.equal(out.find((p) => p.id === "a")!.frame.x, 10);
  assert.equal(out.find((p) => p.id === "b")!.frame.x, 0);
});

test("swap trades the active window with the largest", () => {
  const big = item("big", 900, 700);
  const out = swapMaster([{ ...item("s"), active: true }, big], box);
  assert.deepEqual(out.find((p) => p.id === "s")!.frame, big.frame);
  assert.equal(out.length, 2);
});

test("focus wraps the side column when minimum heights don't fit", () => {
  const tall = (id: string): Item => ({ ...item(id), min: { height: 500 } });
  const out = focus({ mainOn: "left" })([item("big", 900, 700), tall("a"), tall("b")], box);
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

test("rotate moves along the top row before dropping to the next", () => {
  const at = (id: string, x: number, y: number): Item => ({
    ...item(id),
    frame: { x, y, width: 100, height: 100 },
  });
  const out = rotate(1)([at("tl", 0, 0), at("tr", 100, 0), at("bl", 0, 100), at("br", 100, 100)], box);
  const f = (id: string) => out.find((p) => p.id === id)!.frame;
  assert.deepEqual([f("tl").x, f("tl").y], [100, 0]);
  assert.deepEqual([f("tr").x, f("tr").y], [0, 100]);
  assert.deepEqual([f("br").x, f("br").y], [0, 0]);
});
