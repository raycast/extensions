// engine/watcher.ts on real folders (fs.watch runs on FSEvents): DigUp's filters (hidden, skipped, developer and
// .noindex folders; code noise), the 0.75 s debounce (shortened here), the code quiet period and its longest wait,
// missing and unreadable folders, drives coming back, and following new settings.

import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { silentLog } from "../engine/log";
import { CODE_NOISE, Watcher, type WatchProblem, type WatchedConfig, type WatcherOptions } from "../engine/watcher";

const roots: string[] = [];
const watchers: Watcher[] = [];
after(() => {
  for (const watcher of watchers) watcher.stop();
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A temp folder spelled as os.tmpdir() gives it: /var/folders/…, which the file system spells /private/var/…. */
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "digup-watch-"));
  roots.push(dir);
  return dir;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** FSEvents takes a moment to start, and reports a folder made just before it did: let both pass. */
const SETTLE_MS = 400;

function settings(over: Partial<WatchedConfig> = {}): WatchedConfig {
  return { folders: [], skipped: [], codeFolders: [], codeQuietSeconds: 60, ...over };
}

function start(config: WatchedConfig, options: Partial<WatcherOptions> = {}) {
  const syncs: Array<"main" | "code"> = [];
  const problems: WatchProblem[][] = [];
  const watcher = new Watcher({
    log: silentLog,
    onSync: (index) => syncs.push(index),
    onProblems: (list) => problems.push(list),
    debounceMs: 150,
    volumes: null,
    ...options,
  });
  watchers.push(watcher);
  watcher.update(config);
  return { watcher, syncs, problems };
}

describe("the chosen folders", () => {
  it("asks for one sync after a burst of new files", async () => {
    const root = tempDir();
    await sleep(SETTLE_MS);
    const { syncs } = start(settings({ folders: [root] }));
    await sleep(SETTLE_MS);
    syncs.length = 0;
    for (let i = 0; i < 5; i++) writeFileSync(join(root, `photo-${i}.jpg`), "x");
    mkdirSync(join(root, "Trip"));
    writeFileSync(join(root, "Trip", "notes.md"), "x");
    await sleep(80);
    assert.deepEqual(syncs, [], "nothing before the debounce");
    await sleep(500);
    assert.deepEqual(syncs, ["main"]);
  });

  it("ignores hidden files, developer and .noindex folders, ~/Library-style skips and the skipped folders", async () => {
    const root = tempDir();
    // The skipped folder is given in the file system's spelling (/private/var/…), the root as tmpdir() spells it.
    const skipped = join(root, "Skipped");
    mkdirSync(skipped);
    mkdirSync(join(root, "node_modules"));
    mkdirSync(join(root, "Index.noindex"));
    mkdirSync(join(root, ".git"));
    await sleep(SETTLE_MS);
    const { syncs } = start(settings({ folders: [root], skipped: [realpathSync(skipped)] }));
    await sleep(SETTLE_MS);
    syncs.length = 0;
    writeFileSync(join(root, ".DS_Store"), "x");
    writeFileSync(join(root, ".git", "index"), "x");
    writeFileSync(join(root, "node_modules", "a.js"), "x");
    writeFileSync(join(root, "Index.noindex", "a.pdf"), "x");
    writeFileSync(join(skipped, "a.jpg"), "x");
    mkdirSync(join(skipped, "Deeper"));
    writeFileSync(join(skipped, "Deeper", "b.jpg"), "x");
    await sleep(600);
    assert.deepEqual(syncs, []);
    writeFileSync(join(root, "kept.jpg"), "x");
    await sleep(500);
    assert.deepEqual(syncs, ["main"]);
  });

  it("follows new settings: a folder taken out no longer syncs, one put in does", async () => {
    const a = tempDir();
    const b = tempDir();
    await sleep(SETTLE_MS);
    const { watcher, syncs } = start(settings({ folders: [a] }));
    watcher.update(settings({ folders: [b] }));
    await sleep(SETTLE_MS);
    syncs.length = 0;
    writeFileSync(join(a, "x.jpg"), "x");
    await sleep(500);
    assert.deepEqual(syncs, []);
    writeFileSync(join(b, "y.jpg"), "x");
    await sleep(500);
    assert.deepEqual(syncs, ["main"]);
  });

  it("stops", async () => {
    const root = tempDir();
    await sleep(SETTLE_MS);
    const { watcher, syncs } = start(settings({ folders: [root] }));
    await sleep(SETTLE_MS);
    watcher.stop();
    syncs.length = 0;
    writeFileSync(join(root, "x.jpg"), "x");
    await sleep(500);
    assert.deepEqual(syncs, []);
  });
});

