import { beforeEach, describe, expect, it, vi } from "vitest";
import { addRecentDuration, getRecentDurations, MAX_RECENT, rememberDuration } from "../src/lib/recent";

const raycast = vi.hoisted(() => ({
  store: new Map<string, string>(),
  // When set, the next LocalStorage call throws. A test sets it to simulate unavailable storage.
  failStorage: false,
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({}),
  launchCommand: vi.fn(),
  LaunchType: { Background: "background", UserInitiated: "userInitiated" },
  LocalStorage: {
    getItem: async (key: string) => {
      if (raycast.failStorage) {
        throw new Error("storage unavailable");
      }
      return raycast.store.get(key);
    },
    allItems: async () => Object.fromEntries(raycast.store),
    setItem: async (key: string, value: string) => {
      if (raycast.failStorage) {
        throw new Error("storage unavailable");
      }
      raycast.store.set(key, value);
    },
    removeItem: async (key: string) => {
      raycast.store.delete(key);
    },
  },
}));

beforeEach(() => {
  raycast.store.clear();
  raycast.failStorage = false;
});

describe("addRecentDuration", () => {
  it("puts the newest duration first", () => {
    expect(addRecentDuration([45], 90)).toEqual([90, 45]);
  });

  it("moves an existing duration to the front without duplicating it", () => {
    expect(addRecentDuration([45, 90, 75], 90)).toEqual([90, 45, 75]);
  });

  it("keeps only the most recent entries", () => {
    expect(addRecentDuration([45, 90, 75], 20)).toEqual([20, 45, 90]);
    expect(MAX_RECENT).toBe(3);
  });

  it("ignores preset durations", () => {
    const list = [45, 90];
    expect(addRecentDuration(list, 30)).toBe(list);
    expect(addRecentDuration(list, 60)).toBe(list);
    expect(addRecentDuration(list, 120)).toBe(list);
    expect(addRecentDuration(list, 240)).toBe(list);
  });

  it("does not change the input list", () => {
    const list = [45, 90, 75];
    addRecentDuration(list, 20);
    expect(list).toEqual([45, 90, 75]);
  });
});

describe("getRecentDurations", () => {
  it("returns an empty list when nothing is stored", async () => {
    expect(await getRecentDurations()).toEqual([]);
  });

  it("returns an empty list when the stored value is not valid JSON", async () => {
    raycast.store.set("recent-durations", "{not json");
    expect(await getRecentDurations()).toEqual([]);
  });

  it("returns an empty list when the stored value is not an array", async () => {
    raycast.store.set("recent-durations", JSON.stringify({ 45: true }));
    expect(await getRecentDurations()).toEqual([]);
  });

  it("drops entries that are not positive whole numbers", async () => {
    raycast.store.set("recent-durations", JSON.stringify([45, 2.5, -10, "90", 0, null, 1e300, 120]));
    expect(await getRecentDurations()).toEqual([45, 120]);
  });

  it("returns at most the maximum number of entries", async () => {
    raycast.store.set("recent-durations", JSON.stringify([10, 20, 30, 40, 50]));
    expect(await getRecentDurations()).toEqual([10, 20, 30]);
  });

  it("returns an empty list when LocalStorage throws", async () => {
    raycast.store.set("recent-durations", JSON.stringify([45]));
    raycast.failStorage = true;
    expect(await getRecentDurations()).toEqual([]);
  });
});

describe("rememberDuration", () => {
  it("stores a duration and reads it back", async () => {
    await rememberDuration(45);
    await rememberDuration(90);
    expect(await getRecentDurations()).toEqual([90, 45]);
  });

  it("does not throw when LocalStorage throws", async () => {
    raycast.failStorage = true;
    await expect(rememberDuration(45)).resolves.toBeUndefined();
  });

  it("does not store a preset duration", async () => {
    await rememberDuration(60);
    expect(raycast.store.get("recent-durations")).toBe("[]");
  });
});
