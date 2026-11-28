const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function load(file, requires = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/priority", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  new Function("exports", "module", "require", outputText)(mod.exports, mod, (name) => requires[name]);
  return mod.exports;
}

const decide = load("decide.ts");
const { priorityNumber, setPosition, makeTop, moveBy, removeEntry, reconcile } = load("list.ts", {
  "./decide": decide,
});

const e = (uid, name = uid) => ({ uid, name });
const uids = (list) => list.map((p) => p.uid);
const base = [e("a"), e("b"), e("c")];

test("priorityNumber is 1-based and undefined for unranked", () => {
  assert.equal(priorityNumber(base, "a"), 1);
  assert.equal(priorityNumber(base, "c"), 3);
  assert.equal(priorityNumber(base, "x"), undefined);
});

test("setPosition adds an unranked device at the given position", () => {
  assert.deepEqual(uids(setPosition(base, e("x"), 2)), ["a", "x", "b", "c"]);
});

test("setPosition without a position appends", () => {
  assert.deepEqual(uids(setPosition(base, e("x"))), ["a", "b", "c", "x"]);
});

test("setPosition moves a ranked device and leaves no gaps or duplicates", () => {
  assert.deepEqual(uids(setPosition(base, e("c"), 1)), ["c", "a", "b"]);
  assert.deepEqual(uids(setPosition(base, e("a"), 3)), ["b", "c", "a"]);
});

test("setPosition clamps out-of-range positions", () => {
  assert.deepEqual(uids(setPosition(base, e("b"), 0)), ["b", "a", "c"]);
  assert.deepEqual(uids(setPosition(base, e("a"), 99)), ["b", "c", "a"]);
});

test("setPosition refreshes the stored name", () => {
  assert.equal(setPosition(base, e("b", "New name"), 2)[1].name, "New name");
});

test("makeTop puts the device first", () => {
  assert.deepEqual(uids(makeTop(base, e("c"))), ["c", "a", "b"]);
  assert.deepEqual(uids(makeTop([], e("x"))), ["x"]);
});

test("moveBy moves up and down, stopping at the edges", () => {
  assert.deepEqual(uids(moveBy(base, "b", -1)), ["b", "a", "c"]);
  assert.deepEqual(uids(moveBy(base, "b", 1)), ["a", "c", "b"]);
  assert.deepEqual(uids(moveBy(base, "a", -1)), ["a", "b", "c"]);
  assert.deepEqual(uids(moveBy(base, "c", 1)), ["a", "b", "c"]);
});

test("moveBy ignores unranked devices", () => {
  assert.deepEqual(uids(moveBy(base, "x", -1)), ["a", "b", "c"]);
});

test("removeEntry closes the gap", () => {
  assert.deepEqual(uids(removeEntry(base, "b")), ["a", "c"]);
  assert.equal(priorityNumber(removeEntry(base, "b"), "c"), 2);
});

test("operations do not mutate their input", () => {
  const input = [e("a"), e("b")];
  const copy = JSON.parse(JSON.stringify(input));
  setPosition(input, e("c"), 1);
  moveBy(input, "a", 1);
  removeEntry(input, "a");
  assert.deepEqual(input, copy);
});

test("reconcile refreshes the name on a UID match", () => {
  const list = [e("a", "Old name")];
  assert.deepEqual(reconcile(list, [e("a", "New name")]), [e("a", "New name")]);
});

test("reconcile adopts a new UID when exactly one unclaimed device matches by name", () => {
  const list = [e("usb-port-1", "Desktop Mic"), e("b")];
  const result = reconcile(list, [e("usb-port-2", "Desktop Mic"), e("b")]);
  assert.deepEqual(result, [e("usb-port-2", "Desktop Mic"), e("b")]);
});

test("reconcile does not guess when several devices share the name", () => {
  const list = [e("old", "Mic")];
  const devices = [e("x", "Mic"), e("y", "Mic")];
  assert.deepEqual(reconcile(list, devices), list);
});

test("reconcile does not steal a device already claimed by UID", () => {
  const list = [e("a", "Mic"), e("old", "Mic")];
  assert.deepEqual(reconcile(list, [e("a", "Mic")]), list);
});

test("reconcile keeps entries for disconnected devices", () => {
  const list = [e("gone", "Gone"), e("a")];
  assert.deepEqual(reconcile(list, [e("a")]), list);
});

test("reconcile matches names across apostrophe styles", () => {
  const list = [e("old", "Jane's AirPods")];
  assert.deepEqual(reconcile(list, [e("new", "Jane’s AirPods")]), [e("new", "Jane’s AirPods")]);
});
