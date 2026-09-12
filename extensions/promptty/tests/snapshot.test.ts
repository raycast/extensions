import assert from "node:assert/strict";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { MINIMUM_PROMPTTY_VERSION, isPrompttyVersionSupported } from "../src/lib/compatibility.js";
import { SnapshotError } from "../src/lib/errors.js";
import {
  LAST_KNOWN_GOOD_CACHE_KEY,
  MAX_LAST_KNOWN_GOOD_BYTES,
  isSnapshotStale,
  loadSnapshotWithCache,
  parseSnapshotJSON,
  type StringCache,
} from "../src/lib/snapshot.js";

const validPrompt = {
  id: "2A1B0000-0000-4000-8000-000000000000",
  title: "Review this code",
  content: "Review the following code…",
  isFavorite: true,
  usageCount: 12,
  createdAt: "2026-05-01T08:30:00Z",
  updatedAt: "2026-07-20T16:45:00Z",
  lastUsedAt: "2026-07-25T10:10:00Z",
  category: {
    name: "Development",
    iconName: "hammer",
    colorHex: "#007AFF",
  },
  tags: ["Swift", "Review"],
};

function validSnapshot(prompts: unknown[] = [validPrompt]) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-26T12:00:00Z",
    appVersion: MINIMUM_PROMPTTY_VERSION,
    prompts,
  };
}

test("parses schema v1 and ignores unknown additive fields", () => {
  const parsed = parseSnapshotJSON(
    JSON.stringify({
      ...validSnapshot(),
      futureEnvelopeField: true,
      prompts: [{ ...validPrompt, futurePromptField: "ignored" }],
    }),
  );

  assert.equal(parsed.snapshot.prompts.length, 1);
  assert.equal(parsed.snapshot.prompts[0]?.id, validPrompt.id);
  assert.equal("futurePromptField" in (parsed.snapshot.prompts[0] ?? {}), false);
});

test("rejects unsupported schema versions with an actionable kind", () => {
  assert.throws(
    () => parseSnapshotJSON(JSON.stringify({ ...validSnapshot(), schemaVersion: 2 })),
    (error: unknown) => error instanceof SnapshotError && error.kind === "incompatible" && error.schemaVersion === 2,
  );
});

test("requires Promptty 1.4.0 or later", () => {
  assert.equal(isPrompttyVersionSupported("1.3.0"), false);
  assert.equal(isPrompttyVersionSupported("1.3.1"), false);
  assert.equal(isPrompttyVersionSupported("1.3.9"), false);
  assert.equal(isPrompttyVersionSupported("1.4"), true);
  assert.equal(isPrompttyVersionSupported("1.4.0"), true);
  assert.equal(isPrompttyVersionSupported("1.4.1"), true);
  assert.equal(isPrompttyVersionSupported("2.0.0"), true);
  assert.equal(isPrompttyVersionSupported("unknown"), false);

  assert.throws(
    () => parseSnapshotJSON(JSON.stringify({ ...validSnapshot(), appVersion: "1.3.1" })),
    (error: unknown) =>
      error instanceof SnapshotError && error.kind === "unsupportedPrompttyVersion" && error.appVersion === "1.3.1",
  );
});

test("requires UTC ISO 8601 dates", () => {
  assert.throws(
    () => parseSnapshotJSON(JSON.stringify({ ...validSnapshot(), generatedAt: "2026-07-26" })),
    (error: unknown) => error instanceof SnapshotError && error.kind === "malformed",
  );
  const parsed = parseSnapshotJSON(
    JSON.stringify(validSnapshot([{ ...validPrompt, updatedAt: "2026-07-20T18:45:00+02:00" }])),
  );
  assert.equal(parsed.snapshot.prompts.length, 0);
  assert.equal(parsed.skippedRecordCount, 1);
});

