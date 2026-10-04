import assert from "node:assert/strict";
import test from "node:test";
import { createLatestRequestGuard, fallbackTarget, normalizeTarget, targetForPlatform } from "../src/target-utils.js";

test("accepts results only from the latest discovery request", () => {
  const guard = createLatestRequestGuard();
  const isFirstRequestLatest = guard.begin();
  const isSecondRequestLatest = guard.begin();

  assert.equal(isFirstRequestLatest(), false);
  assert.equal(isSecondRequestLatest(), true);
});

test("keeps the booted selector exclusive to iOS Simulator", () => {
  assert.equal(normalizeTarget("ios", " booted "), "booted");
  assert.equal(normalizeTarget("android", "booted"), undefined);
  assert.equal(normalizeTarget("ios-device", "BOOTED"), undefined);
});

test("preserves explicit identifiers for their selected platform", () => {
  assert.equal(normalizeTarget("ios", " simulator-udid "), "simulator-udid");
  assert.equal(normalizeTarget("android", " emulator-5554 "), "emulator-5554");
  assert.equal(normalizeTarget("ios-device", " physical-device-id "), "physical-device-id");
});

test("uses booted only as the iOS Simulator fallback", () => {
  assert.equal(fallbackTarget("ios"), "booted");
  assert.equal(fallbackTarget("android"), undefined);
  assert.equal(fallbackTarget("ios-device"), undefined);
  assert.equal(fallbackTarget("android", "booted"), undefined);
  assert.equal(fallbackTarget("ios-device", "booted"), undefined);
});

test("uses a selected target only for the platform that owns it", () => {
  const androidSelection = { platform: "android" as const, id: "emulator-5554" };

  assert.equal(targetForPlatform(androidSelection, "android"), "emulator-5554");
  assert.equal(targetForPlatform(androidSelection, "ios"), "booted");
  assert.equal(targetForPlatform(androidSelection, "ios-device"), undefined);
});
