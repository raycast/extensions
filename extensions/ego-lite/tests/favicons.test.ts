import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync, StatementSync } from "node:sqlite";
import test, { type TestContext } from "node:test";
import { Worker } from "node:worker_threads";

import { faviconForUrl, loadFaviconIndex, MAX_FAVICON_BYTES, MAX_FAVICON_SOURCE_BYTES } from "../src/lib/favicons";

function png(marker: number, size = 24): Buffer {
  const bytes = Buffer.alloc(size, marker);
  Buffer.from("89504e470d0a1a0a", "hex").copy(bytes);
  Buffer.from("49454e44ae426082", "hex").copy(bytes, bytes.length - 8);
  return bytes;
}

function dataUri(bytes: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "ego-favicons-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "Favicons");
  const database = new DatabaseSync(path);
  database.exec(`
    CREATE TABLE icon_mapping(id INTEGER PRIMARY KEY, page_url TEXT NOT NULL, icon_id INTEGER NOT NULL);
    CREATE TABLE favicon_bitmaps(
      id INTEGER PRIMARY KEY, icon_id INTEGER NOT NULL, last_updated INTEGER DEFAULT 0,
      image_data BLOB, width INTEGER DEFAULT 0, height INTEGER DEFAULT 0
    );
    CREATE INDEX icon_mapping_icon_id ON icon_mapping(icon_id);
  `);
  t.after(() => {
    if (database.isOpen) database.close();
  });
  return {
    path,
    directory,
    database,
    map: (url: string, iconId: number) =>
      database.prepare("INSERT INTO icon_mapping(page_url, icon_id) VALUES (?, ?)").run(url, iconId),
    bitmap: (iconId: number, image: Uint8Array, width = 16, updated = 1) =>
      database
        .prepare("INSERT INTO favicon_bitmaps(icon_id, image_data, width, height, last_updated) VALUES (?, ?, ?, ?, ?)")
        .run(iconId, image, width, width, updated),
  };
}

test("prefers exact URLs, then the largest/newest valid icon for the origin", async (t) => {
  const f = await fixture(t);
  f.map("https://example.com/account", 1);
  f.map("https://example.com/other", 2);
  f.map("https://unrelated.example/", 3);
  f.bitmap(1, png(1), 16, 300);
  f.bitmap(2, png(2), 32, 100);
  f.bitmap(2, png(3), 32, 13429853725564777);
  f.bitmap(3, png(4), 64);
  f.database.close();
  const before = await readFile(f.path);
  const index = await loadFaviconIndex(f.path, ["https://example.com/account", "https://example.com/missing"]);
  assert.equal(faviconForUrl(index, "https://example.com/account"), dataUri(png(1)));
  assert.equal(faviconForUrl(index, "https://example.com/missing"), dataUri(png(3)));
  assert.equal(faviconForUrl(index, "https://unrelated.example/"), undefined);
  assert.equal(index.byUrl.size, 1);
  assert.equal(index.byOrigin.size, 1);
  assert.deepEqual(await readFile(f.path), before, "browser database must remain unchanged");
});

test("keeps schemes and ports isolated and normalizes requested URLs", async (t) => {
  const f = await fixture(t);
  const urls = ["https://example.com/", "http://example.com/", "https://example.com:8443/"];
  urls.forEach((url, i) => {
    f.map(url, i);
    f.bitmap(i, png(i));
  });
  f.database.close();
  const index = await loadFaviconIndex(f.path, [...urls, "not a URL", "file:///tmp/test"]);
  urls.forEach((url, i) => assert.equal(faviconForUrl(index, url + "new"), dataUri(png(i))));
  assert.equal(faviconForUrl(index, "HTTPS://EXAMPLE.COM:443/new"), dataUri(png(0)));
  assert.equal(faviconForUrl(index, "not a URL"), undefined);
  assert.equal(index.byOrigin.size, 3);
});

test("invalid and oversized preferred images allow smaller valid fallbacks", async (t) => {
  const f = await fixture(t);
  f.map("https://example.com/", 1);
  f.bitmap(1, png(1, MAX_FAVICON_BYTES + 1), 256);
  f.bitmap(1, Buffer.from("not a PNG"), 128);
  f.bitmap(1, Buffer.from("89504e470d0a1a0a0000", "hex"), 64);
  f.bitmap(1, png(2), 32);
  f.database.close();
  const index = await loadFaviconIndex(f.path, ["https://example.com/"]);
  assert.equal(faviconForUrl(index, "https://example.com/"), dataUri(png(2)));
});

