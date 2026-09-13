import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PreviewCache } from "../src/preview-cache";

const directories: string[] = [];
function image() {
  const directory = mkdtempSync(join(tmpdir(), "coast-preview-test-"));
  directories.push(directory);
  const path = join(directory, "image.png");
  writeFileSync(path, "synthetic test image");
  return path;
}
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("reuses valid paths and coalesces concurrent exports", async () => {
  const cache = new PreviewCache();
  const path = image();
  let calls = 0;
  const loader = async () => {
    calls++;
    return path;
  };
  const first = cache.load("source:1", loader);
  expect(cache.load("source:1", loader)).toBe(first);
  expect(await first).toBe(path);
  expect(await cache.load("source:1", loader)).toBe(path);
  expect(calls).toBe(1);
});

test("evicts deleted files and retries failed exports", async () => {
  const cache = new PreviewCache();
  const path = image();
  await cache.load("1", async () => path);
  rmSync(path);
  expect(cache.get("1")).toBeUndefined();
  await expect(cache.load("1", async () => path)).rejects.toThrow(
    "unavailable",
  );
  await expect(
    cache.load("1", async () => {
      throw new Error("offline");
    }),
  ).rejects.toThrow("offline");
  const replacement = image();
  expect(await cache.load("1", async () => replacement)).toBe(replacement);
});

test("keeps sources separate and evicts the least recently used path", async () => {
  const cache = new PreviewCache(2);
  const first = image();
  const otherSource = image();
  await cache.load("source-a:1", async () => first);
  await cache.load("source-b:1", async () => otherSource);
  expect(cache.get("source-a:1")).toBe(first);
  await cache.load("source-a:2", async () => image());
  expect(cache.get("source-b:1")).toBeUndefined();
  expect(cache.get("source-a:1")).toBe(first);
});
