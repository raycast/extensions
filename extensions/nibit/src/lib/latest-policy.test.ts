import { describe, expect, it } from "vitest";
import { resolveLatestPushSelection } from "./latest-policy";
import type { PushItem } from "./secure";

function makeItem(id: string, createdAt: string): PushItem {
  return {
    id,
    channel: "push",
    content: `item-${id}`,
    content_type: "text/plain",
    title: null,
    source_device: "Test Device",
    target_device_id: null,
    is_read: false,
    expires_at: null,
    created_at: createdAt,
    metadata: null,
  };
}

const resolvedSync = Promise.resolve();

describe("resolveLatestPushSelection", () => {
  const cached = makeItem("cached", "2026-04-21T10:00:00.000Z");
  const newer = makeItem("newer", "2026-04-21T10:01:00.000Z");

  it("prefers a newer network item when available", () => {
    const resolution = resolveLatestPushSelection({
      cachedItem: cached,
      cacheAgeMs: 5_000,
      network: { status: "completed", item: newer },
      backgroundSync: resolvedSync,
    });

    expect(resolution.item).toBe(newer);
    expect(resolution.stale).toBe(false);
    expect(resolution.source).toBe("network");
  });

  it("uses the cached item without stale warning when refresh times out but cache is still recent", () => {
    const resolution = resolveLatestPushSelection({
      cachedItem: cached,
      cacheAgeMs: 10_000,
      network: { status: "timeout" },
      backgroundSync: resolvedSync,
    });

    expect(resolution.item).toBe(cached);
    expect(resolution.stale).toBe(false);
    expect(resolution.source).toBe("cache");
  });

  it("uses the cached item with stale warning when refresh fails and cache is old", () => {
    const resolution = resolveLatestPushSelection({
      cachedItem: cached,
      cacheAgeMs: 120_000,
      network: { status: "error", message: "network down" },
      backgroundSync: resolvedSync,
    });

    expect(resolution.item).toBe(cached);
    expect(resolution.stale).toBe(true);
    expect(resolution.staleReason).toBe("error");
    expect(resolution.source).toBe("cache");
  });

  it("returns null when sync completes with empty inbox despite having a cached item", () => {
    const resolution = resolveLatestPushSelection({
      cachedItem: cached,
      cacheAgeMs: 5_000,
      network: { status: "completed", item: null },
      backgroundSync: resolvedSync,
    });

    expect(resolution.item).toBeNull();
    expect(resolution.stale).toBe(false);
    expect(resolution.source).toBe("none");
  });

  it("returns no item when there is no cache and the network times out", () => {
    const resolution = resolveLatestPushSelection({
      cachedItem: null,
      cacheAgeMs: Number.POSITIVE_INFINITY,
      network: { status: "timeout" },
      backgroundSync: resolvedSync,
    });

    expect(resolution.item).toBeNull();
    expect(resolution.stale).toBe(false);
    expect(resolution.source).toBe("none");
  });
});
