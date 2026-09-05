import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Cache: class {
    get = vi.fn();
    set = vi.fn();
  },
}));

import { CardCacheRepository, type CardCacheStorage, upsertCreatedCardBestEffort } from "./card-cache-repository";

class MemoryStorage implements CardCacheStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | undefined {
    return this.values.get(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("CardCacheRepository", () => {
  let storage: MemoryStorage;
  let repository: CardCacheRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new CardCacheRepository(storage);
  });

  it("stores card names separately for each deck", () => {
    repository.replace("deck-1", [
      { id: "card-1", name: "Alpha" },
      { id: "card-2", name: null },
    ]);
    repository.replace("deck-2", [{ id: "card-3", name: "Beta" }]);

    expect(repository.get("deck-1")).toEqual([
      { id: "card-1", name: "Alpha" },
      { id: "card-2", name: null },
    ]);
    expect(repository.get("deck-2")).toEqual([{ id: "card-3", name: "Beta" }]);
  });

  it("returns an empty list when the deck was not cached", () => {
    expect(repository.get("deck-1")).toEqual([]);
  });

  it("adds a newly created card to the cached deck", () => {
    repository.replace("deck-1", [{ id: "card-1", name: "Alpha" }]);

    repository.upsert("deck-1", { id: "card-2", name: "Beta" });

    expect(repository.get("deck-1")).toEqual([
      { id: "card-1", name: "Alpha" },
      { id: "card-2", name: "Beta" },
    ]);
  });

  it("adds the authoritative name from a create response", () => {
    upsertCreatedCardBestEffort(repository, "deck-1", { id: "card-1", name: "Created card" });

    expect(repository.get("deck-1")).toEqual([{ id: "card-1", name: "Created card" }]);
  });

  it("skips incomplete create responses", () => {
    upsertCreatedCardBestEffort(repository, "deck-1", { id: "card-1" });
    upsertCreatedCardBestEffort(repository, "deck-1", { name: "Created card" });

    expect(repository.get("deck-1")).toEqual([]);
  });

  it("does not turn a cache failure into a failed create", () => {
    const brokenCache = {
      upsert: vi.fn(() => {
        throw new Error("Cache unavailable");
      }),
    };

    expect(() =>
      upsertCreatedCardBestEffort(brokenCache, "deck-1", { id: "card-1", name: "Created card" })
    ).not.toThrow();
  });

  it("ignores corrupted cache data", () => {
    storage.values.set("card-names:deck-1", "invalid json");

    expect(repository.get("deck-1")).toEqual([]);
  });

  it("ignores cached data with an unsupported shape", () => {
    storage.values.set("card-names:deck-1", JSON.stringify({ version: 1, cards: [{ id: 42, name: "Alpha" }] }));

    expect(repository.get("deck-1")).toEqual([]);
  });
});
