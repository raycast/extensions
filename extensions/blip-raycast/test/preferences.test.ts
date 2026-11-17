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
  assert.deepEqual(pendingConfigChanges(prefs, blip, mac), { changes: [], problems: [] });
  assert.deepEqual(pendingConfigChanges({}, blip, mac), { changes: [], problems: [] });
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

test("Photos setting is ignored where Blip has no Photos library", () => {
  assert.deepEqual(pendingConfigChanges({ saveToPhotos: "off" }, blip, { supportsPhotos: false }).changes, []);
});
