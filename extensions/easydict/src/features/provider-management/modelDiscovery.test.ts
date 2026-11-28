import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveOpenAICompatibleModelDiscovery } from "./modelDiscovery";

const timedFetch = vi.hoisted(() => vi.fn());
const cacheStorage = vi.hoisted(() => new Map<string, string>());
const logSummary = vi.hoisted(() => vi.fn());
const logTrace = vi.hoisted(() => vi.fn());
const logWarn = vi.hoisted(() => vi.fn());

vi.mock("@/shared/http", () => ({ timedFetch }));
vi.mock("@/shared/logger", () => ({
  logSummary,
  logTrace,
  logWarn,
}));
vi.mock("@raycast/api", async () => {
  const { createCacheMock } = await import("@/test-support/raycastStorage");
  return {
    Cache: createCacheMock(new Map([["ai-provider-models", cacheStorage]])),
  };
});

beforeEach(() => {
  timedFetch.mockReset();
  cacheStorage.clear();
  logSummary.mockReset();
  logTrace.mockReset();
  logWarn.mockReset();
});

describe("OpenAI-compatible model discovery", () => {
  it.each([
    ["https://api.example.com/v1", "https://api.example.com/v1/models"],
    ["https://api.example.com/v1/chat/completions", "https://api.example.com/v1/models"],
    ["https://example.com/v1beta/openai/", "https://example.com/v1beta/openai/models"],
  ])("requests %s with authorization and sorts usable IDs", async (endpoint, modelsURL) => {
    const signal = new AbortController().signal;
    timedFetch.mockResolvedValue({
      data: [{ id: "model-b" }, { id: "" }, { id: 42 }, { id: "model-a" }, { id: "model-b" }],
    });

    await expect(resolveOpenAICompatibleModelDiscovery(endpoint, "test-key").loadIds(signal)).resolves.toEqual([
      "model-a",
      "model-b",
    ]);
    expect(timedFetch).toHaveBeenCalledWith(modelsURL, { headers: { Authorization: "Bearer test-key" }, signal });
  });

  it.each([
    ["https://opencode.ai/zen/v1", "https://opencode.ai/zen/v1/models", ""],
    ["https://opencode.ai/zen/v1/chat/completions", "https://opencode.ai/zen/v1/models", "entered-key"],
    ["https://opencode.ai/zen/go/v1", "https://opencode.ai/zen/go/v1/models", "entered-key"],
    ["https://opencode.ai/zen/go/v1/chat/completions", "https://opencode.ai/zen/go/v1/models", ""],
  ] as const)("uses an anonymous request for the public %s directory", async (endpoint, modelsURL, apiKey) => {
    timedFetch.mockResolvedValue({ data: [{ id: "deepseek-v4-flash" }] });
    const signal = new AbortController().signal;

    const discovery = resolveOpenAICompatibleModelDiscovery(endpoint, apiKey);
    expect(discovery.canLoad).toBe(true);
    await discovery.loadIds(signal);

    expect(timedFetch).toHaveBeenCalledWith(modelsURL, { signal });
  });

  it("authenticates TokenHub discovery and reuses its existing credential-scoped cache key", async () => {
    const endpoint = "https://tokenhub.tencentmaas.com/v1";
    const modelsURL = `${endpoint}/models`;
    const apiKey = "test-key";
    const existingKey = createHash("sha256").update(`${modelsURL}\n${apiKey}`).digest("hex");
    cacheStorage.set(existingKey, JSON.stringify(["hy-mt2-lite"]));
    timedFetch.mockResolvedValue({ data: [{ id: "hy-mt2-plus" }] });

    const discovery = resolveOpenAICompatibleModelDiscovery(`${endpoint}/chat/completions`, apiKey);
    expect(discovery.canLoad).toBe(true);
    expect(discovery.getCachedIds()).toEqual(["hy-mt2-lite"]);
    expect(resolveOpenAICompatibleModelDiscovery(endpoint, "other-key").getCachedIds()).toEqual([]);
    expect(resolveOpenAICompatibleModelDiscovery(endpoint, "").canLoad).toBe(false);
    await discovery.loadIds();

    expect(timedFetch).toHaveBeenCalledWith(modelsURL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: undefined,
    });
    expect([...cacheStorage]).toEqual([[existingKey, JSON.stringify(["hy-mt2-plus"])]]);
    expect(JSON.stringify([logSummary.mock.calls, logTrace.mock.calls, logWarn.mock.calls])).not.toContain(apiKey);
  });

  it("shares public model cache entries regardless of the entered API key", async () => {
    timedFetch.mockResolvedValue({ data: [{ id: "deepseek-v4-flash" }] });

    const endpoint = "https://opencode.ai/zen/v1";
    await resolveOpenAICompatibleModelDiscovery(endpoint, "entered-key").loadIds();

    expect(resolveOpenAICompatibleModelDiscovery(endpoint, "").getCachedIds()).toEqual(["deepseek-v4-flash"]);
    expect(resolveOpenAICompatibleModelDiscovery(endpoint, "other-key").getCachedIds()).toEqual(["deepseek-v4-flash"]);
  });
});
