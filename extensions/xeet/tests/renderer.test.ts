import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { test } from "node:test";
import { loadXeetSync } from "@xeet/core/node";
import { loadEngine } from "../src/lib/engine";
import { resolveInput } from "../src/lib/resolver";

const engine = loadEngine(resolve("assets"));
const post = {
  text: "Hello 👋 https://example.com\nこんにちは مرحبًا שלום",
  author: { name: "Xeet", handle: "xeet", verified: "blue" as const },
  createdAt: "2026-01-01T12:00:00Z",
  now: "2026-01-01T13:00:00Z",
};
const options = { width: 390, dpr: 2, theme: "dark" as const, surface: "web-timeline" as const };

test("staged renderer matches the installed npm renderer, including all font packs", () => {
  const upstream = loadXeetSync();
  assert.deepEqual(engine.loadedPacks(), upstream.fontPacks());
  assert.deepEqual(engine.render(post, options), upstream.render(post, options));
});

test("renders deterministically without network, with correct PNG dimensions and weighted counts", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Offline test forbids network");
  };
  try {
    const first = engine.render(post, options);
    const second = engine.render(post, options);
    assert.deepEqual(first.png, second.png);
    assert.deepEqual(first.report, engine.explain(post, options));
    const bytes = Buffer.from(first.png);
    assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), 780);
    assert.equal(bytes.readUInt32BE(20), first.report.size.height * 2);
    assert.equal(engine.explain({ text: "a 👋 https://example.com/long/path" }).length.weighted, 28);
    const golden = JSON.parse(await readFile(resolve("tests/golden.json"), "utf8"));
    assert.equal(createHash("sha256").update(first.png).digest("hex"), golden.multilingualDark);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("renders all surfaces, themes, badge types, batch variants, and sheets", () => {
  for (const surface of ["web-timeline", "web-detail", "ios-timeline", "ios-detail"] as const) {
    for (const theme of ["light", "dark"] as const) {
      for (const verified of ["none", "blue", "business", "government"] as const) {
        assert.ok(
          engine.render(
            { ...post, author: { ...post.author, verified, squareAvatar: true } },
            { ...options, surface, theme },
          ).png.length > 500,
        );
      }
    }
  }
  const variants = [options, { ...options, theme: "light" as const }];
  const batch = engine.renderMany(post, variants);
  assert.equal(batch.length, 2);
  batch.forEach((item, index) => assert.deepEqual(item.png, engine.render(post, variants[index]).png));
  assert.ok(engine.sheet({ post, widths: [320, 390, 600], themes: ["light", "dark"], dpr: 1 }).length > 500);
});

test("reflects Show more and expansion from Xeet reports", () => {
  const long = { text: "A long post with things to say. ".repeat(35) };
  const collapsed = engine.explain(long, options);
  const expanded = engine.explain(long, { ...options, expanded: true });
  assert.equal(collapsed.length.valid, false);
  assert.equal(collapsed.text.hasShowMore, engine.hasShowMore(long, options));
  assert.equal(collapsed.text.hasShowMore, true);
  assert.equal(expanded.text.hasShowMore, false);
  assert.ok(expanded.size.height > collapsed.size.height);
});

test("text and JSON resolution never hydrate links, and malformed schema fails", async () => {
  const dir = await mkdtemp(join(tmpdir(), "xeet-offline-"));
  try {
    const signal = new AbortController().signal;
    assert.equal(
      (await resolveInput(engine, "A link https://localhost/private", options, dir, signal)).post.text,
      "A link https://localhost/private",
    );
    assert.equal((await resolveInput(engine, JSON.stringify(post), options, dir, signal)).post.text, post.text);
    await assert.rejects(
      resolveInput(engine, '{"text":"hello","author":{"verified":"invalid"}}', options, dir, signal),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("resolves captured public-post payloads and rejects missing content", async () => {
  const payload = {
    __typename: "Tweet",
    rest_id: "20",
    details: { full_text: "A captured public post", created_at_ms: 1762785296789 },
    core: { user_results: { result: { core: { name: "Example", screen_name: "example" } } } },
    counts: { favorite_count: 12 },
  };
  const html = `<html><head><script>window.__INITIAL_STATE__ = ${JSON.stringify(JSON.stringify(payload))};</script></head><body><article></article></body></html>`;
  const host = {
    lookup: async () => ["1.1.1.1"],
    fetch: async ({ url }: { url: string }) => ({
      status: 200,
      headers: { "content-type": url.endsWith("robots.txt") ? "text/plain" : "text/html" },
      body: Buffer.from(url.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : html),
    }),
  };
  const resolved = await engine.resolve("https://x.com/i/status/20", { media: false, maxLinks: 0 }, host);
  assert.equal(resolved.post.text, "A captured public post");
  assert.equal(resolved.post.author?.handle, "example");
  assert.equal(resolved.post.counts?.likes, 12);
  assert.equal(resolved.source.id, "20");
  await assert.rejects(engine.resolve("https://x.com/i/status/21", { maxLinks: 0 }, host));
});
