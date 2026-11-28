const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/priority/decide.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const mod = { exports: {} };
new Function("exports", "module", outputText)(mod.exports, mod);
const { decide, makeSnapshot, rankOf, SLEEP_GAP_INTERVALS } = mod.exports;

const INTERVAL = 10_000;
const dev = (uid, name = uid) => ({ uid, name });

// Output: wireless headphones = 1, speakers = 2, wired headphones = 3.
const W = dev("bt-hp", "Wireless Headphones");
const S = dev("speakers", "Speakers");
const H = dev("wired", "Wired Headphones");
const OUT_PRIORITIES = [W, S, H];

// Input: desktop mic = 1, wireless headphones mic = 2, Mac mic = 3.
const D = dev("desk-mic", "Desktop Mic");
const WM = dev("bt-mic", "Wireless Headphones");
const M = dev("mac-mic", "MacBook Microphone");
const IN_PRIORITIES = [D, WM, M];

/** Run decide() for `now`, given the previous snapshot built from `prevDevices` / `prevCurrent`. */
function run({ prevDevices, prevCurrent, devices, current, priorities, hidden = [], gap = INTERVAL, prev }) {
  const t0 = 1_000_000;
  const snapshot = prev === undefined ? makeSnapshot(prevDevices, prevCurrent, t0) : prev;
  return decide({
    prev: snapshot,
    now: { devices, currentUid: current, ts: t0 + gap },
    priorities,
    hidden,
    intervalMs: INTERVAL,
  });
}

test("output: no wireless headphones → speakers stay", () => {
  const r = run({ prevDevices: [S, H], prevCurrent: "speakers", devices: [S, H], current: "speakers", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: null, reason: "no-change" });
});

test("output: wireless headphones connect (macOS switched to them already) → nothing to do", () => {
  const r = run({ prevDevices: [S, H], prevCurrent: "speakers", devices: [S, H, W], current: "bt-hp", priorities: OUT_PRIORITIES });
  assert.equal(r.target, null);
  assert.equal(r.reason, "device-added");
});

test("output: wireless headphones connect while on speakers → take over", () => {
  const r = run({ prevDevices: [S, H], prevCurrent: "speakers", devices: [S, H, W], current: "speakers", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: "bt-hp", reason: "device-added" });
});

test("output: wireless headphones disconnect → speakers", () => {
  // macOS fell back to wired headphones on its own.
  const r = run({ prevDevices: [S, H, W], prevCurrent: "bt-hp", devices: [S, H], current: "wired", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: "speakers", reason: "device-removed" });
});

test("output: manual switch to wired headphones is kept (no device change)", () => {
  const r = run({ prevDevices: [S, H], prevCurrent: "speakers", devices: [S, H], current: "wired", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: null, reason: "manual-switch" });
});

test("output: after a manual switch is recorded, following runs leave it alone", () => {
  const snapshot = makeSnapshot([S, H], "wired", 1_000_000);
  const r = run({ prev: snapshot, devices: [S, H], current: "wired", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: null, reason: "no-change" });
});

test("output: on wired by manual choice, wireless headphones connect → they take over", () => {
  const r = run({ prevDevices: [S, H], prevCurrent: "wired", devices: [S, H, W], current: "wired", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: "bt-hp", reason: "device-added" });
});

test("output: on wired by manual choice, a worse device appears → stay on wired", () => {
  const extra = dev("hdmi", "HDMI Monitor");
  const r = run({
    prevDevices: [S, H],
    prevCurrent: "wired",
    devices: [S, H, extra],
    current: "wired",
    priorities: OUT_PRIORITIES,
  });
  assert.equal(r.target, null);
});

test("output: wired headphones are replugged while on speakers → speakers stay (higher priority)", () => {
  const r = run({ prevDevices: [S], prevCurrent: "speakers", devices: [S, H], current: "wired", priorities: OUT_PRIORITIES });
  // macOS jumped to the newly plugged wired headphones → switch back to the better previous device.
  assert.deepEqual(r, { target: "speakers", reason: "device-added" });
});

