import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

// Run the shipping editor functions against canvas/DOM doubles, without loading
// a file or making a network request. Exports stay private in the real browser.
type Rect = { x: number; y: number; width: number; height: number };
type Mask = Record<string, unknown>;
type Page = {
  source: object;
  masks: Mask[];
  crop: Rect | null;
  history: object[];
};
type EditorApi = {
  state: {
    pages: Page[];
    entitlement: { plan: string };
    tool: string;
    draft: object;
  };
  newPage(source: object): Page;
  addMask(mask: Mask): void;
  applyCrop(): void;
  resetCrop(): void;
  undo(): void;
  redo(): void;
  clearAll(): void;
  canvasPoint(event: { clientX: number; clientY: number }): {
    x: number;
    y: number;
  };
  exportImageCanvas(framed: boolean): { width: number; height: number };
};
function editor() {
  const draws: unknown[][] = [];
  const translations: number[][] = [];
  const elements = new Map<string, ReturnType<typeof makeElement>>();
  const context = () =>
    new Proxy(
      {
        drawImage: (...args: unknown[]) => draws.push(args),
        translate: (x: number, y: number) => translations.push([x, y]),
        createLinearGradient: () => ({ addColorStop() {} }),
        measureText: () => ({ width: 90 }),
      },
      { get: (target, key) => Reflect.get(target, key) ?? (() => {}) },
    );
  const makeElement = () => ({
    width: 0,
    height: 0,
    value: "violet",
    checked: false,
    clientWidth: 1000,
    clientHeight: 800,
    style: { setProperty() {} },
    classList: { toggle() {}, add() {}, remove() {} },
    getContext: context,
    setAttribute() {},
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      width: 200,
      height: 100,
    }),
    hasPointerCapture: () => false,
  });
  const element = (key: string) => {
    if (!elements.has(key)) elements.set(key, makeElement());
    return elements.get(key)!;
  };
  const source = readFileSync(resolve("assets/editor.js"), "utf8").replace(
    / {2}start\(\)\.catch\(\(error\) => \{[\s\S]*?\n {2}\}\);/,
    "globalThis.editor = { state, newPage, addMask, applyCrop, resetCrop, undo, redo, clearAll, setupCanvas, canvasPoint, cropBounds, exportImageCanvas, setTool, pointerUp };",
  );
  const sandbox = {
    editor: undefined as EditorApi | undefined,
    document: {
      querySelector: element,
      querySelectorAll: () => [],
      createElement: () => element(`canvas-${elements.size}`),
    },
    window: { addEventListener() {} },
    setInterval() {},
    setTimeout() {},
    clearTimeout() {},
    confirm: () => true,
  };
  runInNewContext(source, sandbox);
  const api = sandbox.editor!;
  const original = { width: 1000, height: 600 };
  api.state.pages = [api.newPage(original)];
  api.state.entitlement = { plan: "pro" };
  return { api, original, elements, draws, translations };
}

function crop(api: EditorApi, rect: object) {
  api.state.tool = "crop";
  api.state.draft = rect;
  api.applyCrop();
}

test("crop preserves source and redactions through nested crops, undo, redo and reset", () => {
  const { api, original, elements, draws } = editor();
  const page = api.state.pages[0];
  const mask = {
    type: "rect",
    x: 250,
    y: 160,
    width: 80,
    height: 20,
    effect: "solid",
    color: "#000000",
  };
  api.addMask(mask);
  crop(api, { x: 200, y: 100, width: 400, height: 200 });
  assert.equal(page.source, original);
  assert.equal(page.masks[0], mask);
  assert.equal(elements.get("#imageCanvas")!.width, 400);
  assert.equal(elements.get("#imageCanvas")!.height, 200);
  assert.deepEqual(
    { ...api.canvasPoint({ clientX: 110, clientY: 70 }) },
    { x: 400, y: 200 },
  );
  crop(api, { x: 300, y: 150, width: 150, height: 100 });
  api.undo();
  assert.equal(elements.get("#imageCanvas")!.width, 400);
  api.redo();
  assert.equal(elements.get("#imageCanvas")!.width, 150);
  api.resetCrop();
  assert.equal(elements.get("#imageCanvas")!.width, 1000);
  assert.equal(page.masks[0], mask);
  assert.ok(draws.some(([source]) => source === original));
  api.undo();
  assert.equal(elements.get("#imageCanvas")!.width, 150);
  api.undo();
  api.undo();
  assert.equal(elements.get("#imageCanvas")!.width, 1000);
  assert.equal(page.masks[0], mask);
  api.undo();
  assert.equal(page.masks.length, 0);
});

test("reverse drag clamps crop to current viewport and rejects empty selections", () => {
  const { api, elements } = editor();
  crop(api, { x: 800.8, y: 500.4, width: -1000, height: -700 });
  assert.deepEqual(
    { ...api.state.pages[0].crop },
    { x: 0, y: 0, width: 801, height: 501 },
  );
  const edits = api.state.pages[0].history.length;
  crop(api, { x: 950, y: 550, width: 100, height: 100 });
  assert.equal(api.state.pages[0].history.length, edits);
  assert.equal(elements.get("#imageCanvas")!.width, 801);
});

test("copy/save canvas, branded export and frame all use cropped dimensions", () => {
  const { api, elements, draws } = editor();
  crop(api, { x: 100, y: 50, width: 300, height: 200 });
  const exported = api.exportImageCanvas(false);
  assert.equal(exported, elements.get("#imageCanvas"));
  assert.equal(exported.width, 300);
  assert.equal(exported.height, 200);
  const framed = api.exportImageCanvas(true);
  assert.equal(framed.width, 444);
  assert.equal(framed.height, 344);
  assert.ok(
    draws.some(([source, x, y]) => source === exported && x === 72 && y === 72),
  );
  api.state.entitlement.plan = "free";
  const branded = api.exportImageCanvas(false);
  assert.equal(branded.width, 300);
  assert.equal(branded.height, 200);
});

test("clear redactions can undo as one edit without losing the crop", () => {
  const { api } = editor();
  crop(api, { x: 200, y: 100, width: 400, height: 200 });
  api.addMask({
    type: "rect",
    x: 250,
    y: 120,
    width: 50,
    height: 30,
    effect: "solid",
  });
  api.clearAll();
  assert.equal(api.state.pages[0].masks.length, 0);
  api.undo();
  assert.equal(api.state.pages[0].masks.length, 1);
  assert.equal(api.state.pages[0].crop!.width, 400);
  api.redo();
  assert.equal(api.state.pages[0].masks.length, 0);
});

test("redactions drawn after cropping keep source coordinates on restoration", () => {
  const { api, translations } = editor();
  crop(api, { x: 200, y: 100, width: 400, height: 200 });
  assert.ok(translations.some(([x, y]) => x === -200 && y === -100));
  const point = api.canvasPoint({ clientX: 60, clientY: 45 });
  api.addMask({
    type: "rect",
    ...point,
    width: 50,
    height: 20,
    effect: "solid",
  });
  api.resetCrop();
  const mask = api.state.pages[0].masks[0];
  assert.equal(mask.x, 300);
  assert.equal(mask.y, 150);
});
