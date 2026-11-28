const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/priority/cycle.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const mod = { exports: {} };
new Function("exports", "module", outputText)(mod.exports, mod);
const { cycleCandidates, nextDevice } = mod.exports;

const d = (uid) => ({ uid, name: uid });
const A = d("a");
const B = d("b");
const C = d("c");
const priorities = [A, B, C];

test("candidates are connected, ranked devices in priority order", () => {
  assert.deepEqual(cycleCandidates(priorities, [C, A, B], []), [A, B, C]);
});

test("candidates skip disconnected, hidden and unranked devices", () => {
  assert.deepEqual(cycleCandidates(priorities, [A, C, d("x")], []), [A, C]);
  assert.deepEqual(cycleCandidates(priorities, [A, B, C], ["b"]), [A, C]);
});

test("nextDevice steps forward and wraps around", () => {
  assert.equal(nextDevice([A, B, C], "a").uid, "b");
  assert.equal(nextDevice([A, B, C], "b").uid, "c");
  assert.equal(nextDevice([A, B, C], "c").uid, "a");
});

test("nextDevice starts from the first when the current device is not a candidate", () => {
  assert.equal(nextDevice([A, B], "unranked").uid, "a");
});

test("nextDevice returns undefined when there is nothing to switch to", () => {
  assert.equal(nextDevice([], "a"), undefined);
  assert.equal(nextDevice([A], "a"), undefined);
});

test("a single candidate is chosen when the current device is not it", () => {
  assert.equal(nextDevice([A], "other").uid, "a");
});
