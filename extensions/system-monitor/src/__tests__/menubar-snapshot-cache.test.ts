import { describe, expect, it } from "vitest";

import {
  MAX_MENU_BAR_SNAPSHOT_BYTES,
  LEGACY_MENU_BAR_CACHE_KEY,
  MENU_BAR_SNAPSHOT_CACHE_KEY,
  PREVIOUS_MENU_BAR_SNAPSHOT_CACHE_KEY,
  parseMenuBarSnapshot,
  readMenuBarSnapshot,
  removeLegacyMenuBarCache,
  SnapshotCache,
  writeMenuBarSnapshot,
} from "../menubar/snapshot-cache";
import { fixtureSnapshot } from "./menubar-fixtures";

class MemoryCache implements SnapshotCache {
  readonly store = new Map<string, string>();
  writes = 0;

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: string) {
    this.writes += 1;
    this.store.set(key, value);
  }

  remove(key: string) {
    return this.store.delete(key);
  }
}

describe("menu-bar snapshot cache", () => {
  it("ignores malformed and incompatible entries", () => {
    expect(parseMenuBarSnapshot("not json")).toBeUndefined();
    expect(parseMenuBarSnapshot(JSON.stringify({ ...fixtureSnapshot(), schemaVersion: 1 }))).toBeUndefined();
    expect(parseMenuBarSnapshot("x".repeat(MAX_MENU_BAR_SNAPSHOT_BYTES + 1))).toBeUndefined();
  });

  it("does not replace a valid cache entry with an empty failed collection", () => {
    const cache = new MemoryCache();
    const valid = fixtureSnapshot();
    expect(writeMenuBarSnapshot(valid, cache)).toBe(true);
    const original = cache.get(MENU_BAR_SNAPSHOT_CACHE_KEY);

    const failed = fixtureSnapshot(2_000);
    for (const key of Object.keys(failed.values) as (keyof typeof failed.values)[]) {
      failed.values[key] = { status: "failed", error: `${key} failed` } as never;
    }

    expect(writeMenuBarSnapshot(failed, cache)).toBe(false);
    expect(cache.get(MENU_BAR_SNAPSHOT_CACHE_KEY)).toBe(original);
    expect(readMenuBarSnapshot(cache)).toEqual(valid);
  });

  it("persists fresh fields without destroying a cached value from a partial failure", () => {
    const cache = new MemoryCache();
    const partial = fixtureSnapshot(2_000);
    partial.values.cpuUsage = {
      status: "failed",
      value: "42",
      collectedAt: 1_000,
      error: "cpu sample failed",
    };

    expect(writeMenuBarSnapshot(partial, cache)).toBe(true);
    expect(readMenuBarSnapshot(cache)?.values.cpuUsage).toEqual(partial.values.cpuUsage);
  });

  it("keeps one bounded cache entry across repeated writes", () => {
    const cache = new MemoryCache();

    for (let index = 0; index < 100; index += 1) {
      expect(writeMenuBarSnapshot(fixtureSnapshot(1_000 + index), cache)).toBe(true);
    }

    expect(cache.store.size).toBe(1);
    const serialized = cache.get(MENU_BAR_SNAPSHOT_CACHE_KEY);
    expect(Buffer.byteLength(serialized ?? "", "utf8")).toBeLessThanOrEqual(MAX_MENU_BAR_SNAPSHOT_BYTES);
  });

  it("removes legacy entries with incompatible memory accounting", () => {
    const cache = new MemoryCache();
    cache.set(LEGACY_MENU_BAR_CACHE_KEY, "legacy");
    cache.set(PREVIOUS_MENU_BAR_SNAPSHOT_CACHE_KEY, JSON.stringify(fixtureSnapshot()));

    removeLegacyMenuBarCache(cache);

    expect(cache.store.has(LEGACY_MENU_BAR_CACHE_KEY)).toBe(false);
    expect(cache.store.has(PREVIOUS_MENU_BAR_SNAPSHOT_CACHE_KEY)).toBe(false);
  });
});
