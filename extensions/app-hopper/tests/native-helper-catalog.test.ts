import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { nativeHelpers, nativeHelperSources } from "../src/native-helper-catalog";
import { sourceHash } from "../scripts/native-helpers";
import createLoader from "./load-ts.ts";

test("build identities select bundled helpers for runtime and Firefox/Zen installation without a compiler", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ah-native-catalog-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const assets = path.join(root, "assets");
  await mkdir(path.join(assets, "native"), { recursive: true });
  const entries: Record<string, { sourceHash: string; file: string; sha256: string }> = {};
  for (const helper of nativeHelpers.helpers) {
    for (const source of nativeHelperSources(helper, assets)) await writeFile(source, path.basename(source));
  }
  for (const helper of nativeHelpers.helpers) {
    // The builder's source identity produces a manifest consumed by runtime and host installation.
    const hash = sourceHash(helper, assets);
    const bytes = Buffer.from(`bundled ${helper.name}`);
    const file = `${helper.name}-${hash}`;
    entries[helper.name] = { file, sourceHash: hash, sha256: createHash("sha256").update(bytes).digest("hex") };
    await writeFile(path.join(assets, "native", file), bytes, { mode: 0o755 });
  }
  await writeFile(path.join(assets, "native/manifest.json"), JSON.stringify({ version: 1, helpers: entries }));
  const load = createLoader({
    "@raycast/api": { environment: { assetsPath: assets, supportPath: path.join(root, "support") } },
    "node:os": { homedir: () => root },
    "node:child_process": { execFile: () => assert.fail("bundled helpers must not invoke the compiler") },
  });
  const helpers = load("src/helpers/native-helper.ts");
  for (const helper of nativeHelpers.helpers) {
    assert.equal(
      await helpers.ensureNativeHelper(helper.name, "/unused"),
      path.join(assets, "native", entries[helper.name].file),
    );
  }
  const integration = load("src/browsers/firefox-integration.ts");
  for (const id of ["firefox", "zen"]) {
    await integration.installFirefoxHost(id);
    const manifest = JSON.parse(
      await readFile(
        path.join(root, `Library/Application Support/Mozilla/NativeMessagingHosts/app_hopper.${id}.json`),
        "utf8",
      ),
    );
    assert(manifest.path.endsWith(`-${entries["firefox-bridge"].sourceHash}`));
    assert.equal(await readFile(manifest.path, "utf8"), "bundled firefox-bridge");
    assert.equal(await integration.isFirefoxHostInstalled(id), true);
  }
  assert.throws(() => helpers.resolveNativeHelper("unknown-helper", "/unused"), /Unknown native helper/);
  await rm(path.join(assets, "runtime-status.swift"));
  const fresh = createLoader({
    "@raycast/api": { environment: { assetsPath: assets } },
    "node:child_process": { execFile: () => assert.fail("missing sources must not compile or select a fallback") },
  })("src/helpers/native-helper.ts");
  await assert.rejects(fresh.ensureNativeHelper("runtime-status", "/unused"), /ENOENT/);
});
