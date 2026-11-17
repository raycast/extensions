import assert from "node:assert/strict";
import { test } from "node:test";
import { pendingConfigChanges } from "../src/lib/blip-preferences";
import type { Config } from "../src/lib/types";

const blip: Config = {
  auto_accept_disabled: false,
  auto_save_media_to_library: true,
  custom_default_save_path: "",
  limit_upload_mbps: 0,
  limit_download_mbps: 50,
};
const mac = { supportsPhotos: true };

test("default preferences leave Blip untouched", () => {
  const prefs = { autoAccept: "keep", saveToPhotos: "keep", saveFolder: "", uploadLimitMbps: "", downloadLimitMbps: "" } as const;
  for (const values of [prefs, {}]) {
    const { changes, problems } = pendingConfigChanges(values, blip, mac);
    assert.deepEqual({ changes, problems }, { changes: [], problems: [] });
  }
});

test("only settings that differ from Blip are sent", () => {
  const { changes } = pendingConfigChanges({ autoAccept: "on", saveToPhotos: "off", saveFolder: "/tmp/in" }, blip, mac);
  assert.deepEqual(changes, [
    { event: "saveToPhotos", value: false },
    { event: "saveFolder", value: "/tmp/in" },
  ]);
});

test("a single speed limit keeps the other one as Blip has it", () => {
  const { changes } = pendingConfigChanges({ uploadLimitMbps: "20" }, blip, mac);
  assert.deepEqual(changes, [{ event: "speedLimits", uploadMbps: 20, downloadMbps: 50 }]);
  assert.deepEqual(pendingConfigChanges({ downloadLimitMbps: "0" }, blip, mac).changes, [
    { event: "speedLimits", uploadMbps: 0, downloadMbps: 0 },
  ]);
});

test("bad limits are reported, not sent", () => {
  const { changes, problems } = pendingConfigChanges({ uploadLimitMbps: "fast", downloadLimitMbps: "-1" }, blip, mac);
  assert.deepEqual(changes, []);
  assert.equal(problems.length, 2);
});

test("limits beyond any real link speed are rejected instead of wrapping around", () => {
  const { changes, problems } = pendingConfigChanges({ uploadLimitMbps: "5000000000" }, blip, mac);
  assert.deepEqual(changes, []);
  assert.match(problems[0], /100,000/);
});

test("a setting already pushed isn't pushed again, so a later change in Blip itself is respected", () => {
  // The user set auto-accept Off in Raycast earlier (pushed), then turned it back on in Blip.
  const prefs = { autoAccept: "off", uploadLimitMbps: "20" } as const;
  const lastApplied = { autoAccept: "off", uploadLimitMbps: "20" } as const;
  assert.deepEqual(pendingConfigChanges(prefs, blip, { ...mac, lastApplied }).changes, []);
  // Changing it in Raycast again pushes it.
  assert.deepEqual(pendingConfigChanges({ ...prefs, autoAccept: "on" }, { ...blip, auto_accept_disabled: true }, { ...mac, lastApplied }).changes, [
    { event: "autoAccept", value: true },
  ]);
});

test("an invalid setting doesn't stop the valid ones from being remembered as pushed", () => {
  const { applied } = pendingConfigChanges({ saveFolder: "/tmp/in", uploadLimitMbps: "1O" }, blip, {
    ...mac,
    lastApplied: { uploadLimitMbps: "20" },
  });
  assert.equal(applied.saveFolder, "/tmp/in");
  assert.equal(applied.uploadLimitMbps, "20");
});

test("Photos setting is ignored where Blip has no Photos library", () => {
  assert.deepEqual(pendingConfigChanges({ saveToPhotos: "off" }, blip, { supportsPhotos: false }).changes, []);
});
