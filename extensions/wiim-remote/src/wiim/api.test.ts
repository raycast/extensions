import { test } from "node:test";
import * as assert from "node:assert";

// Test pure logic from api.ts without network calls

// Volume clamping
function clampVolume(v: number) {
  return Math.max(0, Math.min(100, v));
}
function clampPreset(i: number) {
  return Math.max(0, Math.min(11, i));
}
function clampEQPreset(i: number) {
  return Math.max(0, Math.min(21, i));
}

// Command builders (mirrors api.ts exactly)
const inputMap: Record<string, string> = {
  "line-in": "line-in",
  bluetooth: "bluetooth",
  optical: "optical",
  usb: "usb",
  wifi: "wifi",
};

function volumeCmd(v: number) {
  return `setPlayerCmd:vol:${clampVolume(v)}`;
}
function presetCmd(i: number) {
  return `MCUKeyShortClick:${clampPreset(i) + 1}`;
}
function inputCmd(src: string) {
  return `setPlayerCmd:switchmode:${inputMap[src]}`;
}
function eqPresetCmd(i: number) {
  return `setPlayerCmd:equalizer:${clampEQPreset(i)}`;
}
function eqToggleCmd(on: boolean) {
  return `setPlayerCmd:eq:${on ? "on" : "off"}`;
}

// Volume
test("setVolume clamps 0", () => assert.strictEqual(volumeCmd(-5), "setPlayerCmd:vol:0"));
test("setVolume clamps 100", () => assert.strictEqual(volumeCmd(150), "setPlayerCmd:vol:100"));
test("setVolume mid value", () => assert.strictEqual(volumeCmd(35), "setPlayerCmd:vol:35"));

// Presets (1-based MCUKeyShortClick)
test("preset 0 → MCUKeyShortClick:1", () => assert.strictEqual(presetCmd(0), "MCUKeyShortClick:1"));
test("preset 11 → MCUKeyShortClick:12", () => assert.strictEqual(presetCmd(11), "MCUKeyShortClick:12"));
test("preset clamps at 11", () => assert.strictEqual(presetCmd(20), "MCUKeyShortClick:12"));

// Input map
test("line-in maps correctly", () => assert.strictEqual(inputCmd("line-in"), "setPlayerCmd:switchmode:line-in"));
test("bluetooth maps correctly", () => assert.strictEqual(inputCmd("bluetooth"), "setPlayerCmd:switchmode:bluetooth"));
test("optical maps correctly", () => assert.strictEqual(inputCmd("optical"), "setPlayerCmd:switchmode:optical"));
test("usb maps correctly", () => assert.strictEqual(inputCmd("usb"), "setPlayerCmd:switchmode:usb"));
test("wifi maps correctly", () => assert.strictEqual(inputCmd("wifi"), "setPlayerCmd:switchmode:wifi"));

// EQ
test("EQ preset 0 → setPlayerCmd:equalizer:0", () => assert.strictEqual(eqPresetCmd(0), "setPlayerCmd:equalizer:0"));
test("EQ preset 21 → setPlayerCmd:equalizer:21", () =>
  assert.strictEqual(eqPresetCmd(21), "setPlayerCmd:equalizer:21"));
test("EQ preset clamps at 21", () => assert.strictEqual(eqPresetCmd(99), "setPlayerCmd:equalizer:21"));
test("EQ toggle on", () => assert.strictEqual(eqToggleCmd(true), "setPlayerCmd:eq:on"));
test("EQ toggle off", () => assert.strictEqual(eqToggleCmd(false), "setPlayerCmd:eq:off"));

// getPlayerStatus parsing (vol field)
function parseVolume(json: Record<string, unknown>): number | null {
  const n = parseInt(String(json.vol), 10);
  return isNaN(n) ? null : n;
}

test("parses vol from getPlayerStatus", () => assert.strictEqual(parseVolume({ vol: "35" }), 35));
test("parses vol = 0", () => assert.strictEqual(parseVolume({ vol: "0" }), 0));
test("returns null for missing vol", () => assert.strictEqual(parseVolume({}), null));

// getStatusEx parsing (system info)
function parseSystemInfo(json: Record<string, unknown>) {
  return {
    model: json.ssid ?? json.project ?? json.DeviceName ?? "WiiM Device",
    firmwareVersion: json.firmware ?? json.FW_Release_version ?? "Unknown",
    macAddress: json.MAC ?? "Unknown",
    serialNumber: json.uuid ?? "Unknown",
  };
}

test("parses getStatusEx correctly", () => {
  const result = parseSystemInfo({
    project: "WiiM Amp Ultra",
    firmware: "5.2.813343",
    MAC: "AA:BB:CC:DD:EE:FF",
    uuid: "FF98F9ED-8B27-A8FD",
  });
  assert.strictEqual(result.model, "WiiM Amp Ultra");
  assert.strictEqual(result.firmwareVersion, "5.2.813343");
  assert.strictEqual(result.macAddress, "AA:BB:CC:DD:EE:FF");
  assert.strictEqual(result.serialNumber, "FF98F9ED-8B27-A8FD");
});

test("getStatusEx falls back for missing fields", () => {
  const result = parseSystemInfo({});
  assert.strictEqual(result.model, "WiiM Device");
  assert.strictEqual(result.firmwareVersion, "Unknown");
});

test("getStatusEx prefers ssid as device display name", () => {
  const result = parseSystemInfo({
    ssid: "WiiM Amp Ultra-9BBE",
    project: "WiiM_Amp_Ultra",
  });
  assert.strictEqual(result.model, "WiiM Amp Ultra-9BBE");
});

// Volume up/down use read-then-set (absolute value)
function volumeUpResult(current: number, step: number): number {
  return Math.max(0, Math.min(100, current + Math.max(1, step)));
}
function volumeDownResult(current: number, step: number): number {
  return Math.max(0, Math.min(100, current - Math.max(1, step)));
}

test("volumeUp adds step to current", () => assert.strictEqual(volumeUpResult(30, 5), 35));
test("volumeUp clamps at 100", () => assert.strictEqual(volumeUpResult(98, 5), 100));
test("volumeDown subtracts step", () => assert.strictEqual(volumeDownResult(30, 5), 25));
test("volumeDown clamps at 0", () => assert.strictEqual(volumeDownResult(3, 5), 0));
test("volumeUp enforces min step of 1", () => assert.strictEqual(volumeUpResult(30, 0), 31));
