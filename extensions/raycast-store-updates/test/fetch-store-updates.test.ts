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

  expect(first[0].title).toBe("New Extension");
  expect(second).toEqual(first);
  expect(newOnly[0].title).toBe("New Extension");
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

