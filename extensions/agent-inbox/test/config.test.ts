import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { readConfig, syncPreferences, writeConfig } from "../src/core/config";
import { tempDir } from "./helpers";

test("native preference changes reach the collector without overwriting channel configuration", (t) => {
  const path = join(tempDir(t), "config.json");
  writeConfig({ notifications: true, contentSearchEnabled: true, notificationChannels: ["custom"] }, path);
  const deeplink = "raycast://extensions/silencerichard/agent-inbox";
  syncPreferences({ notifications: false, contentSearchEnabled: false, resumeTerminal: "ghostty" }, deeplink, path);
  assert.deepEqual(readConfig(path), {
    notifications: false,
    contentSearchEnabled: false,
    resumeTerminal: "ghostty",
    deeplinkBase: deeplink,
    notificationChannels: ["custom"],
  });
  syncPreferences({ notifications: true, contentSearchEnabled: true, resumeTerminal: "invalid" }, deeplink, path);
  assert.equal(readConfig(path).notifications, true);
  assert.equal(readConfig(path).contentSearchEnabled, true);
  assert.equal(readConfig(path).resumeTerminal, "terminal");
  assert.deepEqual(readConfig(path).notificationChannels, ["custom"]);
});
