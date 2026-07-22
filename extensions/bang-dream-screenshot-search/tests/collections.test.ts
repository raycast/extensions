import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string | number | boolean>());

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => storage.get(key)),
    setItem: vi.fn(async (key: string, value: string | number | boolean) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

import { RECENT_STORAGE_KEY, addRecentIdAndSave } from "../src/lib/collections";

describe("recent collections", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("serializes overlapping recent updates against the latest stored list", async () => {
    storage.set(RECENT_STORAGE_KEY, JSON.stringify(["old"]));
    const validIds = new Set(["old", "a", "b"]);

    const [afterA, afterB] = await Promise.all([
      addRecentIdAndSave("a", validIds),
      addRecentIdAndSave("b", validIds),
    ]);

    expect(afterA).toEqual(["a", "old"]);
    expect(afterB).toEqual(["b", "a", "old"]);
    expect(JSON.parse(storage.get(RECENT_STORAGE_KEY) as string)).toEqual(["b", "a", "old"]);
  });
});
