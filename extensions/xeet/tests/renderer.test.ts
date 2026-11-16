import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