test("skips invalid records while preserving valid records", () => {
  const parsed = parseSnapshotJSON(
    JSON.stringify(
      validSnapshot([
        validPrompt,
        { ...validPrompt, id: "not-a-uuid", title: "Invalid" },
        { ...validPrompt, updatedAt: "not-a-date" },
      ]),
    ),
  );

  assert.equal(parsed.snapshot.prompts.length, 1);
  assert.equal(parsed.skippedRecordCount, 2);
});

test("accepts absent or null optional metadata and defaults tags and usage count", () => {
  const parsed = parseSnapshotJSON(
    JSON.stringify(
      validSnapshot([
        {
          id: validPrompt.id,
          title: "Minimal",
          content: "Body",
          isFavorite: false,
          category: null,
          lastUsedAt: null,
          tags: null,
        },
      ]),
    ),
  );

  assert.deepEqual(parsed.snapshot.prompts[0]?.tags, []);
  assert.equal(parsed.snapshot.prompts[0]?.usageCount, 0);
  assert.equal(parsed.snapshot.prompts[0]?.category, undefined);
});

test("retains last-known-good cache after a malformed file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "promptty-raycast-"));
  const snapshotPath = join(directory, "prompts-v1.json");
  const cache = new MemoryCache();

  await writeFile(snapshotPath, JSON.stringify(validSnapshot()), "utf8");
  const loaded = await loadSnapshotWithCache(snapshotPath, cache);
  assert.equal(loaded.source, "file");
  assert.ok(cache.get(LAST_KNOWN_GOOD_CACHE_KEY));

  await writeFile(snapshotPath, "{broken", "utf8");
  const fallback = await loadSnapshotWithCache(snapshotPath, cache);
  assert.equal(fallback.source, "cache");
  assert.equal(fallback.issue?.kind, "malformed");
  assert.equal(fallback.snapshot.prompts[0]?.content, validPrompt.content);
});

test("drops the last-known-good cache when a newer export exceeds the cache budget", async () => {
  const directory = await mkdtemp(join(tmpdir(), "promptty-raycast-"));
  const snapshotPath = join(directory, "prompts-v1.json");
  const cache = new MemoryCache();

  await writeFile(snapshotPath, JSON.stringify(validSnapshot()), "utf8");
  const loaded = await loadSnapshotWithCache(snapshotPath, cache);
  assert.equal(loaded.cacheUpdated, true);
  assert.ok(cache.get(LAST_KNOWN_GOOD_CACHE_KEY));

  const oversizedPrompt = { ...validPrompt, content: "x".repeat(MAX_LAST_KNOWN_GOOD_BYTES + 1) };
  await writeFile(snapshotPath, JSON.stringify(validSnapshot([oversizedPrompt])), "utf8");
  const oversized = await loadSnapshotWithCache(snapshotPath, cache);
  assert.equal(oversized.source, "file");
  assert.equal(oversized.cacheUpdated, false);
  assert.equal(cache.get(LAST_KNOWN_GOOD_CACHE_KEY), undefined);

  await writeFile(snapshotPath, "{broken", "utf8");
  await assert.rejects(
    () => loadSnapshotWithCache(snapshotPath, cache),
    (error: unknown) => error instanceof SnapshotError && error.kind === "malformed",
  );
});

test("keeps another source's cache when the selected export exceeds the cache budget", async () => {
  const directory = await mkdtemp(join(tmpdir(), "promptty-raycast-"));
  const cachedPath = join(directory, "cached-prompts-v1.json");
  const oversizedPath = join(directory, "oversized-prompts-v1.json");
  const cache = new MemoryCache();

  await writeFile(cachedPath, JSON.stringify(validSnapshot()), "utf8");
  await loadSnapshotWithCache(cachedPath, cache);
  const cached = cache.get(LAST_KNOWN_GOOD_CACHE_KEY);
  assert.ok(cached);

  const oversizedPrompt = { ...validPrompt, content: "x".repeat(MAX_LAST_KNOWN_GOOD_BYTES + 1) };
  await writeFile(oversizedPath, JSON.stringify(validSnapshot([oversizedPrompt])), "utf8");
  const oversized = await loadSnapshotWithCache(oversizedPath, cache);
  assert.equal(oversized.cacheUpdated, false);
  assert.equal(cache.get(LAST_KNOWN_GOOD_CACHE_KEY), cached);

  await unlink(cachedPath);
  const fallback = await loadSnapshotWithCache(cachedPath, cache);
  assert.equal(fallback.source, "cache");
  assert.equal(fallback.snapshot.prompts[0]?.content, validPrompt.content);
});

