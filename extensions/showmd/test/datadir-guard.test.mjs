// Guard: the extension's platformDataDir must agree with server/settings.js
// on every platform and env override, or discovery reads a directory the
// server never writes. Drift here is a silent split-brain, so it fails a
// test instead.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { platformDataDir } from "../src/lib/showmd.ts";
import serverSettings from "../../../server/settings.js";

const HOME = path.join(path.sep, "guard-home");

function extensionDir(platform, env) {
  return platformDataDir({ platform, homedir: () => HOME, env });
}

// server/settings.js reads LOCALAPPDATA / XDG_DATA_HOME / SHOWMD_SETTINGS_HOME
// from process.env directly, so each case mutates and restores it.
function withProcessEnv(env, fn) {
  const keys = ["LOCALAPPDATA", "XDG_DATA_HOME", "SHOWMD_SETTINGS_HOME"];
  const saved = {};
  for (const key of keys) {
    saved[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return fn();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

const MATRIX = [
  { platform: "darwin", env: {} },
  { platform: "win32", env: {} },
  { platform: "win32", env: { LOCALAPPDATA: path.join(path.sep, "guard-local") } },
  { platform: "linux", env: {} },
  { platform: "linux", env: { XDG_DATA_HOME: path.join(path.sep, "guard-xdg") } },
];

for (const { platform, env } of MATRIX) {
  test(`platformDataDir matches server settings.js (${platform} ${JSON.stringify(env)})`, () => {
    withProcessEnv(env, () => {
      assert.equal(
        extensionDir(platform, env),
        serverSettings.platformDataDir(platform, HOME),
      );
    });
  });
}

test("SHOWMD_SETTINGS_HOME overrides the platform dir, like settingsDir", () => {
  const override = path.join(path.sep, "guard-settings-home");
  withProcessEnv({ SHOWMD_SETTINGS_HOME: override }, () => {
    for (const platform of ["darwin", "win32", "linux"]) {
      assert.equal(
        extensionDir(platform, { SHOWMD_SETTINGS_HOME: override }),
        serverSettings.settingsDir(),
      );
    }
  });
});
