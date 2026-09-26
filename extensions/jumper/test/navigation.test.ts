import { test } from "node:test";
import assert from "node:assert/strict";
import { navigate, type NavState } from "../src/lib/navigation.ts";

// Simulates macOS: activating an app moves it to the front of the MRU list.
function activate(mru: string[], app: string): string[] {
  return [app, ...mru.filter((a) => a !== app)];
}

test("back goes to the previous app", () => {
  const r = navigate("back", ["A", "B", "C"]);
  assert.deepEqual(r, { ok: true, target: "B", state: { snapshot: ["A", "B", "C"], cursor: 1 } });
});

test("repeated back walks the snapshot, not the reordered MRU", () => {
  let mru = ["A", "B", "C", "D"];
  let state: NavState | undefined;
  const visited: string[] = [];
  for (let n = 0; n < 3; n++) {
    const r = navigate("back", mru, state);
    assert.ok(r.ok);
    visited.push(r.target);
    state = r.state;
    mru = activate(mru, r.target);
  }
  assert.deepEqual(visited, ["B", "C", "D"]);
});

test("forward retraces back steps", () => {
  let mru = ["A", "B", "C"];
  let r = navigate("back", mru);
  assert.ok(r.ok);
  mru = activate(mru, r.target);
  r = navigate("back", mru, r.state);
  assert.ok(r.ok && r.target === "C");
  mru = activate(mru, r.target);
  r = navigate("forward", mru, r.state);
  assert.ok(r.ok && r.target === "B");
  mru = activate(mru, r.target);
  r = navigate("forward", mru, r.state);
  assert.ok(r.ok && r.target === "A");
  mru = activate(mru, r.target);
  assert.deepEqual(navigate("forward", mru, r.state), { ok: false, reason: "no-forward" });
});

test("manual switch discards the snapshot (forward stack cleared)", () => {
  let mru = ["A", "B", "C"];
  const r = navigate("back", mru);
  assert.ok(r.ok);
  mru = activate(mru, r.target); // now at B
  mru = activate(mru, "C"); // user Cmd+Tabs to C
  assert.deepEqual(navigate("forward", mru, r.state), { ok: false, reason: "no-forward" });
  const again = navigate("back", mru, r.state);
  assert.ok(again.ok && again.target === "B"); // fresh snapshot [C, B, A]
});

test("skips apps that quit since the snapshot", () => {
  let mru = ["A", "B", "C"];
  const r = navigate("back", mru);
  assert.ok(r.ok);
  mru = activate(mru, r.target).filter((a) => a !== "C"); // C quit
  assert.deepEqual(navigate("back", mru, r.state), { ok: false, reason: "no-back" });
});

test("edge cases", () => {
  assert.deepEqual(navigate("back", []), { ok: false, reason: "no-apps" });
  assert.deepEqual(navigate("back", ["A"]), { ok: false, reason: "no-back" });
  assert.deepEqual(navigate("forward", ["A", "B"]), { ok: false, reason: "no-forward" });
});

test("toggle flips between the two most recent apps", () => {
  let mru = ["A", "B", "C"];
  let state: NavState | undefined;
  const visited: string[] = [];
  for (let n = 0; n < 3; n++) {
    const r = navigate("toggle", mru, state);
    assert.ok(r.ok);
    visited.push(r.target);
    state = r.state;
    mru = activate(mru, r.target);
  }
  assert.deepEqual(visited, ["B", "A", "B"]);
});

test("toggle ignores an ongoing back walk", () => {
  const state: NavState = { snapshot: ["A", "B", "C"], cursor: 2 };
  const r = navigate("toggle", ["C", "A", "B"], state);
  assert.ok(r.ok);
  assert.equal(r.target, "A");
});

test("back continues from a toggle", () => {
  const t = navigate("toggle", ["A", "B", "C"]);
  assert.ok(t.ok);
  const r = navigate("back", ["B", "A", "C"], t.state);
  assert.ok(r.ok);
  assert.equal(r.target, "C");
});
