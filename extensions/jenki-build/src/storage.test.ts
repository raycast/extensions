// src/storage.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => store[key] ?? undefined),
    setItem: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    }),
  },
}));

// Clear store before each test
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

import {
  getFavorites,
  setFavorites,
  addFavorite,
  removeFavorite,
  getRecentJobs,
  pushRecentJob,
  getBuildHistory,
  pushBuildHistory,
} from "./storage";
import type { BuildHistoryEntry } from "./types";

const makeBuildEntry = (jobName: string, n: number): BuildHistoryEntry => ({
  jobName,
  jobPath: `/jobs/${jobName}`,
  jobUrl: `http://jenkins/${jobName}`,
  buildNumber: n,
  triggeredAt: Date.now(),
  status: "success",
});

// --- Favorites ---
describe("getFavorites", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getFavorites()).toEqual([]);
  });
});

describe("setFavorites", () => {
  it("stores and retrieves correctly", async () => {
    await setFavorites(["/job/a", "/job/b"]);
    expect(await getFavorites()).toEqual(["/job/a", "/job/b"]);
  });

  it("caps at 50 entries (pass 60, get back 50)", async () => {
    const paths = Array.from({ length: 60 }, (_, i) => `/job/${i}`);
    await setFavorites(paths);
    const result = await getFavorites();
    expect(result).toHaveLength(50);
  });
});

describe("addFavorite", () => {
  it("adds a path to the front", async () => {
    await setFavorites(["/job/a"]);
    await addFavorite("/job/b");
    expect((await getFavorites())[0]).toBe("/job/b");
  });

  it("deduplicates — adding existing path moves it to front", async () => {
    await setFavorites(["/job/a", "/job/b", "/job/c"]);
    await addFavorite("/job/b");
    const result = await getFavorites();
    expect(result[0]).toBe("/job/b");
    expect(result.filter((p) => p === "/job/b")).toHaveLength(1);
  });
});

describe("removeFavorite", () => {
  it("removes a path", async () => {
    await setFavorites(["/job/a", "/job/b"]);
    await removeFavorite("/job/a");
    expect(await getFavorites()).toEqual(["/job/b"]);
  });

  it("no-op for non-existent path", async () => {
    await setFavorites(["/job/a"]);
    await removeFavorite("/job/x");
    expect(await getFavorites()).toEqual(["/job/a"]);
  });
});

// --- Recent Jobs ---
describe("getRecentJobs", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getRecentJobs()).toEqual([]);
  });
});

describe("pushRecentJob", () => {
  it("adds path to front", async () => {
    await pushRecentJob("/job/a");
    await pushRecentJob("/job/b");
    expect((await getRecentJobs())[0]).toBe("/job/b");
  });

  it("deduplicates — re-adding moves to front", async () => {
    await pushRecentJob("/job/a");
    await pushRecentJob("/job/b");
    await pushRecentJob("/job/a");
    const result = await getRecentJobs();
    expect(result[0]).toBe("/job/a");
    expect(result.filter((p) => p === "/job/a")).toHaveLength(1);
  });

  it("caps at 10 (push 12 items, get back 10)", async () => {
    for (let i = 0; i < 12; i++) {
      await pushRecentJob(`/job/${i}`);
    }
    expect(await getRecentJobs()).toHaveLength(10);
  });
});

// --- Build History ---
describe("getBuildHistory", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getBuildHistory()).toEqual([]);
  });
});

describe("pushBuildHistory", () => {
  it("adds entry to front", async () => {
    const e1 = makeBuildEntry("alpha", 1);
    const e2 = makeBuildEntry("beta", 2);
    await pushBuildHistory(e1);
    await pushBuildHistory(e2);
    const history = await getBuildHistory();
    expect(history[0].jobName).toBe("beta");
  });

  it("caps at 20", async () => {
    for (let i = 0; i < 25; i++) {
      await pushBuildHistory(makeBuildEntry(`job${i}`, i));
    }
    expect(await getBuildHistory()).toHaveLength(20);
  });
});
