import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchCatalog, fetchPricing, fetchUsage } from "../src/lib/api";

const USAGE = {
  usage: {
    rolling: { status: "ok", percent: 42, resetsAt: "2026-09-08T11:12:00Z" },
    weekly: { status: "ok", percent: 31, resetsAt: "2026-09-12T16:00:00Z" },
    monthly: { status: "ok", percent: 18, resetsAt: "2026-10-04T00:00:00Z" },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("fetchUsage", () => {
  it("returns the parsed usage windows", async () => {
    mockFetch(async () => new Response(JSON.stringify(USAGE), { status: 200 }));
    const usage = await fetchUsage("key", "https://opencode.ai/zen/go/v1");
    expect(usage.rolling.percent).toBe(42);
    expect(usage.monthly.status).toBe("ok");
  });

  it("sends the bearer token", async () => {
    const fn = vi.fn(async () => new Response(JSON.stringify(USAGE), { status: 200 }));
    mockFetch(fn);
    await fetchUsage("secret", "https://opencode.ai/zen/go/v1");
    expect(fn).toHaveBeenCalledWith("https://opencode.ai/zen/go/v1/usage", expect.objectContaining({ headers: { Authorization: "Bearer secret" } }));
  });

  it("classifies a 401 as bad-key", async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: { type: "AuthError" } }), { status: 401 }));
    await expect(fetchUsage("key", "https://opencode.ai/zen/go/v1")).rejects.toMatchObject({ kind: "bad-key" });
  });

  it("classifies a 403 as no-entitlement", async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: { type: "EntitlementError" } }), { status: 403 }));
    await expect(fetchUsage("key", "https://opencode.ai/zen/go/v1")).rejects.toMatchObject({ kind: "no-entitlement" });
  });

  it("classifies a network failure as offline", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(fetchUsage("key", "https://opencode.ai/zen/go/v1")).rejects.toMatchObject({ kind: "offline" });
  });

  it("classifies a missing usage body as http", async () => {
    mockFetch(async () => new Response(JSON.stringify({ nope: true }), { status: 200 }));
    await expect(fetchUsage("key", "https://opencode.ai/zen/go/v1")).rejects.toMatchObject({ kind: "http" });
  });
});

describe("fetchCatalog", () => {
  it("returns model ids from the OpenAI-style list", async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ data: [{ id: "deepseek-v4-flash" }, { id: "glm-5.3-flash" }] }), { status: 200 }),
    );
    await expect(fetchCatalog("https://opencode.ai/zen/go/v1")).resolves.toEqual(["deepseek-v4-flash", "glm-5.3-flash"]);
  });

  it("drops ids that are missing, empty, or absurdly long", async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ data: [{ id: "" }, { id: 42 }, { id: "a".repeat(200) }, { id: "ok" }] }), { status: 200 }),
    );
    await expect(fetchCatalog("https://opencode.ai/zen/go/v1")).resolves.toEqual(["ok"]);
  });

  it("rejects a response whose data is not an array", async () => {
    mockFetch(async () => new Response(JSON.stringify({ data: "nope" }), { status: 200 }));
    await expect(fetchCatalog("https://opencode.ai/zen/go/v1")).rejects.toMatchObject({ kind: "http" });
  });

  it("rejects an empty catalog so the caller can fall back to cache", async () => {
    mockFetch(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await expect(fetchCatalog("https://opencode.ai/zen/go/v1")).rejects.toMatchObject({ kind: "http" });
  });
});

describe("fetchPricing", () => {
  const pricing = {
    "opencode-go": {
      models: {
        "deepseek-v4-flash": {
          cost: { input: 0.22, output: 0.66, cache_read: 0.007 },
          modalities: { input: ["text"], output: ["text"] },
        },
        "no-cost-model": {},
      },
    },
    opencode: {
      models: {
        "claude-opus-5": {
          cost: { input: 5, output: 25, cache_read: 0.5 },
          modalities: { input: ["text", "image"], output: ["text"] },
        },
      },
    },
  };

  it("parses both providers into go and zen catalogs", async () => {
    mockFetch(async () => new Response(JSON.stringify(pricing), { status: 200 }));
    const catalog = await fetchPricing("https://models.dev/api.json");
    expect(catalog.go).toHaveLength(1);
    expect(catalog.go[0]).toMatchObject({ id: "deepseek-v4-flash", cost: { input: 0.22, output: 0.66, cacheRead: 0.007 }, modalities: { input: ["text"], output: ["text"] } });
    expect(catalog.zen).toHaveLength(1);
    expect(catalog.zen[0]).toMatchObject({ id: "claude-opus-5", cost: { input: 5, output: 25, cacheRead: 0.5 }, modalities: { input: ["text", "image"], output: ["text"] } });
  });

  it("returns empty catalogs when both providers are absent", async () => {
    mockFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
    await expect(fetchPricing("https://models.dev/api.json")).resolves.toEqual({ go: [], zen: [] });
  });

  it("drops models without cost in each provider", async () => {
    mockFetch(async () => new Response(JSON.stringify(pricing), { status: 200 }));
    const catalog = await fetchPricing("https://models.dev/api.json");
    expect(catalog.go.find((m) => m.id === "no-cost-model")).toBeUndefined();
  });
});