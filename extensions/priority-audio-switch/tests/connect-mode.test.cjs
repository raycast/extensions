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

const decideMod = load("decide.ts");
const { decide, makeSnapshot, SLEEP_GAP_INTERVALS } = decideMod;
const { defaultConnectMode, connectMode, switchOnConnectUids } = load("connect-mode.ts", { "./decide": decideMod });
const { cycleCandidates } = load("cycle.ts");
const { setPosition, droppedEntries, MAX_PRIORITY } = load("list.ts", { "./decide": decideMod });

const INTERVAL = 10_000;
const dev = (uid, name = uid, transportType) => ({ uid, name, transportType });

const SPEAKERS = dev("speakers", "Desk Speakers", "usb");
const MAC = dev("BuiltInSpeakerDevice", "MacBook Pro Speakers", "builtin");
const AIRPODS = dev("airpods", "AirPods Pro", "bluetooth");
const JACK = dev("BuiltInHeadphoneOutputDevice", "External Headphones", "builtin");
const ADAPTER = dev("usb-jack", "USB-C to 3.5mm Headphone Jack Adapter", "usb");

function run({ prevDevices, prevCurrent, devices, current, priorities, onConnect, hidden = [], gap = INTERVAL }) {
  const t0 = 1_000_000;
  return decide({
    prev: makeSnapshot(prevDevices, prevCurrent, t0),
    now: { devices, currentUid: current, ts: t0 + gap },
    priorities,
    hidden,
    intervalMs: INTERVAL,
    switchOnConnect: onConnect,
  });
}

test("defaults: Bluetooth and headphone jack switch on connect, for output only", () => {
  assert.equal(defaultConnectMode("output", AIRPODS), "switch");
  assert.equal(defaultConnectMode("output", dev("x", "Speaker", "bluetoothle")), "switch");
  assert.equal(defaultConnectMode("output", JACK), "switch");
  assert.equal(defaultConnectMode("output", ADAPTER), "switch");
  assert.equal(defaultConnectMode("output", SPEAKERS), "none");
  assert.equal(defaultConnectMode("output", MAC), "none");
  assert.equal(defaultConnectMode("input", dev("bt-mic", "AirPods Pro", "bluetooth")), "none");
});

test("overrides change the default both ways", () => {
  assert.equal(connectMode("output", AIRPODS, { airpods: "none" }), "none");
  assert.equal(connectMode("output", SPEAKERS, { speakers: "switch" }), "switch");
  assert.equal(connectMode("input", dev("mic"), { mic: "switch" }), "switch");
});

test("a device with a priority never counts as Switch on Connect", () => {
  const uids = switchOnConnectUids("output", [AIRPODS, JACK, SPEAKERS], {}, [dev("airpods")]);
  assert.deepEqual(uids, ["BuiltInHeadphoneOutputDevice"]);
});

test("Switch on Connect device connects → becomes current even over priority 1", () => {
  const r = run({
    prevDevices: [SPEAKERS, MAC],
    prevCurrent: "speakers",
    devices: [SPEAKERS, MAC, AIRPODS],
    current: "speakers",
    priorities: [SPEAKERS, MAC],
    onConnect: ["airpods"],
  });
  assert.deepEqual(r, { target: "airpods", reason: "device-added" });
});

test("after a manual switch away from it, it stays away until it connects again", () => {
  const r = run({
    prevDevices: [SPEAKERS, AIRPODS],
    prevCurrent: "speakers",
    devices: [SPEAKERS, AIRPODS],
    current: "speakers",
    priorities: [SPEAKERS],
    onConnect: ["airpods"],
  });
  assert.deepEqual(r, { target: null, reason: "no-change" });
});

test("it disconnects → back to the best device by priority", () => {
  const r = run({
    prevDevices: [SPEAKERS, MAC, AIRPODS],
    prevCurrent: "airpods",
    devices: [SPEAKERS, MAC],
    current: "BuiltInSpeakerDevice",
    priorities: [SPEAKERS, MAC],
    onConnect: [],
  });
  assert.deepEqual(r, { target: "speakers", reason: "device-removed" });
});