test("missing, corrupt and incompatible databases and empty requests degrade to empty indexes", async (t) => {
  const f = await fixture(t);
  f.database.close();
  const corrupt = join(f.directory, "corrupt");
  await writeFile(corrupt, "not sqlite");
  for (const path of [join(f.directory, "missing"), corrupt]) {
    const index = await loadFaviconIndex(path, ["https://example.com/"]);
    assert.equal(index.byUrl.size + index.byOrigin.size, 0);
  }
  const database = new DatabaseSync(f.path);
  database.exec("DROP TABLE favicon_bitmaps");
  database.close();
  assert.equal((await loadFaviconIndex(f.path, ["https://example.com/"])).byUrl.size, 0);
  assert.equal((await loadFaviconIndex(f.path, [])).byOrigin.size, 0);
});

test("loads a shared bitmap once and keeps requested URLs beyond the first 512", async (t) => {
  const f = await fixture(t);
  const urls = Array.from({ length: 600 }, (_, i) => `https://example.com/page-${i}`);
  urls.forEach((url) => f.map(url, 1));
  f.bitmap(1, png(1));
  f.database.close();
  const originalGet = StatementSync.prototype.get;
  let imageReads = 0;
  t.mock.method(
    StatementSync.prototype,
    "get",
    function (this: StatementSync, ...args: Parameters<StatementSync["get"]>) {
      imageReads += 1;
      return originalGet.apply(this, args);
    },
  );
  const index = await loadFaviconIndex(f.path, urls);
  assert.equal(imageReads, 1);
  assert.equal(index.byUrl.size, 600);
  assert.equal(faviconForUrl(index, urls[599]), dataUri(png(1)));
});

test("caps retained encoded images while allowing smaller images after an oversized budget candidate", async (t) => {
  const f = await fixture(t);
  const urls = Array.from({ length: 70 }, (_, i) => `https://site-${i}.example/`);
  urls.forEach((url, i) => {
    f.map(url, i);
    f.bitmap(i, png(i, MAX_FAVICON_BYTES), 64, 1000 - i);
  });
  f.map("https://small.example/", 100);
  f.bitmap(100, png(1), 16);
  f.database.close();
  const index = await loadFaviconIndex(f.path, [...urls, "https://small.example/"]);
  const sources = new Set([...index.byUrl.values(), ...index.byOrigin.values()]);
  const retainedBytes = [...sources].reduce((total, source) => total + source.length, 0);
  assert.ok(retainedBytes <= MAX_FAVICON_SOURCE_BYTES);
  assert.ok(retainedBytes > MAX_FAVICON_SOURCE_BYTES - 100_000);
  assert.ok(index.byUrl.size < urls.length);
  assert.equal(faviconForUrl(index, "https://small.example/"), dataUri(png(1)));
});

test("large mapping fanout completes in a worker with Raycast's 100 MB heap limit", async (t) => {
  const f = await fixture(t);
  f.bitmap(1, png(1, 16 * 1024));
  f.database.exec("BEGIN");
  const insert = f.database.prepare("INSERT INTO icon_mapping(page_url, icon_id) VALUES (?, 1)");
  for (let i = 0; i < 30_000; i++) insert.run(`https://example.com/page-${i}`);
  f.database.exec("COMMIT");
  f.database.close();
  const worker = new Worker(
    `
    require("tsx/cjs");
    const { parentPort, workerData } = require("node:worker_threads");
    const { loadFaviconIndex } = require(workerData.modulePath);
    loadFaviconIndex(workerData.databasePath, ["https://example.com/page-29999"]).then(index => {
      parentPort.postMessage({ exact: index.byUrl.size, origins: index.byOrigin.size, heap: process.memoryUsage().heapUsed });
    }).catch(error => { throw error; });
  `,
    {
      eval: true,
      workerData: { modulePath: resolve("src/lib/favicons.ts"), databasePath: f.path },
      resourceLimits: { maxOldGenerationSizeMb: 100 },
    },
  );
  t.after(() => worker.terminate());
  const result = await new Promise<{ exact: number; origins: number; heap: number }>((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with ${code}`));
    });
  });
  assert.equal(result.exact, 1);
  assert.equal(result.origins, 1);
  assert.ok(result.heap < 60 * 1024 * 1024, `worker heap was ${result.heap} bytes`);
});