describe("the code folders", () => {
  it("has DigUp's noise list", () => {
    for (const name of ["node_modules", "build", "dist", "target", "DerivedData", "lightning_logs"]) {
      assert.ok(CODE_NOISE.has(name), name);
    }
    // Code search skips these by rule, but changes there still count (DigUp's list doesn't have them).
    for (const name of ["deps", "generated", "external"]) assert.equal(CODE_NOISE.has(name), false, name);
  });

  it("catches up once code has been quiet, and ignores git's files, builds and dependencies", async () => {
    const root = tempDir();
    for (const name of [".git", "build", "node_modules", "src"]) mkdirSync(join(root, name));
    await sleep(SETTLE_MS);
    const { syncs } = start(settings({ codeFolders: [root] }), { codeQuietMs: 300 });
    await sleep(SETTLE_MS);
    syncs.length = 0;
    writeFileSync(join(root, ".git", "HEAD"), "x");
    writeFileSync(join(root, "build", "out.o"), "x");
    writeFileSync(join(root, "node_modules", "a.js"), "x");
    await sleep(600);
    assert.deepEqual(syncs, []);
    writeFileSync(join(root, "src", "main.ts"), "x");
    await sleep(150);
    writeFileSync(join(root, "src", "main.ts"), "xy");
    await sleep(200);
    assert.deepEqual(syncs, [], "still inside the quiet period after the second save");
    await sleep(400);
    assert.deepEqual(syncs, ["code"]);
  });

  it("catches up after the longest wait while code keeps changing", async () => {
    const root = tempDir();
    await sleep(SETTLE_MS);
    const { syncs } = start(settings({ codeFolders: [root] }), { codeQuietMs: 500, codeLongestWaitMs: 900 });
    await sleep(SETTLE_MS);
    syncs.length = 0;
    const began = Date.now();
    let firstAt = 0;
    while (Date.now() - began < 1700) {
      writeFileSync(join(root, "busy.ts"), String(Date.now()));
      if (syncs.length > 0 && firstAt === 0) firstAt = Date.now() - began;
      await sleep(100);
    }
    assert.ok(firstAt > 0, "a sync came while the changes went on");
    assert.ok(firstAt >= 800 && firstAt < 1400, `first sync after ${firstAt} ms`);
  });

  it("doesn't mix the indexes: main changes sync main, code changes sync code", async () => {
    const main = tempDir();
    const code = tempDir();
    await sleep(SETTLE_MS);
    const { syncs } = start(settings({ folders: [main], codeFolders: [code] }), { codeQuietMs: 100 });
    await sleep(SETTLE_MS);
    syncs.length = 0;
    writeFileSync(join(code, "a.py"), "x");
    await sleep(400);
    assert.deepEqual(syncs, ["code"]);
    writeFileSync(join(main, "a.pdf"), "x");
    await sleep(400);
    assert.deepEqual(syncs, ["code", "main"]);
  });
});

describe("folders that can't be watched", () => {
  it("reports a missing folder, keeps going, and watches it once it's there", async () => {
    const root = tempDir();
    const later = join(root, "Later");
    const { watcher, syncs, problems } = start(settings({ folders: [later] }), { recheckMs: 100 });
    assert.deepEqual(problems.at(-1), [{ folder: later, code: false, problem: "missing", error: "ENOENT" }]);
    mkdirSync(later);
    await sleep(300);
    assert.deepEqual(problems.at(-1), []);
    assert.ok(syncs.includes("main"), "a folder that came back is synced");
    assert.deepEqual(watcher.problems, []);
    await sleep(SETTLE_MS);
    syncs.length = 0;
    writeFileSync(join(later, "x.jpg"), "x");
    await sleep(500);
    assert.deepEqual(syncs, ["main"]);
  });

  it("reports a folder that went away", async () => {
    const root = tempDir();
    const gone = join(root, "Gone");
    mkdirSync(gone);
    const { watcher, problems } = start(settings({ folders: [gone] }), { recheckMs: 100 });
    assert.deepEqual(watcher.problems, []);
    assert.equal(problems.length, 0, "nothing to report");
    rmSync(gone, { recursive: true });
    await sleep(400);
    assert.equal(problems.at(-1)?.[0]?.problem, "missing");
  });

  it("reports a folder it may not read", { skip: process.getuid?.() === 0 }, async () => {
    const root = tempDir();
    const locked = join(root, "Locked");
    mkdirSync(locked);
    chmodSync(locked, 0o000);
    try {
      const { problems } = start(settings({ codeFolders: [locked] }));
      assert.deepEqual(problems.at(-1), [{ folder: locked, code: true, problem: "unreadable", error: "EACCES" }]);
    } finally {
      chmodSync(locked, 0o700);
    }
  });

  it("looks again when a drive is mounted (the volumes folder changes)", async () => {
    const volumes = tempDir();
    const drive = join(volumes, "Backup");
    const photos = join(drive, "Photos");
    const { syncs, problems } = start(settings({ folders: [photos] }), { volumes, recheckMs: 60_000 });
    assert.equal(problems.at(-1)?.[0]?.problem, "missing");
    await sleep(SETTLE_MS);
    mkdirSync(photos, { recursive: true });
    // The volumes watcher waits a second for the mount to settle.
    await sleep(1600);
    assert.deepEqual(problems.at(-1), []);
    assert.ok(syncs.includes("main"));
  });
});