test("does not return or delete a cached snapshot from a different source path", async () => {
  const directory = await mkdtemp(join(tmpdir(), "promptty-raycast-"));
  const availablePath = join(directory, "available-prompts-v1.json");
  const unavailablePath = join(directory, "unavailable-prompts-v1.json");
  const cache = new MemoryCache();

  await writeFile(availablePath, JSON.stringify(validSnapshot()), "utf8");
  const loaded = await loadSnapshotWithCache(availablePath, cache);
  assert.equal(loaded.source, "file");
  const cached = cache.get(LAST_KNOWN_GOOD_CACHE_KEY);
  assert.ok(cached);

  await assert.rejects(
    () => loadSnapshotWithCache(unavailablePath, cache),
    (error: unknown) => error instanceof SnapshotError && error.kind === "missing",
  );
  assert.equal(cache.get(LAST_KNOWN_GOOD_CACHE_KEY), cached);

  await unlink(availablePath);
  const fallback = await loadSnapshotWithCache(availablePath, cache);
  assert.equal(fallback.source, "cache");
  assert.equal(fallback.issue?.kind, "missing");
  assert.equal(fallback.snapshot.prompts[0]?.content, validPrompt.content);
});

test("ignores legacy cache data that has no source identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "promptty-raycast-"));
  const unavailablePath = join(directory, "prompts-v1.json");
  const cache = new MemoryCache();

  cache.set(LAST_KNOWN_GOOD_CACHE_KEY, JSON.stringify(validSnapshot()));

  await assert.rejects(
    () => loadSnapshotWithCache(unavailablePath, cache),
    (error: unknown) => error instanceof SnapshotError && error.kind === "missing",
  );
  assert.equal(cache.get(LAST_KNOWN_GOOD_CACHE_KEY), undefined);
});

test("does not bypass the Promptty version gate with a cached snapshot", async () => {
  const directory = await mkdtemp(join(tmpdir(), "promptty-raycast-"));
  const snapshotPath = join(directory, "prompts-v1.json");
  const cache = new MemoryCache();

  cache.set(LAST_KNOWN_GOOD_CACHE_KEY, JSON.stringify(validSnapshot()));
  await writeFile(snapshotPath, JSON.stringify({ ...validSnapshot(), appVersion: "1.3.1" }), "utf8");

  await assert.rejects(
    () => loadSnapshotWithCache(snapshotPath, cache),
    (error: unknown) => error instanceof SnapshotError && error.kind === "unsupportedPrompttyVersion",
  );
});

test("does not expose prompt content in parser diagnostics", () => {
  const secret = "sensitive prompt content";
  let message = "";
  try {
    parseSnapshotJSON(`{"schemaVersion":1,"generatedAt":"bad","appVersion":"1","prompts":["${secret}"]}`);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert.equal(message.includes(secret), false);
});

test("detects stale snapshots without rejecting them", () => {
  assert.equal(isSnapshotStale("2026-07-01T00:00:00Z", Date.parse("2026-07-26T00:00:00Z")), true);
  assert.equal(isSnapshotStale("2026-07-25T00:00:00Z", Date.parse("2026-07-26T00:00:00Z")), false);
});

class MemoryCache implements StringCache {
  private readonly values = new Map<string, string>();

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}
