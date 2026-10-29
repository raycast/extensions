import { beforeEach, describe, expect, it, vi } from "vitest";
import { addRecent, getRecents } from "./recents";
import type { TokenResult } from "./types";

const state = vi.hoisted(() => ({ store: new Map<string, string>(), failReads: false }));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => {
      if (state.failReads) throw new Error("storage unavailable");
      return state.store.get(key);
    },
    setItem: async (key: string, value: string) => void state.store.set(key, value),
    removeItem: async (key: string) => void state.store.delete(key),
  },
}));

const token: TokenResult = {
  id: "0xabc:1",
  address: "0xabc",
  networkId: 1,
  networkName: "Ethereum",
  networkSlug: "eth",
  name: "Test",
  symbol: "TEST",
  priceUsd: 1.23,
  change24: 0.05,
  liquidityUsd: 1000,
  volume24Usd: 500,
  marketCapUsd: 9000,
  definedUrl: "https://www.defined.fi/token/eth/0xabc",
};

describe("recents", () => {
  beforeEach(() => {
    state.store.clear();
    state.failReads = false;
  });

  it("stores identity fields only, so no stale prices are shown later", async () => {
    await addRecent(token);
    const [saved] = await getRecents();
    expect(saved.symbol).toBe("TEST");
    expect(saved.priceUsd).toBeUndefined();
    expect(saved.change24).toBeUndefined();
    expect(saved.liquidityUsd).toBeUndefined();
    expect(saved.volume24Usd).toBeUndefined();
    expect(saved.marketCapUsd).toBeUndefined();
  });

  it("does not overwrite stored recents when the read fails", async () => {
    await addRecent({ ...token, id: "0xold:1", address: "0xold" });
    state.failReads = true;
    await expect(addRecent(token)).rejects.toThrow();
    state.failReads = false;
    expect((await getRecents()).map((t) => t.id)).toEqual(["0xold:1"]);
  });

  it("treats a failed storage read as an empty list", async () => {
    state.failReads = true;
    await expect(getRecents()).resolves.toEqual([]);
  });
});
