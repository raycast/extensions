import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PNG } from "pngjs";
import { createPngCache } from "../src/rex/png-cache";

const image = { width: 1, height: 1, data: new Uint8Array([255, 100, 0, 255]) };

test("reuses a valid PNG and repairs a truncated file left by an old cache", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "rex-png-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = createPngCache(dir)("pills", "claude", () => image);
  assert.ok(path);
  assert.deepEqual([...PNG.sync.read(readFileSync(path)).data], [...image.data]);
  assert.equal(
    createPngCache(dir)("pills", "claude", () => assert.fail("Valid cache must be reused")),
    path,
  );
  writeFileSync(path, "truncated");
  assert.equal(
    createPngCache(dir)("pills", "claude", () => image),
    path,
  );
  assert.deepEqual([...PNG.sync.read(readFileSync(path)).data], [...image.data]);
  assert.deepEqual(readdirSync(join(dir, "pills")), ["claude.png"]);
});

test("an unavailable cache returns a fallback instead of breaking rendering", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "rex-png-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "not-a-directory");
  writeFileSync(file, "occupied");
  assert.equal(
    createPngCache(file)("pills", "claude", () => image),
    undefined,
  );
});