test("a ranked device disconnects → ranked devices win over a connected Switch on Connect device", () => {
  const r = run({
    prevDevices: [SPEAKERS, MAC, JACK],
    prevCurrent: "speakers",
    devices: [MAC, JACK],
    current: "BuiltInHeadphoneOutputDevice",
    priorities: [SPEAKERS, MAC],
    onConnect: ["BuiltInHeadphoneOutputDevice"],
  });
  assert.deepEqual(r, { target: "BuiltInSpeakerDevice", reason: "device-removed" });
});

test("no ranked device left → a Switch on Connect device is used", () => {
  const r = run({
    prevDevices: [SPEAKERS, JACK],
    prevCurrent: "speakers",
    devices: [JACK, MAC],
    current: "BuiltInSpeakerDevice",
    priorities: [SPEAKERS],
    onConnect: ["BuiltInHeadphoneOutputDevice"],
  });
  assert.deepEqual(r, { target: "BuiltInHeadphoneOutputDevice", reason: "device-removed" });
});

test("wake from sleep keeps a current Switch on Connect device", () => {
  const r = run({
    prevDevices: [SPEAKERS, AIRPODS],
    prevCurrent: "airpods",
    devices: [SPEAKERS, AIRPODS],
    current: "airpods",
    priorities: [SPEAKERS],
    onConnect: ["airpods"],
    gap: (SLEEP_GAP_INTERVALS + 1) * INTERVAL,
  });
  assert.deepEqual(r, { target: null, reason: "woke-from-sleep" });
});

test("a hidden Switch on Connect device never takes over", () => {
  const r = run({
    prevDevices: [SPEAKERS],
    prevCurrent: "speakers",
    devices: [SPEAKERS, AIRPODS],
    current: "speakers",
    priorities: [SPEAKERS],
    onConnect: ["airpods"],
    hidden: ["airpods"],
  });
  assert.equal(r.target, null);
});

test("cycle includes Switch on Connect devices after the ranked ones", () => {
  const list = cycleCandidates([SPEAKERS, MAC], [AIRPODS, MAC, SPEAKERS, JACK], [], ["airpods"]);
  assert.deepEqual(
    list.map((d) => d.uid),
    ["speakers", "BuiltInSpeakerDevice", "airpods"],
  );
});

test("priorities go up to 5; a full list pushes the last device out", () => {
  assert.equal(MAX_PRIORITY, 5);
  const full = ["a", "b", "c", "d", "e"].map((uid) => dev(uid));
  const after = setPosition(full, dev("x"), 2);
  assert.deepEqual(
    after.map((p) => p.uid),
    ["a", "x", "b", "c", "d"],
  );
  assert.deepEqual(
    droppedEntries(full, after, "x").map((p) => p.uid),
    ["e"],
  );
  assert.deepEqual(setPosition(full, dev("x")), full, "appending to a full list does nothing");
});


test("while it is current, a device with a priority that connects does not take over", () => {
  const r = run({
    prevDevices: [MAC, AIRPODS],
    prevCurrent: "airpods",
    devices: [MAC, AIRPODS, SPEAKERS],
    current: "airpods",
    priorities: [SPEAKERS, MAC],
    onConnect: ["airpods"],
  });
  assert.deepEqual(r, { target: null, reason: "no-change" });
});

test("after the active device changed, priorities decide again", () => {
  // AirPods took over on connect, then the user switched to the Mac speakers; now the desk speakers (P1) connect.
  const r = run({
    prevDevices: [MAC, AIRPODS],
    prevCurrent: "BuiltInSpeakerDevice",
    devices: [MAC, AIRPODS, SPEAKERS],
    current: "BuiltInSpeakerDevice",
    priorities: [SPEAKERS, MAC],
    onConnect: ["airpods"],
  });
  assert.deepEqual(r, { target: "speakers", reason: "device-added" });
});
