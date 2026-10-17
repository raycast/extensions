import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TTLCache } from "../ttl-cache";

describe("TTLCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a value", () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set("a", 42);
    expect(cache.get("a")).toBe(42);
  });

  it("returns undefined for missing key", () => {
    const cache = new TTLCache<string, number>(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("returns undefined after TTL expires", () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set("a", 42);
    vi.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();
  });

  it("still returns value before TTL expires", () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set("a", 42);
    vi.advanceTimersByTime(999);
    expect(cache.get("a")).toBe(42);
  });

  it("has() returns false for expired entry", () => {
    const cache = new TTLCache<string, number>(500);
    cache.set("a", 1);
    vi.advanceTimersByTime(501);
    expect(cache.has("a")).toBe(false);
  });

  it("delete() removes an entry", () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set("a", 1);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });

  it("clear() removes all entries", () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });
});
