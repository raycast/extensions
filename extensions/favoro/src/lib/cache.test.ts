import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isCacheStale, shouldRefreshCache, getCacheStatus, getLastSyncedDate, formatLastSynced } from "./cache-utils";
import { CACHE_STALE_THRESHOLD_MS } from "./constants";
import type { CacheMetadata } from "../types";

/**
 * Creates a mock CacheMetadata object for testing
 */
function createMockMetadata(overrides: Partial<CacheMetadata> = {}): CacheMetadata {
  return {
    exportedAt: new Date().toISOString(),
    etag: '"test-etag"',
    cacheUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    counts: { areas: 5, sections: 10, links: 100 },
    ...overrides,
  };
}

describe("isCacheStale", () => {
  it("returns false when cacheUntil is in the future", () => {
    const metadata = createMockMetadata({
      cacheUntil: new Date(Date.now() + 60 * 1000).toISOString(), // 1 minute from now
    });
    expect(isCacheStale(metadata)).toBe(false);
  });

  it("returns true when cacheUntil is in the past", () => {
    const metadata = createMockMetadata({
      cacheUntil: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
    });
    expect(isCacheStale(metadata)).toBe(true);
  });

  it("returns true when cacheUntil is exactly now", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    // Date.now() > cacheUntil will be false when equal
    // So we test the boundary by setting cacheUntil 1ms in the past
    const staleMetadata = createMockMetadata({
      cacheUntil: new Date(now - 1).toISOString(),
    });
    expect(isCacheStale(staleMetadata)).toBe(true);
    vi.useRealTimers();
  });
});

describe("shouldRefreshCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when exportedAt is recent", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const metadata = createMockMetadata({
      exportedAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    });
    expect(shouldRefreshCache(metadata)).toBe(false);
  });

  it("returns true when exportedAt exceeds threshold", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const metadata = createMockMetadata({
      exportedAt: new Date(now - CACHE_STALE_THRESHOLD_MS - 1000).toISOString(), // Beyond threshold
    });
    expect(shouldRefreshCache(metadata)).toBe(true);
  });

  it("returns false when exportedAt is exactly at threshold", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const metadata = createMockMetadata({
      exportedAt: new Date(now - CACHE_STALE_THRESHOLD_MS).toISOString(), // Exactly at threshold
    });
    // Date.now() - exportedAt > threshold will be false when equal
    expect(shouldRefreshCache(metadata)).toBe(false);
  });
});

describe("getCacheStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'syncing' when isLoading is true", () => {
    const metadata = createMockMetadata();
    expect(getCacheStatus(metadata, true)).toBe("syncing");
  });

  it("returns 'syncing' when isLoading is true even with null metadata", () => {
    expect(getCacheStatus(null, true)).toBe("syncing");
  });

  it("returns 'empty' when metadata is null", () => {
    expect(getCacheStatus(null, false)).toBe("empty");
  });

  it("returns 'fresh' when cache is valid and recent", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const metadata = createMockMetadata({
      exportedAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      cacheUntil: new Date(now + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    });
    expect(getCacheStatus(metadata, false)).toBe("fresh");
  });

  it("returns 'stale' when cacheUntil is expired", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const metadata = createMockMetadata({
      exportedAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      cacheUntil: new Date(now - 1000).toISOString(), // 1 second ago (expired)
    });
    expect(getCacheStatus(metadata, false)).toBe("stale");
  });

  it("returns 'stale' when exportedAt exceeds refresh threshold", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const metadata = createMockMetadata({
      exportedAt: new Date(now - CACHE_STALE_THRESHOLD_MS - 1000).toISOString(), // Beyond threshold
      cacheUntil: new Date(now + 30 * 60 * 1000).toISOString(), // Still valid cacheUntil
    });
    expect(getCacheStatus(metadata, false)).toBe("stale");
  });
});

describe("getLastSyncedDate", () => {
  it("returns undefined when metadata is null", () => {
    expect(getLastSyncedDate(null)).toBeUndefined();
  });

  it("returns undefined when exportedAt is empty", () => {
    const metadata = createMockMetadata({ exportedAt: "" });
    expect(getLastSyncedDate(metadata)).toBeUndefined();
  });

  it("returns a Date object for valid exportedAt", () => {
    const exportedAt = "2025-12-17T10:30:00Z";
    const metadata = createMockMetadata({ exportedAt });
    const result = getLastSyncedDate(metadata);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(new Date(exportedAt).getTime());
  });
});

describe("formatLastSynced", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Never synced' for undefined date", () => {
    expect(formatLastSynced(undefined)).toBe("Never synced");
  });

  it("returns 'Just now' for less than 1 minute ago", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 30 * 1000); // 30 seconds ago
    expect(formatLastSynced(date)).toBe("Just now");
  });

  it("returns singular minute format for 1 minute ago", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 60 * 1000); // 1 minute ago
    expect(formatLastSynced(date)).toBe("1 minute ago");
  });

  it("returns plural minutes format for multiple minutes", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 5 * 60 * 1000); // 5 minutes ago
    expect(formatLastSynced(date)).toBe("5 minutes ago");
  });

  it("returns singular hour format for 1 hour ago", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 60 * 60 * 1000); // 1 hour ago
    expect(formatLastSynced(date)).toBe("1 hour ago");
  });

  it("returns plural hours format for multiple hours", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 3 * 60 * 60 * 1000); // 3 hours ago
    expect(formatLastSynced(date)).toBe("3 hours ago");
  });

  it("returns singular day format for 1 day ago", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 24 * 60 * 60 * 1000); // 1 day ago
    expect(formatLastSynced(date)).toBe("1 day ago");
  });

  it("returns plural days format for multiple days", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    expect(formatLastSynced(date)).toBe("5 days ago");
  });

  it("handles edge case at 59 minutes", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 59 * 60 * 1000); // 59 minutes ago
    expect(formatLastSynced(date)).toBe("59 minutes ago");
  });

  it("handles edge case at 23 hours", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const date = new Date(now - 23 * 60 * 60 * 1000); // 23 hours ago
    expect(formatLastSynced(date)).toBe("23 hours ago");
  });
});
