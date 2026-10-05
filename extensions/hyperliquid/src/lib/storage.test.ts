import { describe, expect, it } from "vitest";

import {
  addOrUpdateWallet,
  normalizeWalletAddress,
  parseStoredFavorites,
  parseStoredWallets,
  removeWallet,
  serializeFavorites,
  serializeWallets,
  toggleFavoriteCoin,
  validateWalletAddress,
} from "./storage";
import type { Wallet } from "./types";

describe("storage helpers", () => {
  it("validates and normalizes Ethereum-style addresses", () => {
    expect(validateWalletAddress("0x000000000000000000000000000000000000dEaD")).toBe(true);
    expect(normalizeWalletAddress(" 0x000000000000000000000000000000000000dEaD ")).toBe(
      "0x000000000000000000000000000000000000dead",
    );
    expect(validateWalletAddress("0x123")).toBe(false);
    expect(validateWalletAddress("not-an-address")).toBe(false);
  });

  it("round-trips wallets and ignores malformed stored values", () => {
    const wallets: Wallet[] = [
      { id: "one", label: "Main", address: "0x0000000000000000000000000000000000000001" },
      { id: "two", label: "Vault", address: "0x0000000000000000000000000000000000000002" },
    ];

    expect(parseStoredWallets(serializeWallets(wallets))).toEqual(wallets);
    expect(parseStoredWallets("not json")).toEqual([]);
    expect(parseStoredWallets(JSON.stringify([{ label: "Missing address" }]))).toEqual([]);
  });

  it("adds, updates, and removes wallets without duplicating addresses", () => {
    const first = addOrUpdateWallet([], { label: "Main", address: "0x0000000000000000000000000000000000000001" });
    const updated = addOrUpdateWallet(first, {
      id: first[0].id,
      label: "Trading",
      address: "0x0000000000000000000000000000000000000001",
    });

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ label: "Trading", address: "0x0000000000000000000000000000000000000001" });
    expect(removeWallet(updated, updated[0].id)).toEqual([]);
  });

  it("round-trips sorted favorites", () => {
    expect(parseStoredFavorites(serializeFavorites(["ETH", "BTC", "ETH"]))).toEqual(["BTC", "ETH"]);
    expect(parseStoredFavorites("bad json")).toEqual([]);
  });

  it("toggles a favorite coin without duplicates", () => {
    expect(toggleFavoriteCoin(["BTC"], "eth")).toEqual(["BTC", "ETH"]);
    expect(toggleFavoriteCoin(["BTC", "ETH"], "ETH")).toEqual(["BTC"]);
  });
});
