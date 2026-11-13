import { describe, expect, it, vi } from "vitest";
import { syncHistory } from "./history-sync";
import type { Page } from "./types";

const key = (s: string) => s;
const pagesFetcher = (pages: Record<string, Page<string>>) =>
  vi.fn(async (next: string | null) => pages[next ?? "start"]);

describe("syncHistory", () => {
  it("with an empty cache follows nextPagePath until null", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["g", "f", "e"], nextPagePath: "p2" },
      p2: { items: ["d", "c", "b"], nextPagePath: "p3" },
      p3: { items: ["a"], nextPagePath: null },
    });
    const result = await syncHistory(fetchPage, [], key, { sleep: async () => {} });
    expect(result).toEqual(["g", "f", "e", "d", "c", "b", "a"]);
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, "p2", "p3"]);
  });

  it("with a cache stops at the first page containing a known key", async () => {
    const fetchPage = pagesFetcher({ start: { items: ["e", "d", "c"], nextPagePath: "p2" } });
    const result = await syncHistory(fetchPage, ["c", "b", "a"], key, { sleep: async () => {} });
    expect(result).toEqual(["e", "d", "c", "b", "a"]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("dedupes by key", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["b", "a", "b"], nextPagePath: null },
    });
    expect(await syncHistory(fetchPage, [], key, { sleep: async () => {} })).toEqual(["b", "a"]);
  });

  it("waits pageDelayMs (default 3000) between page requests, not before the first", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["c"], nextPagePath: "p2" },
      p2: { items: ["b"], nextPagePath: "p3" },
      p3: { items: ["a"], nextPagePath: null },
    });
    const sleep = vi.fn(async () => {});
    await syncHistory(fetchPage, [], key, { sleep });
    expect(sleep.mock.calls).toEqual([[3000], [3000]]);
  });

  it("uses a custom pageDelayMs", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["b"], nextPagePath: "p2" },
      p2: { items: ["a"], nextPagePath: null },
    });
    const sleep = vi.fn(async () => {});
    await syncHistory(fetchPage, [], key, { sleep, pageDelayMs: 10 });
    expect(sleep).toHaveBeenCalledWith(10);
  });
});

