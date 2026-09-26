import { beforeEach, expect, test, vi } from "vitest";

const { cacheEntries, storage } = vi.hoisted(() => ({
  cacheEntries: new Map<string, string>(),
  storage: new Map<string, string>(),
}));

vi.mock("@raycast/api", () => ({
  Cache: class {
    private namespace: string;
    constructor({ namespace }: { namespace: string }) {
      this.namespace = namespace;
    }
    get(key: string) {
      return cacheEntries.get(`${this.namespace}:${key}`);
    }
    set(key: string, value: string) {
      cacheEntries.set(`${this.namespace}:${key}`, value);
    }
  },
  Color: {},
  Icon: {},
  LocalStorage: {
    getItem: async (key: string) => storage.get(key),
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
  },
}));
vi.mock("@chrismessina/raycast-kit", () => ({ showError: vi.fn() }));
vi.mock("../src/utils/graphql", () => ({ isGraphQLEnabled: () => false, fetchMergedPRsViaGraphQL: vi.fn() }));

import { FEED_URL, GITHUB_PRS_URL, fetchStoreUpdates } from "../src/utils";

const feed = {
  items: [
    {
      id: "new-extension",
      url: "https://www.raycast.com/example/new-extension",
      title: "New Extension",
      summary: "A new extension",
      image: "",
      date_modified: "2026-09-25T12:00:00Z",
      author: { name: "Example", url: "https://www.raycast.com/example" },
    },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
  cacheEntries.clear();
  storage.clear();
  vi.unstubAllGlobals();
});

test("reuses a successful AI scan and skips GitHub for new-only requests", async () => {
  const fetchMock = vi.fn(async (url: string) =>
    new Response(JSON.stringify(url === FEED_URL ? feed : []), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const first = await fetchStoreUpdates();
  const second = await fetchStoreUpdates();
  const newOnly = await fetchStoreUpdates("new");

  expect(first.items[0].title).toBe("New Extension");
  expect(second).toEqual(first);
  expect(newOnly.items[0].title).toBe("New Extension");
  expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([FEED_URL, FEED_URL, GITHUB_PRS_URL].sort());
});

test("refreshes an AI scan after ten minutes", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
  const fetchMock = vi.fn(async (url: string) =>
    new Response(JSON.stringify(url === FEED_URL ? feed : []), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await fetchStoreUpdates();
  now.mockReturnValue(1_000_000 + 10 * 60 * 1000);
  await fetchStoreUpdates();

  expect(fetchMock.mock.calls.filter(([url]) => url === GITHUB_PRS_URL)).toHaveLength(2);
});

test("keeps feed items and observes the stored cooldown after a GitHub rate limit", async () => {
  const fetchMock = vi.fn(async (url: string) =>
    url === FEED_URL
      ? new Response(JSON.stringify(feed), { status: 200 })
      : new Response(JSON.stringify({ message: "rate limited" }), {
          status: 429,
          headers: { "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 1800) },
        }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const first = await fetchStoreUpdates();
  const reset = storage.get("github-rate-limit-reset");
  const second = await fetchStoreUpdates();

  expect(first.items.map((item) => item.title)).toEqual(["New Extension"]);
  expect(first.updatesUnavailable).toMatch(/rate limit/i);
  expect(reset).toBeDefined();
  expect(second.updatesUnavailable).toMatch(/rate limit/i);
  expect(storage.get("github-rate-limit-reset")).toBe(reset);
  expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([FEED_URL, FEED_URL, GITHUB_PRS_URL].sort());
});

test("a failed Store feed remains an error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => new Response(JSON.stringify(url === FEED_URL ? {} : []), { status: 200 })),
  );

  await expect(fetchStoreUpdates()).rejects.toThrow(/invalid response/);
});
test("reports the activity cutoff of a full PR page", async () => {
  const prs = Array.from({ length: 50 }, (_, index) => ({
    number: index + 1,
    title: `PR ${index + 1}`,
    merged_at: null,
    updated_at: index === 49 ? "2026-09-24T00:00:00Z" : "2026-09-25T00:00:00Z",
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => new Response(JSON.stringify(url === FEED_URL ? feed : prs), { status: 200 })),
  );

  const result = await fetchStoreUpdates();

  expect(result.updatesCoverageSince).toBe("2026-09-24T00:00:00Z");
});

