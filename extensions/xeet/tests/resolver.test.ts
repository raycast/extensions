import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { loadEngine } from "../src/lib/engine";
import { clearResolutionCache, resolveInput } from "../src/lib/resolver";

test("caches only successful posts, expires media, clears entries, and never fabricates missing content", async () => {
  const dir = await mkdtemp(join(tmpdir(), "xeet-cache-"));
  let calls = 0;
  let available = true;
  const real = loadEngine(resolve("assets"));
  const engine = {
    ...real,
    resolve: async (url: string) => {
      calls++;
      return {
        post: { text: available ? "Public post" : "" },
        links: {},
        media: {},
        warnings: ["Test warning"],
        source: { id: url.split("/").pop()!, url, appVersion: null, pinned: false },
      };
    },
  };
  const options = { width: 390, dpr: 2, surface: "web-timeline" as const };
  const signal = new AbortController().signal;
  try {
    await resolveInput(engine, "https://x.com/jack/status/20", options, dir, signal);
    const cache = await resolveInput(engine, "https://twitter.com/jack/status/20", options, dir, signal);
    assert.equal(calls, 1);
    assert.ok(cache.warnings.some((warning) => warning.includes("cache")));
    const unrelated = createHash("sha256").update("expired").digest("hex") + ".json";
    await writeFile(join(dir, unrelated), JSON.stringify({ storedAt: 0, result: cache }));
    await resolveInput(engine, "https://x.com/jack/status/20", options, dir, signal);
    assert.equal((await readdir(dir)).length, 1, "cache hits still prune unrelated expired entries");
    const file = (await readdir(dir))[0];
    const stored = JSON.parse(await readFile(join(dir, file), "utf8"));
    await writeFile(join(dir, file), JSON.stringify({ ...stored, storedAt: 0 }));
    await resolveInput(engine, "https://x.com/jack/status/20", options, dir, signal);
    assert.equal(calls, 2);
    for (let id = 21; id < 35; id++) await resolveInput(engine, `https://x.com/i/status/${id}`, options, dir, signal);
    assert.equal((await readdir(dir)).length, 10);
    await clearResolutionCache(dir);
    assert.deepEqual(await readdir(dir), []);
    available = false;
    await assert.rejects(
      resolveInput(engine, "https://x.com/jack/status/20", options, dir, signal),
      /Retry, or paste its text/,
    );
    assert.deepEqual(await readdir(dir), []);
    const aborted = new AbortController();
    aborted.abort();
    await assert.rejects(resolveInput(engine, "https://x.com/jack/status/20", options, dir, aborted.signal), /abort/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