describe("syncHistory onProgress / resumeFrom", () => {
  const noSleep = { sleep: async () => {} };

  it("on a first load reports the merged items and the resume cursor after every page", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["c", "b"], nextPagePath: "p2" },
      p2: { items: ["a"], nextPagePath: null },
    });
    const onProgress = vi.fn();
    await syncHistory(fetchPage, [], key, { ...noSleep, onProgress });
    expect(onProgress.mock.calls).toEqual([
      [["c", "b"], "p2"],
      [["c", "b", "a"], null],
    ]);
  });

  it("keeps the partial progress when a later page fails", async () => {
    const fetchPage = vi.fn(async (next: string | null) => {
      if (next === null) return { items: ["c", "b"], nextPagePath: "p2" };
      throw new Error("429");
    });
    const onProgress = vi.fn();
    await expect(syncHistory(fetchPage, [], key, { ...noSleep, onProgress })).rejects.toThrow("429");
    expect(onProgress.mock.calls).toEqual([[["c", "b"], "p2"]]);
  });

  it("with a cache reports once, after the newest pages join the cache, keeping a gap-free list", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["f", "e"], nextPagePath: "p2" },
      p2: { items: ["d", "c"], nextPagePath: "p3" },
    });
    const onProgress = vi.fn();
    await syncHistory(fetchPage, ["c", "b"], key, { ...noSleep, onProgress });
    expect(onProgress.mock.calls).toEqual([[["f", "e", "d", "c", "b"], null]]);
  });

  it("does not report when the newest pages fail before reaching the cache", async () => {
    const fetchPage = vi.fn(async (next: string | null) => {
      if (next === null) return { items: ["f", "e"], nextPagePath: "p2" };
      throw new Error("429");
    });
    const onProgress = vi.fn();
    await expect(syncHistory(fetchPage, ["c", "b"], key, { ...noSleep, onProgress })).rejects.toThrow();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("resumes an interrupted first load from resumeFrom after fetching the newest pages", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["e", "d"], nextPagePath: "x" },
      r1: { items: ["b"], nextPagePath: "r2" },
      r2: { items: ["a"], nextPagePath: null },
    });
    const onProgress = vi.fn();
    const sleep = vi.fn(async () => {});
    const result = await syncHistory(fetchPage, ["d", "c"], key, { sleep, onProgress, resumeFrom: "r1" });
    expect(result).toEqual(["e", "d", "c", "b", "a"]);
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, "r1", "r2"]);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls).toEqual([
      [["e", "d", "c"], "r1"],
      [["e", "d", "c", "b"], "r2"],
      [["e", "d", "c", "b", "a"], null],
    ]);
  });

  it("ignores resumeFrom when the cache is empty", async () => {
    const fetchPage = pagesFetcher({ start: { items: ["a"], nextPagePath: null } });
    const result = await syncHistory(fetchPage, [], key, { ...noSleep, resumeFrom: "r1" });
    expect(result).toEqual(["a"]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe("syncHistory resume edge cases", () => {
  const noSleep = { sleep: async () => {} };
  const rejected = new Error("400 bad cursor");
  const isRejectedCursor = (err: unknown) => err === rejected;

  it("clears resumeFrom without fetching it when the newest pages reach the end before the cache", async () => {
    const fetchPage = pagesFetcher({
      start: { items: ["f", "e"], nextPagePath: "p2" },
      p2: { items: ["d"], nextPagePath: null },
    });
    const onProgress = vi.fn();
    await syncHistory(fetchPage, ["c", "b"], key, { ...noSleep, onProgress, resumeFrom: "r1" });
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, "p2"]);
    expect(onProgress.mock.calls).toEqual([[["f", "e", "d", "c", "b"], null]]);
  });

  it("rebuilds from the newest page when the stored cursor is rejected", async () => {
    const pages: Record<string, Page<string>> = {
      start: { items: ["d", "c"], nextPagePath: "p2" },
      p2: { items: ["b", "a"], nextPagePath: null },
    };
    const fetchPage = vi.fn(async (next: string | null) => {
      if (next === "stale") throw rejected;
      return pages[next ?? "start"];
    });
    const onProgress = vi.fn();
    const result = await syncHistory(fetchPage, ["d", "c"], key, {
      ...noSleep,
      onProgress,
      resumeFrom: "stale",
      isRejectedCursor,
    });
    expect(result).toEqual(["d", "c", "b", "a"]);
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, "stale", null, "p2"]);
    // After the rejection the stale cursor is replaced by the rebuild walk's own cursors.
    expect(onProgress.mock.calls).toEqual([
      [["d", "c"], "stale"],
      [["d", "c"], "p2"],
      [["d", "c", "b", "a"], null],
    ]);
  });

  it("rethrows other errors from the stored cursor and keeps it for the next sync", async () => {
    const fetchPage = vi.fn(async (next: string | null) => {
      if (next === "r1") throw new Error("429");
      return { items: ["d", "c"], nextPagePath: "x" };
    });
    const onProgress = vi.fn();
    await expect(
      syncHistory(fetchPage, ["c"], key, { ...noSleep, onProgress, resumeFrom: "r1", isRejectedCursor }),
    ).rejects.toThrow("429");
    expect(onProgress.mock.calls).toEqual([[["d", "c"], "r1"]]);
  });
});

describe("syncHistory rate limits", () => {
  const limited = new Error("429");
  const rateLimitWaitMs = (err: unknown) => (err === limited ? 30_000 : null);

  it("waits and retries the same page once when it is rate-limited", async () => {
    let failed = false;
    const fetchPage = vi.fn(async (next: string | null) => {
      if (next === "p2" && !failed) {
        failed = true;
        throw limited;
      }
      return next === null ? { items: ["b"], nextPagePath: "p2" } : { items: ["a"], nextPagePath: null };
    });
    const sleep = vi.fn(async () => {});
    const result = await syncHistory(fetchPage, [], key, { sleep, rateLimitWaitMs });
    expect(result).toEqual(["b", "a"]);
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, "p2", "p2"]);
    expect(sleep.mock.calls).toEqual([[3000], [30_000]]);
  });

  it("retries a rate-limited resume page too", async () => {
    let failed = false;
    const fetchPage = vi.fn(async (next: string | null) => {
      if (next === "r1" && !failed) {
        failed = true;
        throw limited;
      }
      return next === null ? { items: ["c"], nextPagePath: "x" } : { items: ["a"], nextPagePath: null };
    });
    const result = await syncHistory(fetchPage, ["c", "b"], key, {
      sleep: async () => {},
      resumeFrom: "r1",
      rateLimitWaitMs,
    });
    expect(result).toEqual(["c", "b", "a"]);
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, "r1", "r1"]);
  });

  it("throws when the retry is rate-limited as well", async () => {
    const fetchPage = vi.fn(async (next: string | null) => {
      if (next === null) return { items: ["b"], nextPagePath: "p2" };
      throw limited;
    });
    await expect(syncHistory(fetchPage, [], key, { sleep: async () => {}, rateLimitWaitMs })).rejects.toBe(limited);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("does not retry other errors", async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error("500");
    });
    await expect(syncHistory(fetchPage, [], key, { sleep: async () => {}, rateLimitWaitMs })).rejects.toThrow("500");
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
