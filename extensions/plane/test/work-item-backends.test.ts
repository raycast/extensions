import { describe, expect, it, vi } from "vitest";
import {
  backendChain,
  CAPABILITY_TTL_MS,
  UNSUPPORTED_TTL_MS,
  capabilityKey,
  invalidateCapability,
  KeyValueStore,
  parseFilterParams,
  ProbeFetcher,
  ProbeResponse,
  readCachedCapabilities,
  resolveCapabilities,
  runWithFallback,
  supportedViews,
} from "../src/helpers/work-item-backends";

const BASE = "https://plane.example.com";
const SLUG = "acme";
const NOW = Date.UTC(2026, 9, 14, 12);
const PARAMS = "assignees,created_by,mentions,subscriber,state,state_group,priority,labels";

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

function response(status: number, body: unknown = undefined, headers: Record<string, string> = {}): ProbeResponse {
  const lower = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return { status, body, headers: { get: (name) => lower.get(name.toLowerCase()) ?? null } };
}

type Route = ProbeResponse | Error;

/** Answers the v2 probe and the custom probe separately and records every URL. */
function fakeFetcher(routes: { v2: Route; custom: Route }) {
  const calls: string[] = [];
  const fetcher: ProbeFetcher = async (url) => {
    calls.push(url);
    const route = url.includes("/api/v2/users/me/") ? routes.v2 : routes.custom;
    if (route instanceof Error) throw route;
    return route;
  };
  return { fetcher, calls };
}

async function resolve(store: KeyValueStore, fetcher: ProbeFetcher, now = NOW) {
  return resolveCapabilities({ store, fetcher, baseUrl: BASE, workspaceSlug: SLUG, now });
}

