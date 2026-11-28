const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, "../src/priority", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  new Function("exports", "module", outputText)(mod.exports, mod);
  return mod.exports;
}

const { buildIconPool, findPoolIcon, numberIconFile, defaultIconId, resolveDeviceIcon } = load("icon-pool.ts");
const { normalizeMeta, setMeta, displayName } = load("meta.ts");

// Files in assets/icons/devices (the pool) and assets/icons/system (state icons).
const FILES = [
  "microphone.svg",
  "microphone-filled.svg",
  "device-airpods.svg",
  "device-speaker-filled.svg",
  "bluetooth.svg",
  "usb.svg",
  ".DS_Store",
  "notes.txt",
];
const SYSTEM_FILES = ["circle-number-1.svg", "circle-number-1-filled.svg", "circle-number-4.svg", "eye-off.svg"];

test("pool has the SVGs only, sorted by title", () => {
  const pool = buildIconPool(FILES);
  assert.deepEqual(
    pool.map((p) => p.title),
    ["Bluetooth", "Earbuds", "Microphone", "Speaker", "USB"],
  );
});

test("pool pairs outline and filled variants", () => {
  const mic = findPoolIcon(buildIconPool(FILES), "microphone");
  assert.deepEqual(mic, { id: "microphone", title: "Microphone", outline: "microphone.svg", filled: "microphone-filled.svg" });
});

test("an icon with only one variant uses it for both states", () => {
  const pods = findPoolIcon(buildIconPool(FILES), "device-airpods");
  assert.equal(pods.outline, "device-airpods.svg");
  assert.equal(pods.filled, "device-airpods.svg");
  assert.equal(pods.title, "Earbuds");
});

test("an icon with only a filled file uses it for both states", () => {
  const speaker = findPoolIcon(buildIconPool(FILES), "device-speaker");
  assert.equal(speaker.outline, "device-speaker-filled.svg");
  assert.equal(speaker.filled, "device-speaker-filled.svg");
});

test("findPoolIcon returns undefined for unknown or missing ids", () => {
  const pool = buildIconPool(FILES);
  assert.equal(findPoolIcon(pool, "nope"), undefined);
  assert.equal(findPoolIcon(pool, undefined), undefined);
});

test("an empty or missing folder gives an empty pool", () => {
  assert.deepEqual(buildIconPool([]), []);
});

test("numberIconFile picks outline or filled and returns undefined when missing", () => {
  assert.equal(numberIconFile(1, false, SYSTEM_FILES), "circle-number-1.svg");
  assert.equal(numberIconFile(1, true, SYSTEM_FILES), "circle-number-1-filled.svg");
  assert.equal(numberIconFile(6, false, SYSTEM_FILES), undefined);
  assert.equal(numberIconFile(1, false, []), undefined);
});

test("normalizeMeta trims names and drops ones equal to the system name", () => {
  assert.deepEqual(normalizeMeta({ name: "  Desk  " }, "USB Mic"), { name: "Desk" });
  assert.deepEqual(normalizeMeta({ name: "USB Mic" }, "USB Mic"), {});
  assert.deepEqual(normalizeMeta({ name: "   ", icon: "" }, "USB Mic"), {});
});

test("setMeta stores, replaces and removes entries without mutating the input", () => {
  const empty = {};
  const a = setMeta(empty, "u1", { name: "Desk", icon: "microphone" }, "USB Mic");
  assert.deepEqual(a, { u1: { name: "Desk", icon: "microphone" } });
  assert.deepEqual(empty, {});
  const b = setMeta(a, "u1", { name: "Desk 2" }, "USB Mic");
  assert.deepEqual(b, { u1: { name: "Desk 2" } });
  assert.deepEqual(setMeta(b, "u1", { name: "" }, "USB Mic"), {});
  assert.deepEqual(setMeta({ other: { icon: "x" } }, "u1", {}, "USB Mic"), { other: { icon: "x" } });
});

test("displayName prefers the custom name", () => {
  assert.equal(displayName("USB Mic", { name: "Desk" }), "Desk");
  assert.equal(displayName("USB Mic", undefined), "USB Mic");
  assert.equal(displayName("USB Mic", { icon: "x" }), "USB Mic");
});

test("default output icons by device type", () => {
  const out = (device) => defaultIconId(device, "output");
  assert.equal(out({ uid: "BuiltInSpeakerDevice", name: "MacBook Pro Speakers", transportType: "builtin" }), "device-laptop");
  assert.equal(out({ uid: "BuiltInSpeakerDevice", name: "iMac Speakers", transportType: "builtin" }), "device-imac");
  assert.equal(out({ uid: "BuiltInSpeakerDevice", name: "Mac mini Speakers", transportType: "builtin" }), "devices-2");
  assert.equal(out({ uid: "BuiltInHeadphoneOutputDevice", name: "External Headphones", transportType: "builtin" }), "device-speaker");
  assert.equal(out({ name: "USB-C to 3.5mm Headphone Jack Adapter", transportType: "usb" }), "usb");
  assert.equal(out({ name: "AirPods Pro", transportType: "bluetooth" }), "bluetooth");
  assert.equal(out({ name: "Speaker", transportType: "bluetoothle" }), "bluetooth");
  assert.equal(out({ name: "Living Room", transportType: "airplay" }), "cast");
  assert.equal(out({ name: "LG TV", transportType: "hdmi" }), "device-desktop");
  assert.equal(out({ name: "MO27Q28GR", transportType: "displayport" }), "device-desktop");
  assert.equal(out({ name: "BlackHole 2ch", transportType: "virtual" }), "volume");
  assert.equal(out({ name: "Not connected" }), "volume");
});

test("default input icons: the Mac's microphone by model, everything else a microphone", () => {
  const inp = (device) => defaultIconId(device, "input");
  assert.equal(inp({ uid: "BuiltInMicrophoneDevice", name: "MacBook Pro Microphone", transportType: "builtin" }), "device-laptop");
  assert.equal(inp({ name: "iMac Microphone", transportType: "builtin" }), "device-imac");
  assert.equal(inp({ name: "Mac Studio Microphone", transportType: "builtin" }), "devices-2");
  assert.equal(inp({ name: "fifine Microphone", transportType: "usb" }), "microphone");
  assert.equal(inp({ name: "AirPods Pro", transportType: "bluetooth" }), "microphone");
  assert.equal(inp({ name: "Not connected" }), "microphone");
});

test("a chosen icon wins over the default; a missing one falls back to it", () => {
  const pool = buildIconPool(FILES);
  const bt = { transportType: "bluetooth" };
  assert.equal(resolveDeviceIcon(pool, bt, "output", "microphone").id, "microphone");
  assert.equal(resolveDeviceIcon(pool, bt, "output", undefined).id, "bluetooth");
  assert.equal(resolveDeviceIcon(pool, bt, "output", "removed-icon").id, "bluetooth");
  assert.equal(resolveDeviceIcon(pool, bt, "input", undefined).id, "microphone");
  assert.equal(resolveDeviceIcon([], bt, "output", undefined), undefined);
});
