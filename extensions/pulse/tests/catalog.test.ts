import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CATALOG_URL, CatalogStore, DAY_MS } from "../src/lib/catalog";

const catalog = (generatedAt: string, count: number) =>
  JSON.stringify({
    schema: 1,
    generatedAt,
    markets: ["us"],
    securities: Array.from({ length: count }, (_, i) => ({ m: "us", c: `T${i}`, n: { en: `T${i}` }, p: 0 })),
    crypto: [],
  });

function fakeFetch(responses: Response[]) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const next = responses.shift();
    if (!next) throw new Error("unexpected request");
    return next;
  }) as typeof fetch;
  return { fetcher, calls };
}

test("downloads once, then asks with the ETag at most daily", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-raycast-"));
  let now = 1_000_000;
  const { fetcher, calls } = fakeFetch([
    new Response(catalog("2026-11-02T00:00:00Z", 100), { headers: { etag: '"a"' } }),
    new Response(null, { status: 304 }),
  ]);
  const store = new CatalogStore(directory, fetcher, () => now);

  const empty = await store.loadCatalog();
  assert.equal(empty.value, null);
  assert.ok(store.isStale(empty));

  const first = await store.refreshCatalog(null);
  assert.equal(first.securities.length, 100);
  assert.equal(calls[0].url, CATALOG_URL);
  const stored = await store.loadCatalog();
  assert.equal(stored.value?.securities.length, 100);
  assert.ok(!store.isStale(stored));

  now += DAY_MS;
  assert.ok(store.isStale(await store.loadCatalog()));
  const same = await store.refreshCatalog(stored.value);
  assert.equal(same, stored.value);
  assert.equal(calls[1].headers["If-None-Match"], '"a"');
  assert.ok(!store.isStale(await store.loadCatalog()));
});

test("refuses a truncated or older file and keeps the copy in hand", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-raycast-"));
  const { fetcher } = fakeFetch([
    new Response(catalog("2026-11-02T00:00:00Z", 100), { headers: { etag: '"a"' } }),
    new Response(catalog("2026-11-03T00:00:00Z", 50), { headers: { etag: '"b"' } }),
    new Response(catalog("2026-11-01T00:00:00Z", 100), { headers: { etag: '"c"' } }),
    new Response("not json", { status: 200 }),
  ]);
  const store = new CatalogStore(directory, fetcher);
  const first = await store.refreshCatalog(null);
  await assert.rejects(store.refreshCatalog(first), /incomplete/);
  assert.equal(await store.refreshCatalog(first), first);
  await assert.rejects(store.refreshCatalog(first), /could not be read/);
  const onDisk = JSON.parse(await readFile(join(directory, "symbols-v1.json"), "utf8"));
  assert.equal(onDisk.generatedAt, "2026-11-02T00:00:00Z");
});

test("refuses an export whose entries are malformed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-raycast-"));
  const good = JSON.parse(catalog("2026-11-03T00:00:00Z", 100));
  const { fetcher } = fakeFetch([
    new Response(catalog("2026-11-02T00:00:00Z", 100), { headers: { etag: '"a"' } }),
    new Response(JSON.stringify({ ...good, securities: [...good.securities, null] })),
    new Response(JSON.stringify({ ...good, crypto: "BTC" })),
    new Response(JSON.stringify({ ...good, securities: [...good.securities, { m: "us", c: 7 }] })),
  ]);
  const store = new CatalogStore(directory, fetcher);
  const first = await store.refreshCatalog(null);
  for (let attempt = 0; attempt < 3; attempt += 1) await assert.rejects(store.refreshCatalog(first));
  const onDisk = JSON.parse(await readFile(join(directory, "symbols-v1.json"), "utf8"));
  assert.equal(onDisk.generatedAt, "2026-11-02T00:00:00Z");
});

test("keeps Binance's trading pairs as base and quote", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-raycast-"));
  const symbols = Array.from({ length: 150 }, (_, i) => ({
    symbol: `C${i}USDT`,
    baseAsset: `C${i}`,
    quoteAsset: "USDT",
  }));
  const { fetcher } = fakeFetch([new Response(JSON.stringify({ symbols }))]);
  const store = new CatalogStore(directory, fetcher);
  const pairs = await store.refreshPairs();
  assert.deepEqual(pairs[0], ["C0", "USDT"]);
  assert.equal((await store.loadPairs()).value?.length, 150);
});