describe("capability detection", () => {
  it("uses v2 when /api/v2/users/me/ returns 2xx JSON with an id, and caches it", async () => {
    const store = memoryStore();
    const { fetcher, calls } = fakeFetcher({
      v2: response(200, { id: "user-1", display_name: "Priya" }),
      custom: response(404, { detail: "Not found." }),
    });
    const capabilities = await resolve(store, fetcher);
    expect(capabilities.v2).toBe(true);
    expect(capabilities.v2User).toEqual({ id: "user-1", displayName: "Priya" });
    expect(backendChain("assigned", capabilities)).toEqual(["v2", "scan"]);
    expect(calls).toContain(`${BASE}/api/v2/users/me/`);

    // Second run: served from the cache, no requests.
    const second = fakeFetcher({ v2: new Error("should not be called"), custom: new Error("nope") });
    expect((await resolve(store, second.fetcher)).v2).toBe(true);
    expect(second.calls).toEqual([]);
  });

  it("does not use v2 for a 2xx without a user id (e.g. an HTML page)", async () => {
    const { fetcher } = fakeFetcher({ v2: response(200, "<html>"), custom: response(404) });
    expect((await resolve(memoryStore(), fetcher)).v2).toBe(false);
  });

  it("moves on after a v2 404 and detects the custom filters with the advertised params", async () => {
    const store = memoryStore();
    const { fetcher, calls } = fakeFetcher({
      v2: response(404, { detail: "Not found." }),
      custom: response(
        200,
        { results: [] },
        { "X-Plane-Work-Item-Filters": "1", "X-Plane-Work-Item-Filter-Params": PARAMS },
      ),
    });
    const capabilities = await resolve(store, fetcher);
    expect(capabilities.v2).toBe(false);
    expect(capabilities.custom?.params).toEqual(PARAMS.split(","));
    expect(calls).toContain(`${BASE}/api/v1/workspaces/acme/work-items/?assignees=me&per_page=1`);
    expect(backendChain("assigned", capabilities)).toEqual(["custom", "scan"]);
    expect(backendChain("mentions", capabilities)).toEqual(["custom"]);
    expect(supportedViews(capabilities)).toEqual(["assigned", "created", "subscribed", "mentions"]);
    // Both answers were definitive, so both are cached.
    expect(store.map.has(capabilityKey("v2", BASE, SLUG))).toBe(true);
    expect(readCachedCapabilities({ store, baseUrl: BASE, workspaceSlug: SLUG, now: NOW }).custom?.params).toContain(
      "subscriber",
    );
  });

  it("treats a 200 without the header as no custom filters (scan)", async () => {
    const store = memoryStore();
    const { fetcher } = fakeFetcher({ v2: response(404), custom: response(200, { results: [] }) });
    const capabilities = await resolve(store, fetcher);
    expect(capabilities).toEqual({ v2: false });
    expect(backendChain("assigned", capabilities)).toEqual(["scan"]);
    expect(supportedViews(capabilities)).toEqual(["assigned", "created"]);
    expect(store.map.size).toBe(2);
  });

  it("ignores a header value other than 1", async () => {
    const { fetcher } = fakeFetcher({
      v2: response(404),
      custom: response(200, {}, { "X-Plane-Work-Item-Filters": "0", "X-Plane-Work-Item-Filter-Params": PARAMS }),
    });
    expect((await resolve(memoryStore(), fetcher)).custom).toBeUndefined();
  });

  it("only offers views whose param is advertised", async () => {
    const { fetcher } = fakeFetcher({
      v2: response(404),
      custom: response(200, {}, { "X-Plane-Work-Item-Filters": "1", "X-Plane-Work-Item-Filter-Params": "assignees" }),
    });
    const capabilities = await resolve(memoryStore(), fetcher);
    expect(backendChain("created", capabilities)).toEqual(["scan"]);
    expect(supportedViews(capabilities)).toEqual(["assigned", "created"]);
  });

  it.each([
    ["429", response(429, { type: "rate_limited", code: "rate_limited", detail: "Rate limit exceeded." })],
    ["network error", new TypeError("fetch failed")],
    ["500", response(500)],
    ["401", response(401)],
  ])("falls back to scan on %s and caches nothing", async (_label, failure) => {
    const store = memoryStore();
    const { fetcher } = fakeFetcher({ v2: failure, custom: failure });
    const capabilities = await resolve(store, fetcher);
    expect(capabilities).toEqual({ v2: false });
    expect(backendChain("assigned", capabilities)).toEqual(["scan"]);
    expect(store.map.size).toBe(0);

    // The next run probes again.
    const retry = fakeFetcher({ v2: response(200, { id: "u" }), custom: response(404) });
    expect((await resolve(store, retry.fetcher)).v2).toBe(true);
    expect(retry.calls).toHaveLength(2);
  });

  it("ignores the filter headers on a 401 and caches nothing", async () => {
    // The patched server sends the headers on every response, including unauthenticated ones.
    const headers = { "X-Plane-Work-Item-Filters": "1", "X-Plane-Work-Item-Filter-Params": PARAMS };
    const store = memoryStore();
    const { fetcher } = fakeFetcher({ v2: response(404), custom: response(401, {}, headers) });
    const capabilities = await resolve(store, fetcher);
    expect(capabilities.custom).toBeUndefined();
    expect(backendChain("assigned", capabilities)).toEqual(["scan"]);
    expect([...store.map.keys()].some((key) => key.includes("custom"))).toBe(false);
  });

  it("re-probes an unsupported answer after 1 hour", async () => {
    const store = memoryStore();
    await resolve(store, fakeFetcher({ v2: response(404), custom: response(404) }).fetcher);
    const later = fakeFetcher({ v2: response(200, { id: "u" }), custom: response(404) });
    expect((await resolve(store, later.fetcher, NOW + UNSUPPORTED_TTL_MS - 1)).v2).toBe(false);
    expect(later.calls).toEqual([]);
    expect((await resolve(store, later.fetcher, NOW + UNSUPPORTED_TTL_MS + 1)).v2).toBe(true);
  });

  it("keeps a supported answer for 24 hours", async () => {
    const store = memoryStore();
    await resolve(store, fakeFetcher({ v2: response(200, { id: "u" }), custom: response(404) }).fetcher);
    const later = fakeFetcher({ v2: response(404), custom: response(404) });
    expect((await resolve(store, later.fetcher, NOW + CAPABILITY_TTL_MS - 1)).v2).toBe(true);
    expect(later.calls.filter((url) => url.includes("/api/v2/"))).toEqual([]);
    expect((await resolve(store, later.fetcher, NOW + CAPABILITY_TTL_MS + 1)).v2).toBe(false);
  });

  it("scopes the cache by base URL and workspace", () => {
    expect(capabilityKey("v2", "https://plane.example.com/", "a")).toBe(capabilityKey("v2", "plane.example.com", "a"));
    expect(capabilityKey("v2", BASE, "a")).not.toBe(capabilityKey("v2", BASE, "b"));
  });

  it("parses the params header", () => {
    expect(parseFilterParams(" Assignees, created_by,,assignees ")).toEqual(["assignees", "created_by"]);
    expect(parseFilterParams(null)).toEqual([]);
  });
});

