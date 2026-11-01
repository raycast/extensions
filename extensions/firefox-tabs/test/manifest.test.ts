import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { isNativeHostRegistered } from "../src/lib/manifest.ts";

let dir: string;
let manifest: string;
let runSh: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "raycast-firefox-manifest-"));
  manifest = join(dir, "raycast_firefox.json");
  runSh = join(dir, "run.sh");
  writeFileSync(runSh, "#!/bin/sh\n");
  chmodSync(runSh, 0o755);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const writeManifest = (contents: object | string) =>
  writeFileSync(manifest, typeof contents === "string" ? contents : JSON.stringify(contents));

describe("isNativeHostRegistered", () => {
  test("true when the manifest names raycast_firefox and points at an executable run.sh", () => {
    writeManifest({ name: "raycast_firefox", path: runSh, type: "stdio" });
    assert.equal(isNativeHostRegistered(manifest), true);
  });

  test("false when the manifest is missing or not JSON", () => {
    assert.equal(isNativeHostRegistered(manifest), false);
    writeManifest("{not json");
    assert.equal(isNativeHostRegistered(manifest), false);
  });

  test("false for a manifest with another name or no path", () => {
    writeManifest({ name: "something_else", path: runSh });
    assert.equal(isNativeHostRegistered(manifest), false);
    writeManifest({ name: "raycast_firefox" });
    assert.equal(isNativeHostRegistered(manifest), false);
  });

  test("false when run.sh is missing or not executable", () => {
    writeManifest({ name: "raycast_firefox", path: join(dir, "gone.sh") });
    assert.equal(isNativeHostRegistered(manifest), false);
    chmodSync(runSh, 0o644);
    writeManifest({ name: "raycast_firefox", path: runSh });
    assert.equal(isNativeHostRegistered(manifest), false);
  });
});
