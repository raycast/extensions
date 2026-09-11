import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSearchCache,
  getSearchCacheSize,
  searchCacheKey,
  searchWithCache,
} from "../lib/search-cache";
import type {
  ScreenReference,
  SearchClient,
  SearchOptions,
} from "../lib/types";

const options: SearchOptions = {
  kind: "screen",
  query: "Login",
  platform: "ios",
  mode: "deep",
  imageQuality: "optimized",
  mcpImageFormat: "webp",
  limit: 20,
  excludeScreenIds: [],
};
const result: ScreenReference = {
  kind: "screen",
  id: "screen-1",
  title: "Login",
  appName: "Example",
  platform: "ios",
  source: "api",
  mobbinUrl: "https://mobbin.com/screen-1",
  image: { url: "https://example.com/screen.webp" },
};

function clientWith(search: SearchClient["search"]): SearchClient {
  return {
    connect: vi.fn(),
    getCapabilities: vi.fn(),
    search,
    dispose: vi.fn(),
  };
}

describe("search cache", () => {
  beforeEach(() => {
    clearSearchCache();
    vi.useRealTimers();
  });

  it("normalizes query casing and exclusion order in cache keys", () => {
    expect(
      searchCacheKey("api-key", {
        ...options,
        query: " login ",
        excludeScreenIds: ["b", "a"],
      }),
    ).toBe(
      searchCacheKey("api-key", {
        ...options,
        query: "LOGIN",
        excludeScreenIds: ["a", "b"],
      }),
    );
  });

  it("caches successful searches and deduplicates in-flight requests", async () => {
    let resolveSearch: ((value: ScreenReference[]) => void) | undefined;
    const search = vi.fn(
      () =>
        new Promise<ScreenReference[]>((resolve) => {
          resolveSearch = resolve;
        }),
    );
    const client = clientWith(search);
    const first = searchWithCache(client, "api-key", options);
    const second = searchWithCache(client, "api-key", options);
    expect(search).toHaveBeenCalledTimes(1);
    resolveSearch?.([result]);
    await expect(Promise.all([first, second])).resolves.toEqual([
      [result],
      [result],
    ]);

    await expect(searchWithCache(client, "api-key", options)).resolves.toEqual([
      result,
    ]);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("evicts the oldest entries beyond the 30-entry bound", async () => {
    const client = clientWith(vi.fn(async () => [result]));
    for (let index = 0; index < 31; index += 1) {
      await searchWithCache(client, "api-key", {
        ...options,
        query: `query-${index}`,
      });
    }
    expect(getSearchCacheSize()).toBe(30);
  });

  it("expires successful entries after two minutes", async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => [result]);
    const client = clientWith(search);
    await searchWithCache(client, "api-key", options);
    await vi.advanceTimersByTimeAsync(119_999);
    await searchWithCache(client, "api-key", options);
    expect(search).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await searchWithCache(client, "api-key", options);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("forwards cancellation and does not cache aborted searches", async () => {
    const search = vi.fn(
      (_options: SearchOptions, signal?: AbortSignal) =>
        new Promise<ScreenReference[]>((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const client = clientWith(search);
    const controller = new AbortController();
    const promise = searchWithCache(
      client,
      "api-key",
      options,
      controller.signal,
    );
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(getSearchCacheSize()).toBe(0);
  });

  it("keeps shared work alive until every consumer cancels", async () => {
    let resolveSearch: ((value: ScreenReference[]) => void) | undefined;
    let underlyingSignal: AbortSignal | undefined;
    const search = vi.fn(
      (_options: SearchOptions, signal?: AbortSignal) =>
        new Promise<ScreenReference[]>((resolve) => {
          resolveSearch = resolve;
          underlyingSignal = signal;
        }),
    );
    const client = clientWith(search);
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = searchWithCache(
      client,
      "api-key",
      options,
      firstController.signal,
    ).catch((error: unknown) => error);
    const second = searchWithCache(
      client,
      "api-key",
      options,
      secondController.signal,
    );
    await Promise.resolve();
    firstController.abort();
    await expect(first).resolves.toMatchObject({ name: "AbortError" });
    expect(underlyingSignal?.aborted).toBe(false);
    resolveSearch?.([result]);
    await expect(second).resolves.toEqual([result]);
    expect(search).toHaveBeenCalledTimes(1);
  });
});