test("output: wired headphones disconnect while on wired (manual) → best available", () => {
  const r = run({ prevDevices: [S, H], prevCurrent: "wired", devices: [S], current: "speakers", priorities: OUT_PRIORITIES });
  assert.equal(r.target, null); // macOS already picked speakers, which is the best available
  assert.equal(r.reason, "device-removed");
});

test("input: wireless headphones connect and macOS switches to their mic → back to desktop mic", () => {
  const r = run({ prevDevices: [D, M], prevCurrent: "desk-mic", devices: [D, M, WM], current: "bt-mic", priorities: IN_PRIORITIES });
  assert.deepEqual(r, { target: "desk-mic", reason: "device-added" });
});

test("input: wireless headphones connect, macOS leaves input alone → nothing", () => {
  const r = run({ prevDevices: [D, M], prevCurrent: "desk-mic", devices: [D, M, WM], current: "desk-mic", priorities: IN_PRIORITIES });
  assert.equal(r.target, null);
});

test("input: wireless headphones connect and there is no desktop mic → their mic wins over the Mac mic", () => {
  const r = run({ prevDevices: [M], prevCurrent: "mac-mic", devices: [M, WM], current: "mac-mic", priorities: IN_PRIORITIES });
  assert.deepEqual(r, { target: "bt-mic", reason: "device-added" });
});

test("input: desktop mic unplugged → best remaining", () => {
  const r = run({ prevDevices: [D, M, WM], prevCurrent: "desk-mic", devices: [M, WM], current: "mac-mic", priorities: IN_PRIORITIES });
  assert.deepEqual(r, { target: "bt-mic", reason: "device-removed" });
});

test("input: desktop mic plugged back in → it takes over", () => {
  const r = run({ prevDevices: [M, WM], prevCurrent: "bt-mic", devices: [M, WM, D], current: "bt-mic", priorities: IN_PRIORITIES });
  assert.deepEqual(r, { target: "desk-mic", reason: "device-added" });
});

test("several devices appear at once → best of them wins", () => {
  const r = run({ prevDevices: [H], prevCurrent: "wired", devices: [H, S, W], current: "wired", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: "bt-hp", reason: "device-added" });
});

test("hidden current device → best available non-hidden", () => {
  const r = run({
    prevDevices: [S, H],
    prevCurrent: "wired",
    devices: [S, H],
    current: "wired",
    priorities: OUT_PRIORITIES,
    hidden: ["wired"],
  });
  assert.deepEqual(r, { target: "speakers", reason: "hidden-current" });
});

test("hidden current device with no ranked alternative → nothing", () => {
  const r = run({
    prevDevices: [H],
    prevCurrent: "wired",
    devices: [H],
    current: "wired",
    priorities: OUT_PRIORITIES,
    hidden: ["wired"],
  });
  assert.deepEqual(r, { target: null, reason: "no-candidate" });
});

test("hidden best device is never chosen", () => {
  const r = run({
    prevDevices: [S, H],
    prevCurrent: "speakers",
    devices: [S, H, W],
    current: "speakers",
    priorities: OUT_PRIORITIES,
    hidden: ["bt-hp"],
  });
  assert.equal(r.target, null);
});

test("sleep/wake: a long gap is treated as a connect event", () => {
  const r = run({
    prevDevices: [S, H, W],
    prevCurrent: "wired",
    devices: [S, H, W],
    current: "wired",
    priorities: OUT_PRIORITIES,
    gap: INTERVAL * SLEEP_GAP_INTERVALS + 1,
  });
  assert.deepEqual(r, { target: "bt-hp", reason: "woke-from-sleep" });
});

test("sleep/wake: a gap at the threshold is still a normal run", () => {
  const r = run({
    prevDevices: [S, H, W],
    prevCurrent: "wired",
    devices: [S, H, W],
    current: "wired",
    priorities: OUT_PRIORITIES,
    gap: INTERVAL * SLEEP_GAP_INTERVALS,
  });
  assert.equal(r.reason, "no-change");
});

