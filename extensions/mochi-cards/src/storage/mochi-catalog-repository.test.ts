import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Cache: class {
    get = vi.fn();
    remove = vi.fn();
    set = vi.fn();
  },
}));

import {
  MochiCatalogRepository,
  MochiCatalogRepositoryError,
  type MochiCatalogStorage,
} from "./mochi-catalog-repository";

class MemoryStorage implements MochiCatalogStorage {
  value: string | undefined;

  getItem(): string | undefined {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }

  removeItem(): void {
    this.value = undefined;
  }
}

describe("MochiCatalogRepository", () => {
  let storage: MemoryStorage;
  let repository: MochiCatalogRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new MochiCatalogRepository(storage);
  });

  it("stores decks and templates", () => {
    repository.replace({
      decks: [{ id: "deck-1", name: "Words", parentId: "deck-parent" }],
      templates: [{ id: "template-1", name: "Vocabulary", fields: [] }],
      cardCounts: { "deck-1": 3 },
    });

    expect(repository.get()).toEqual({
      decks: [{ id: "deck-1", name: "Words", parentId: "deck-parent" }],
      templates: [{ id: "template-1", name: "Vocabulary", fields: [] }],
      cardCounts: { "deck-1": 3 },
    });
  });

  it("returns undefined when the catalog was not cached", () => {
    expect(repository.get()).toBeUndefined();
  });

  it("clears the cached catalog", () => {
    repository.replace({
      decks: [{ id: "deck-1", name: "Words", parentId: "deck-parent" }],
      templates: [],
      cardCounts: {},
    });

    repository.clear();

    expect(repository.get()).toBeUndefined();
  });

  it("keeps corrupted storage unchanged", () => {
    storage.value = JSON.stringify({ version: 5, decks: "invalid", templates: [], cardCounts: {} });
    const original = storage.value;

    expect(() => repository.get()).toThrow(MochiCatalogRepositoryError);
    expect(storage.value).toBe(original);
  });

  it("invalidates catalog versions without parent deck IDs", () => {
    storage.value = JSON.stringify({ version: 4, decks: [], templates: [], cardCounts: {} });

    expect(repository.get()).toBeUndefined();
  });

  it("invalidates unsupported catalog versions", () => {
    storage.value = JSON.stringify({ version: 2, decks: [], templates: [] });

    expect(repository.get()).toBeUndefined();
  });

  it("rejects invalid cached card counts", () => {
    storage.value = JSON.stringify({ version: 5, decks: [], templates: [], cardCounts: { "deck-1": -1 } });

    expect(() => repository.get()).toThrow(MochiCatalogRepositoryError);
  });
});
