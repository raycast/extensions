import { describe, expect, it, vi } from "vitest";
import { FavoritesStore, parseFavorites } from "../src/lib/favorites";
import { ALL_PROVIDERS, browseEntries, providers } from "../src/lib/filters";
import { rankModels } from "../src/lib/models";
import { model } from "./fixtures";

describe("favorites persistence", () => {
  it("saves stable IDs and restores them in a new command session", async () => {
    let saved: string | undefined;
    const storage = {
      read: async () => saved,
      write: async (value: string) => {
        saved = value;
      },
    };
    const first = new FavoritesStore(storage);
    await first.toggle("stable-id");
    const reopened = new FavoritesStore(storage);
    await reopened.load();
    expect([...reopened.getSnapshot()]).toEqual(["stable-id"]);
    await reopened.toggle("stable-id");
    expect(JSON.parse(saved!)).toEqual([]);
  });

  it("serializes rapid changes without losing an earlier favorite", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const store = new FavoritesStore({ read: async () => undefined, write });
    await Promise.all([store.toggle("one"), store.toggle("two"), store.toggle("one")]);
    expect([...store.getSnapshot()]).toEqual(["two"]);
    expect(write.mock.calls.at(-1)?.[0]).toBe('["two"]');
  });

  it("restores previous favorites when saving fails", async () => {
    const store = new FavoritesStore({
      read: async () => '["saved"]',
      write: async () => {
        throw new Error("Disk failure");
      },
    });
    await expect(store.toggle("new")).rejects.toThrow("Disk failure");
    expect([...store.getSnapshot()]).toEqual(["saved"]);
  });

  it("notifies other mounted views and unsubscribes cleanly", async () => {
    const store = new FavoritesStore({ read: async () => undefined, write: async () => {} });
    await store.load();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.toggle("one");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await store.toggle("two");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("recovers from corrupt storage and removes invalid or duplicate IDs", () => {
    expect([...parseFavorites("bad json")]).toEqual([]);
    expect([...parseFavorites('["one","one",null,42,""]')]).toEqual(["one"]);
  });
});

describe("provider and favorite filters", () => {
  const models = [
    model({ id: "one", creatorId: "a", creator: "Alpha", intelligence: 90 }),
    model({ id: "two", creatorId: "b", creator: "Beta", intelligence: 80 }),
    model({ id: "three", creatorId: "b", creator: "Beta", intelligence: 70 }),
  ];
  const entries = rankModels(models);

  it("combines provider, search, and favorites while retaining global ranks", () => {
    const filtered = browseEntries(entries, "beta", { providerId: "b", favoritesOnly: true }, new Set(["three"]));
    expect(filtered.map(({ id, rank }) => [id, rank])).toEqual([["three", 3]]);
    expect(browseEntries(entries, "", { providerId: ALL_PROVIDERS, favoritesOnly: false }, new Set())).toEqual(entries);
  });

  it("handles empty favorites without dropping the dataset", () => {
    expect(browseEntries(entries, "", { providerId: ALL_PROVIDERS, favoritesOnly: true }, new Set())).toEqual([]);
    expect(entries).toHaveLength(3);
  });

  it("lists each provider once using stable creator IDs", () => {
    expect(providers(models)).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });
});