test("unranked devices never win automatically", () => {
  const unknown = dev("unknown", "Some Unknown Speaker");
  const r = run({ prevDevices: [S], prevCurrent: "speakers", devices: [S, unknown], current: "speakers", priorities: OUT_PRIORITIES });
  assert.equal(r.target, null);
});

test("unranked device grabbed by macOS → back to the ranked previous device", () => {
  const unknown = dev("unknown", "Some Unknown Speaker");
  const r = run({ prevDevices: [S], prevCurrent: "speakers", devices: [S, unknown], current: "unknown", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: "speakers", reason: "device-added" });
});

test("only unranked devices around → nothing is switched", () => {
  const a = dev("a");
  const b = dev("b");
  const r = run({ prevDevices: [a], prevCurrent: "a", devices: [a, b], current: "b", priorities: OUT_PRIORITIES });
  assert.equal(r.target, null);
});

test("first run (no snapshot) → no switch", () => {
  const r = run({ prev: null, devices: [S, W], current: "speakers", priorities: OUT_PRIORITIES });
  assert.deepEqual(r, { target: null, reason: "no-snapshot" });
});

test("name fallback: USB device UID changed but name matches the ranked entry", () => {
  const moved = dev("usb-port-2", "Desktop Mic");
  const r = run({ prevDevices: [M], prevCurrent: "mac-mic", devices: [M, moved], current: "mac-mic", priorities: IN_PRIORITIES });
  assert.deepEqual(r, { target: "usb-port-2", reason: "device-added" });
});

test("name fallback treats straight and typographic apostrophes as equal", () => {
  const priorities = [dev("old-uid", "Jane's AirPods")];
  assert.equal(rankOf(dev("new-uid", "Jane’s AirPods"), priorities), 0);
});

test("UID match wins over name match", () => {
  const priorities = [dev("a", "Same"), dev("b", "Same")];
  assert.equal(rankOf(dev("b", "Same"), priorities), 1);
});

test("makeSnapshot stores UIDs, current device and timestamp", () => {
  assert.deepEqual(makeSnapshot([S, W], "bt-hp", 42), { uids: ["speakers", "bt-hp"], currentUid: "bt-hp", ts: 42 });
});

// Regression: AirPods = 2, speakers = 3. AirPods connect and macOS routes output to them; before the next
// background run the user cycles to the speakers. The next run must keep the speakers.
test("manual choice after a connect: keeping the old device set would undo it", () => {
  const A = dev("airpods", "AirPods");
  const priorities = [dev("desk", "Desk Speakers"), A, S];
  const t0 = 1_000_000;
  const lastRun = makeSnapshot([S], "speakers", t0); // before AirPods connected
  const now = { devices: [S, A], currentUid: "speakers", ts: t0 + INTERVAL };

  // Old recording: only currentUid updated, AirPods still look new → they win.
  const stale = decide({ prev: { ...lastRun, currentUid: "speakers" }, now, priorities, hidden: [], intervalMs: INTERVAL });
  assert.deepEqual(stale, { target: "airpods", reason: "device-added" });

  // Recording the whole state at the manual switch keeps the choice.
  const recorded = makeSnapshot([S, A], "speakers", t0 + INTERVAL / 2);
  const kept = decide({ prev: recorded, now, priorities, hidden: [], intervalMs: INTERVAL });
  assert.deepEqual(kept, { target: null, reason: "no-change" });
});

test("manual choice long after the last background run is not mistaken for a wake from sleep", () => {
  const A = dev("airpods", "AirPods");
  const priorities = [A, S];
  const t0 = 1_000_000;
  const late = t0 + (SLEEP_GAP_INTERVALS + 1) * INTERVAL;
  const now = { devices: [S, A], currentUid: "speakers", ts: late + 1000 };

  const keptTs = decide({ prev: makeSnapshot([S, A], "speakers", t0), now, priorities, hidden: [], intervalMs: INTERVAL });
  assert.equal(keptTs.reason, "woke-from-sleep");

  const fresh = decide({ prev: makeSnapshot([S, A], "speakers", late), now, priorities, hidden: [], intervalMs: INTERVAL });
  assert.deepEqual(fresh, { target: null, reason: "no-change" });
});
