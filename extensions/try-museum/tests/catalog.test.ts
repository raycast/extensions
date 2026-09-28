import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogLoader } from "../src/lib/catalog-store";

const artwork = {
  id: "nga:1",
  title: "Artwork",
  artist: null,
  date: null,
  sourceUrl: "https://www.nga.gov/art",
  image: { key: "artworks/nga/work.webp", width: 10, height: 10 },
  palette: [{ hex: "#123456", share: 100 }],
};
const first = "batch-0000-aaaa.json";
const second = "batch-0000-bbbb.json";

function fixture() {
  const files = new Map<string, unknown>();
  const requests: string[] = [];
  let time = 100;
  let batch = first;
  let offline = false;
  let invalid = false;
  const load = createCatalogLoader({
    storage: {
      read: async (key) => files.get(key),
      write: async (key, value) => {
        files.set(key, value);
      },
    },
    now: () => time,
    fetchJson: async (url) => {
      requests.push(url.split("/").at(-1) ?? "");
      if (offline) throw new Error("offline");
      if (url.endsWith("manifest.json")) return { total: 1, batches: [{ file: batch, count: 1 }] };
      return invalid ? [{ ...artwork, palette: [] }] : [artwork];
    },
  });
  return {
    load,
    files,
    requests,
    advance: () => {
      time += 2000;
    },
    changeBatch: () => {
      batch = second;
    },
    goOffline: () => {
      offline = true;
    },
    corruptNetwork: () => {
      invalid = true;
    },
  };
}

test("fresh cache makes no network request, expired manifest reuses unchanged hashed batches", async () => {
  const f = fixture();
  const catalog = await f.load(1000);
  assert.equal(catalog.artworks.length, 1);
  assert.deepEqual(f.requests, ["manifest.json", first]);
  await f.load(1000);
  assert.equal(f.requests.length, 2);
  f.advance();
  await f.load(1000);
  assert.deepEqual(f.requests, ["manifest.json", first, "manifest.json"]);
});

test("changed batch is downloaded and manual refresh ignores the interval", async () => {
  const f = fixture();
  await f.load(1000);
  f.changeBatch();
  await f.load(1000, true);
  assert.deepEqual(f.requests, ["manifest.json", first, "manifest.json", second]);
});

test("failed refresh keeps the last complete snapshot and marks it stale", async () => {
  const f = fixture();
  await f.load(1000);
  const previousManifest = f.files.get("manifest.json");
  f.advance();
  f.changeBatch();
  f.corruptNetwork();
  const result = await f.load(1000);
  assert.equal(result.stale, true);
  assert.equal(result.checkedAt, 100);
  assert.equal(result.artworks[0].id, artwork.id);
  assert.deepEqual(f.files.get("manifest.json"), previousManifest);
  assert.equal(f.files.has(second), false);
});

test("first offline launch reports a useful error", async () => {
  const f = fixture();
  f.goOffline();
  await assert.rejects(f.load(1000), /Check your connection/);
});

test("damaged cached batch is repaired even before the refresh interval expires", async () => {
  const f = fixture();
  await f.load(1000);
  f.files.set(first, []);
  const result = await f.load(1000);
  assert.equal(result.artworks.length, 1);
  assert.equal(result.stale, false);
  assert.deepEqual(f.requests, ["manifest.json", first, "manifest.json", first]);
});

test("concurrent callers share a catalog request", async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.load(1000), f.load(1000)]);
  assert.equal(a, b);
  assert.deepEqual(f.requests, ["manifest.json", first]);
});

test("manifest traversal, duplicate IDs, and incorrect totals cannot replace the cache", async () => {
  for (const manifest of [
    { total: 1, batches: [{ file: "../bad.json", count: 1 }] },
    {
      total: 2,
      batches: [
        { file: first, count: 1 },
        { file: second, count: 1 },
      ],
    },
    { total: 10, batches: [{ file: first, count: 1 }] },
  ]) {
    const files = new Map<string, unknown>();
    const load = createCatalogLoader({
      storage: {
        read: async (key) => files.get(key),
        write: async (key, value) => {
          files.set(key, value);
        },
      },
      fetchJson: async (url) => (url.endsWith("manifest.json") ? manifest : [artwork]),
    });
    await assert.rejects(load(1000));
    assert.equal(files.has("manifest.json"), false);
  }
});