describe("runWithFallback", () => {
  const notFound = Object.assign(new Error("Not found (HTTP 404)"), { status: 404 });
  const badRequest = Object.assign(new Error("assignees: invalid (HTTP 400)"), { status: 400 });
  const serverError = Object.assign(new Error("boom (HTTP 500)"), { status: 500 });

  it("returns the first backend's result", async () => {
    const invalidate = vi.fn();
    const result = await runWithFallback(["v2", "scan"], async (kind) => kind, invalidate);
    expect(result).toEqual({ value: "v2", backend: "v2" });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it.each([
    ["404", notFound],
    ["400", badRequest],
  ])("invalidates and falls back once on %s", async (_label, failure) => {
    const invalidate = vi.fn();
    const run = vi.fn(async (kind: string) => {
      if (kind === "custom") throw failure;
      return `${kind}-items`;
    });
    const result = await runWithFallback(["custom", "scan"], run, invalidate);
    expect(result).toEqual({ value: "scan-items", backend: "scan" });
    expect(invalidate).toHaveBeenCalledWith("custom");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("drops the cached capability so the next run probes again", async () => {
    const store = memoryStore();
    const header = { "X-Plane-Work-Item-Filters": "1", "X-Plane-Work-Item-Filter-Params": PARAMS };
    const capabilities = await resolve(
      store,
      fakeFetcher({ v2: response(404), custom: response(200, {}, header) }).fetcher,
    );
    const result = await runWithFallback(
      backendChain("assigned", capabilities),
      async (kind) => {
        if (kind === "custom") throw notFound;
        return "scanned";
      },
      (kind) => invalidateCapability(store, kind, BASE, SLUG),
    );
    expect(result.backend).toBe("scan");
    expect(store.map.has(capabilityKey("custom", BASE, SLUG))).toBe(false);
    // v2's negative answer is untouched.
    expect(store.map.has(capabilityKey("v2", BASE, SLUG))).toBe(true);

    const reprobe = fakeFetcher({ v2: new Error("cached"), custom: response(200, {}) });
    expect((await resolve(store, reprobe.fetcher)).custom).toBeUndefined();
    expect(reprobe.calls).toHaveLength(1);
  });

  it("falls back only once", async () => {
    const invalidate = vi.fn();
    await expect(
      runWithFallback(
        ["v2", "custom", "scan"],
        async () => {
          throw notFound;
        },
        invalidate,
      ),
    ).rejects.toBe(notFound);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("does not fall back on other errors", async () => {
    const invalidate = vi.fn();
    await expect(
      runWithFallback(
        ["v2", "scan"],
        async () => {
          throw serverError;
        },
        invalidate,
      ),
    ).rejects.toBe(serverError);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("never invalidates the scan", async () => {
    const invalidate = vi.fn();
    await expect(
      runWithFallback(
        ["scan"],
        async () => {
          throw notFound;
        },
        invalidate,
      ),
    ).rejects.toBe(notFound);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("rethrows when nothing is left to fall back to", async () => {
    const invalidate = vi.fn();
    await expect(
      runWithFallback(
        ["custom"],
        async () => {
          throw badRequest;
        },
        invalidate,
      ),
    ).rejects.toBe(badRequest);
    expect(invalidate).toHaveBeenCalledWith("custom");
  });
});
