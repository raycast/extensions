import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { decodeStoredData } from "../src/read-stored-items.ts";

const plist = readFileSync(new URL("./fixtures/tethered-preferences.plist", import.meta.url), "utf8");

test("decodes saved profiles from Tethered preferences", () => {
  assert.deepEqual(decodeStoredData(plist, "settingsProfiles"), [{ id: "sample-profile", name: "Home [Quiet]" }]);
});

test("decodes status and checkout replies from Tethered preferences", () => {
  assert.deepEqual(decodeStoredData(plist, "raycastStatus"), {
    request: "fixture-request",
    batteryLevel: 75,
    activeProfile: "Home [Quiet]",
  });
  assert.deepEqual(decodeStoredData(plist, "raycastCheckout"), {
    request: "fixture-request",
    state: "starting",
  });
});

test("returns undefined for an absent preference", () => {
  assert.equal(decodeStoredData(plist, "missingPreference"), undefined);
});
