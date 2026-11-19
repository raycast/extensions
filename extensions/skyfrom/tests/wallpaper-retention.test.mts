import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { pruneWallpapers } from "../src/lib/wallpaper-retention.ts";

const filenames = Array.from({ length: 16 }, (_, index) => `${index.toString(16).padStart(64, "0")}.png`);

async function makeWallpapers(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "skyfrom-wallpaper-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [index, name] of filenames.entries()) {
    const file = join(directory, name);
    const modified = new Date(Date.now() - (60 - index) * 60_000);
    await writeFile(file, "");
    await utimes(file, modified, modified);
  }
  return directory;
}

test("prunes older managed files while keeping desktop references and the applied wallpaper", async (t) => {
  const directory = await makeWallpapers(t);
  await writeFile(join(directory, "personal.png"), "");
  await mkdir(join(directory, "f".repeat(64) + ".png"));

  await pruneWallpapers(directory, join(directory, filenames[0]), async () => [filenames[1]]);
  assert.deepEqual(
    (await readdir(directory)).sort(),
    [filenames[0], filenames[1], ...filenames.slice(4), "personal.png", "f".repeat(64) + ".png"].sort(),
  );
});

test("skips cleanup when the native reference snapshot is unavailable or invalid", async (t) => {
  const directory = await makeWallpapers(t);
  const applied = join(directory, filenames.at(-1)!);
  await assert.rejects(
    pruneWallpapers(directory, applied, async () => {
      throw new Error("Snapshot unavailable");
    }),
  );
  await pruneWallpapers(directory, applied, async () => ["unexpected path"]);
  assert.deepEqual((await readdir(directory)).sort(), [...filenames].sort());
});

test("keeps recently written files while wallpaper settings settle", async (t) => {
  const directory = await makeWallpapers(t);
  const now = new Date();
  await Promise.all(filenames.map((name) => utimes(join(directory, name), now, now)));

  await pruneWallpapers(directory, join(directory, filenames[0]), async () => assert.fail("No stale files to inspect"));
  assert.equal((await readdir(directory)).length, filenames.length);
});
