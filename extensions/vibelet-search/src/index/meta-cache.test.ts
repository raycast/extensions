import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createMetaCache, scanWithCache, type ScanCandidate } from "./meta-cache";
import type { SessionMeta } from "../types";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vibelet-meta-cache-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function meta(id: string, filePath: string, title: string): SessionMeta {
  return { id, title, source: "claude-cli", projectPath: "/p", timestamp: 0, filePath };
}

function candidate(id: string, filePath: string, mtime: number, size: number): ScanCandidate<undefined> {
  return {
    key: `claude:${id}`,
    filePath,
    fileMtime: mtime,
    fileSize: size,
    meta: meta(id, filePath, ""),
    ctx: undefined,
  };
}

describe("scanWithCache", () => {
  it("reuses cached metas when the fingerprint is unchanged (extract not called again)", async () => {
    const cache = createMetaCache(tmpDir, "test");
    const extract = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, "fresh"));
    const candidates = [candidate("abc", "/x/abc.jsonl", 100, 10)];

    const first = await scanWithCache(cache, candidates, extract);
    expect(first.metas[0].title).toBe("fresh");
    expect(first.changedKeys).toEqual(["claude:abc"]);
    expect(extract).toHaveBeenCalledTimes(1);

    // Second pass over identical fingerprints: everything served from cache, zero extraction.
    const second = await scanWithCache(cache, candidates, extract);
    expect(second.metas[0].title).toBe("fresh");
    expect(second.changedKeys).toEqual([]);
    expect(second.removedKeys).toEqual([]);
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it("re-extracts when mtime changes", async () => {
    const cache = createMetaCache(tmpDir, "test");
    const extract = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, `title-${c.fileMtime}`));
    const candidates = [candidate("abc", "/x/abc.jsonl", 100, 10)];

    await scanWithCache(cache, candidates, extract);
    const second = await scanWithCache(cache, [candidate("abc", "/x/abc.jsonl", 200, 10)], extract);
    expect(second.metas[0].title).toBe("title-200");
    expect(second.changedKeys).toEqual(["claude:abc"]);
    expect(extract).toHaveBeenCalledTimes(2);
  });

  it("re-extracts when size changes even if mtime is unchanged", async () => {
    const cache = createMetaCache(tmpDir, "test");
    const extract = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, `title-${c.fileSize}`));
    const candidates = [candidate("abc", "/x/abc.jsonl", 100, 10)];

    await scanWithCache(cache, candidates, extract);
    const second = await scanWithCache(cache, [candidate("abc", "/x/abc.jsonl", 100, 99)], extract);
    expect(second.metas[0].title).toBe("title-99");
    expect(second.changedKeys).toEqual(["claude:abc"]);
  });

  it("reports removed keys for entries that disappeared from disk", async () => {
    const cache = createMetaCache(tmpDir, "test");
    const extract = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, "title"));
    const candidates = [candidate("abc", "/x/abc.jsonl", 100, 10)];

    await scanWithCache(cache, candidates, extract);
    const second = await scanWithCache(cache, [], extract);
    expect(second.metas).toEqual([]);
    expect(second.removedKeys).toEqual(["claude:abc"]);
  });

  it("recovers from a corrupt cache file by rescaming", async () => {
    const cache = createMetaCache(tmpDir, "test");
    const extract = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, "title"));
    const candidates = [candidate("abc", "/x/abc.jsonl", 100, 10)];

    await scanWithCache(cache, candidates, extract);
    fs.writeFileSync(path.join(tmpDir, "meta-test.json"), "{ not valid json");

    const extract2 = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, "rebuilt"));
    const result = await scanWithCache(createMetaCache(tmpDir, "test"), candidates, extract2);
    expect(result.metas[0].title).toBe("rebuilt");
    expect(extract2).toHaveBeenCalledTimes(1);
  });

  it("persists the cache to disk across scanWithCache calls", async () => {
    const extract = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, "title"));
    const candidates = [candidate("abc", "/x/abc.jsonl", 100, 10)];

    await scanWithCache(createMetaCache(tmpDir, "persist"), candidates, extract);
    const cacheFile = path.join(tmpDir, "meta-persist.json");
    expect(fs.existsSync(cacheFile)).toBe(true);

    const extract2 = vi.fn(async (c: ScanCandidate<undefined>) => meta(c.key, c.filePath, "should-not-run"));
    const result = await scanWithCache(createMetaCache(tmpDir, "persist"), candidates, extract2);
    expect(result.metas[0].title).toBe("title");
    expect(extract2).not.toHaveBeenCalled();
  });
});
