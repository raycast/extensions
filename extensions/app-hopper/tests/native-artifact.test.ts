import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import createLoader from "./load-ts.ts";

test("prepared universal artifacts start with a fresh support directory and compiler commands disabled", async (t) => {
  const manifestPath = path.resolve("assets/native/manifest.json");
  if (process.platform !== "darwin" || !fs.existsSync(manifestPath)) {
    t.skip("Run npm run build:native on macOS to exercise prepared artifacts");
    return;
  }
  const { config, verifyHelper } = await import("../scripts/native-helpers.ts");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const helper of config.helpers) verifyHelper(helper, manifest.helpers[helper.name]);
  const supportPath = await fsp.mkdtemp(path.join(os.tmpdir(), "app-hopper-clean-support-"));
  t.after(() => fsp.rm(supportPath, { recursive: true, force: true }));
  const calls: string[] = [];
  const load = createLoader({
    "@raycast/api": { environment: { assetsPath: path.resolve("assets"), supportPath } },
    "@raycast/utils": {},
    "node:child_process": {
      execFile: (binary, args, options, callback) => {
        calls.push(binary);
        if (["/usr/bin/swiftc", "/usr/bin/xcrun", "/usr/bin/xcode-select"].includes(binary)) {
          callback(new Error("Compiler tools are disabled for this test"), "", "");
          return;
        }
        childProcess.execFile(binary, args, options, callback);
      },
    },
  });
  const result = await load("src/runtime-environment.ts").checkRuntimeEnvironment();
  assert(["ready", "accessibility"].includes(result.kind), `Unexpected startup result: ${result.kind}`);
  assert.equal(calls.length, 2, "only the system version and bundled permission helper should run");
  assert.equal(calls[0], "/usr/bin/sw_vers");
  assert.match(calls[1], /assets\/native\/runtime-status-/);
  assert.deepEqual(await fsp.readdir(supportPath), [], "no compiled cache is needed");
});
