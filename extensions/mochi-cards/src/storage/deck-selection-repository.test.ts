import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import {
  DeckSelectionRepository,
  DeckSelectionRepositoryError,
  type DeckSelectionStorage,
} from "./deck-selection-repository";

class MemoryStorage implements DeckSelectionStorage {
  value: string | undefined;

  async getItem(): Promise<string | undefined> {
    return this.value;
  }

  async setItem(_key: string, value: string): Promise<void> {
    this.value = value;
  }
}

describe("DeckSelectionRepository", () => {
  let storage: MemoryStorage;
  let repository: DeckSelectionRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new DeckSelectionRepository(storage);
  });

  it("stores a normalized deck selection", async () => {
    await repository.replace([" deck-1 ", "deck-2", "deck-1", ""]);

    await expect(repository.list()).resolves.toEqual(["deck-1", "deck-2"]);
    expect(JSON.parse(storage.value ?? "")).toEqual({ version: 1, deckIds: ["deck-1", "deck-2"] });
  });

  it("returns an empty selection when nothing was saved", async () => {
    await expect(repository.list()).resolves.toEqual([]);
  });

  it("keeps corrupted storage unchanged", async () => {
    storage.value = "{broken";
    const original = storage.value;

    await expect(repository.list()).rejects.toBeInstanceOf(DeckSelectionRepositoryError);
    expect(storage.value).toBe(original);
  });
});
