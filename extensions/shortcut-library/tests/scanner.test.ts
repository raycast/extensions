import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { discoverMenuShortcuts } from "../src/scanner";

test("readable plists without NSUserKeyEquivalents still count as read", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shortcut-scan-"));
  const empty = join(dir, "com.example.empty.plist");
  writeFileSync(empty, "<?xml version='1.0'?><plist version='1.0'><dict/></plist>");
  try {
    const result = await discoverMenuShortcuts([empty]);
    assert.deepEqual(result.readFiles, [empty]);
    assert.deepEqual(result.failedApps, []);
    assert.deepEqual(result.apps, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unreadable plists are failed, not treated as empty reads", async () => {
  const missing = join(tmpdir(), "definitely-missing-shortcut-library.plist");
  const result = await discoverMenuShortcuts([missing]);
  assert.deepEqual(result.readFiles, []);
  assert.deepEqual(result.failedApps, [missing]);
});
