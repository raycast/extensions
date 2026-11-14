import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import createLoader from "./load-ts.ts";

test("bundled helpers skip compilation, recover executable mode, reject corruption, and invalidate on source changes", async (t) => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "app-hopper-bundle-"));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const source = "reviewable Swift source";
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const binary = "test bundled executable";
  const file = `runtime-status-${hash}`;
  await fsp.mkdir(path.join(directory, "native"));
  await fsp.writeFile(path.join(directory, "runtime-status.swift"), source);
  await fsp.writeFile(path.join(directory, "native", file), binary, { mode: 0o600 });
  await fsp.writeFile(
    path.join(directory, "native/manifest.json"),
    JSON.stringify({
      version: 1,
      helpers: {
        "runtime-status": { file, sourceHash: hash, sha256: createHash("sha256").update(binary).digest("hex") },
      },
    }),
  );
  let compiles = 0;
  function helpers() {
    return createLoader({
      "@raycast/api": { environment: { assetsPath: directory, supportPath: path.join(directory, "support") } },
      "node:child_process": {
        execFile: (_binary, args, _options, callback) => {
          compiles++;
          fs.writeFileSync(args.at(-1), "compiled source update");
          callback(null, "", "");
        },
      },
    })("src/helpers/native-helper.ts");
  }
  const bundled = await helpers().ensureNativeHelper("runtime-status", "/unused");
  assert.equal(bundled, path.join(directory, "native", file));
  assert.equal(compiles, 0);
  assert.notEqual((await fsp.stat(bundled)).mode & 0o111, 0);
  await fsp.writeFile(bundled, "tampered executable");
  await assert.rejects(helpers().ensureNativeHelper("runtime-status", "/unused"), /damaged/);
  assert.equal(compiles, 0, "corruption must not silently fall back to compilation");
  await fsp.writeFile(path.join(directory, "runtime-status.swift"), source + " changed");
  const updated = await helpers().ensureNativeHelper("runtime-status", "/unused");
  assert.equal(path.dirname(updated), path.join(directory, "support"));
  assert.equal(compiles, 1);
});

test("Firefox installs a bundled native host without requiring a compiler", async (t) => {
  const home = await fsp.mkdtemp(path.join(os.tmpdir(), "app-hopper-bundled-firefox-"));
  t.after(() => fsp.rm(home, { recursive: true, force: true }));
  const bundled = path.join(home, "host");
  await fsp.writeFile(bundled, "bundled host bytes");
  const integration = createLoader({
    "node:os": { homedir: () => home },
    "../helpers/native-helper": {
      resolveNativeHelper: () => ({ sourceHash: "0123456789ab", sourcePaths: [], bundledBinaryPath: bundled }),
    },
    "../helpers/applescript": {
      getRaycastPaths: () => ({ assetsPath: path.resolve("assets") }),
      execBinary: async () => assert.fail("Bundled installation must not invoke a compiler"),
    },
  })("src/browsers/firefox-integration.ts");
  await integration.installFirefoxHost();
  const manifest = JSON.parse(
    await fsp.readFile(
      path.join(home, "Library/Application Support/Mozilla/NativeMessagingHosts/app_hopper.firefox.json"),
      "utf8",
    ),
  );
  assert.equal(await fsp.readFile(manifest.path, "utf8"), "bundled host bytes");
  assert.equal(await integration.isFirefoxHostInstalled(), true);
});
