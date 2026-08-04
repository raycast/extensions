import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const discoveryPath = new URL("../src/utils/discovery.ts", import.meta.url);

test("auto-detection avoids synchronous process and file APIs", async () => {
  const source = await readFile(discoveryPath, "utf8");

  assert.doesNotMatch(source, /\bexecSync\b/);
  assert.doesNotMatch(source, /\breadFileSync\b/);
  assert.match(source, /export async function getSteamPath\(\)/);
  assert.match(
    source,
    /export async function getSteamLibraries\(steamPath: string\)/,
  );
});
