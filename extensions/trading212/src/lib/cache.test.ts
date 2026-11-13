import { describe, expect, it } from "vitest";
import {
  apiKeyHash,
  historyCacheKey,
  portfolioSnapshotKey,
  readSnapshot,
  writeSnapshot,
  type SyncStore,
} from "./cache";

function memory(): SyncStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k), set: (k, v) => void data.set(k, v) };
}

describe("portfolio snapshot", () => {
  it("is keyed by environment and account", () => {
    expect(portfolioSnapshotKey("live", "abc123")).toBe("portfolio:live:abc123");
    expect(portfolioSnapshotKey("demo", "abc123")).not.toBe(portfolioSnapshotKey("live", "abc123"));
  });
  it("round-trips what one command saved so another can show it", () => {
    const store = memory();
    writeSnapshot(store, "k", { updatedAt: 5, value: [1, 2] });
    expect(readSnapshot<{ updatedAt: number; value: number[] }>(store, "k")).toEqual({ updatedAt: 5, value: [1, 2] });
  });
  it("returns undefined for a missing or corrupted entry", () => {
    const store = memory();
    expect(readSnapshot(store, "missing")).toBeUndefined();
    store.data.set("bad", "{not json");
    expect(readSnapshot(store, "bad")).toBeUndefined();
  });
});

describe("historyCacheKey", () => {
  it("scopes by environment and a short hash of the API key, never the key itself", () => {
    const k = historyCacheKey("live", "secret-api-key", "orders");
    expect(k).toMatch(/^history:live:[0-9a-f]{12}:orders$/);
    expect(k).not.toContain("secret-api-key");
    expect(historyCacheKey("live", "secret-api-key", "orders")).toBe(k);
    expect(historyCacheKey("live", "other-key", "orders")).not.toBe(k);
    expect(historyCacheKey("demo", "secret-api-key", "orders")).not.toBe(k);
  });
});
describe("apiKeyHash", () => {
  it("is a 12-hex prefix of the key's sha256, the same one history cache keys use", () => {
    const hash = apiKeyHash("secret-api-key");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    expect(hash).not.toContain("secret");
    expect(historyCacheKey("live", "secret-api-key", "orders")).toBe(`history:live:${hash}:orders`);
    expect(apiKeyHash("other-key")).not.toBe(hash);
  });
});
