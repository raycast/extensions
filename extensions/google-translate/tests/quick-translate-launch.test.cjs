const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function load(relative, modules) {
  const source = readFileSync(path.join(__dirname, "../src", relative), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    console: { log() {} },
    require(name) {
      if (name in modules) return modules[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

function launcher({ autoInput = true, selection = async () => "hello" } = {}) {
  const launches = [];
  let reads = 0;
  let id = 0;
  const command = load("quick-translate.tsx", {
    "@raycast/api": {
      getPreferenceValues: () => ({ autoInput }),
      getSelectedText: async () => {
        reads++;
        return selection();
      },
      launchCommand: async (options) => launches.push(options),
      LaunchType: { UserInitiated: "userInitiated" },
    },
    "node:crypto": { randomUUID: () => `launch-${++id}` },
  }).default;
  return { command, launches, reads: () => reads };
}

test("each invocation forwards the current selection, including multiline text", async () => {
  const selections = ["first", "second\nline"];
  const run = launcher({ selection: async () => selections.shift() });
  await run.command();
  await run.command();
  assert.equal(run.reads(), 2);
  assert.equal(run.launches[0].context.text, "first");
  assert.equal(run.launches[1].context.text, "second\nline");
  assert.equal(run.launches[1].name, "quick-translate-view");
  assert.equal(run.launches[1].type, "userInitiated");
  assert.notEqual(run.launches[0].context.requestId, run.launches[1].context.requestId);
});

test("missing selection opens an empty editable result instead of reusing stale text", async () => {
  const run = launcher({
    selection: async () => {
      throw new Error("No selection");
    },
  });
  await run.command();
  assert.equal(run.launches[0].context.text, "");
});

test("disabling Autofill Input skips selection access", async () => {
  const run = launcher({ autoInput: false });
  await run.command();
  assert.equal(run.reads(), 0);
  assert.equal(run.launches[0].context.text, "");
});

test("repeated identical selections still carry distinct invocations", async () => {
  const run = launcher();
  await run.command();
  await run.command();
  assert.equal(run.launches[0].context.text, run.launches[1].context.text);
  assert.notEqual(run.launches[0].context.requestId, run.launches[1].context.requestId);
});

function textState({ autoInput = true, selection = async () => "external selection" } = {}) {
  const slots = [];
  let cursor = 0;
  let reads = 0;
  let effects = [];
  let input;
  let result;
  const React = {
    useMemo(fn) {
      const i = cursor++;
      slots[i] ??= { value: fn() };
      return slots[i].value;
    },
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: initial };
      return [
        slots[i].value,
        (value) => {
          slots[i].value = typeof value === "function" ? value(slots[i].value) : value;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      slots[i] ??= { current: initial };
      return slots[i];
    },
    useEffect(effect, deps) {
      const i = cursor++;
      const previous = slots[i];
      if (!previous || deps.some((dep, index) => dep !== previous.deps[index])) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[i] = { deps, cleanup: effect() };
        });
      }
    },
  };
  const hook = load("hooks.ts", {
    react: React,
    "@raycast/api": {
      getPreferenceValues: () => ({ autoInput }),
      getSelectedText: async () => {
        reads++;
        return selection();
      },
    },
    "@raycast/utils": {},
    "./simple-translate": { AUTO_DETECT: "auto" },
  }).useTextState;
  const render = (nextInput = input) => {
    input = nextInput;
    cursor = 0;
    effects = [];
    result = hook(input);
    effects.forEach((effect) => effect());
    return result[0];
  };
  return { render, edit: (value) => result[1](value), reads: () => reads };
}

test("forwarded text populates immediately without reading the external selection again", () => {
  const state = textState();
  assert.equal(state.render({ text: "forwarded", requestId: "1" }), "forwarded");
  assert.equal(state.reads(), 0);
});

test("manual edits survive ordinary renders; a new invocation replaces them", () => {
  const state = textState();
  state.render({ text: "selected", requestId: "1" });
  state.edit("manual edit");
  assert.equal(state.render(), "manual edit");
  state.render({ text: "selected", requestId: "2" });
  assert.equal(state.render(), "selected");
});

test("an explicitly empty forwarded input clears stale text and skips auto-input", () => {
  const state = textState();
  state.render({ text: "old", requestId: "1" });
  state.render({ text: "", requestId: "2" });
  assert.equal(state.render(), "");
  assert.equal(state.reads(), 0);
});

test("legacy commands still fill an empty input from the selection", async () => {
  const state = textState();
  assert.equal(state.render(), "");
  await new Promise(setImmediate);
  assert.equal(state.render(), "external selection");
  assert.equal(state.reads(), 1);
});

test("a slow legacy selection read cannot overwrite a newer launch context", async () => {
  let resolve;
  const state = textState({
    selection: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  state.render();
  state.render({ text: "new launch", requestId: "2" });
  resolve("stale selection");
  await new Promise(setImmediate);
  assert.equal(state.render(), "new launch");
});
