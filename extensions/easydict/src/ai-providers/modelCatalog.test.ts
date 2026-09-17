import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDefaultRaycastAIModel, resolveAIProviderModelCatalog } from "./modelCatalog";
import type { AIProviderProfile, OpenAICompatibleProfile } from "./types";

const fetchOpenAICompatibleModelIds = vi.hoisted(() => vi.fn());
const getCachedOpenAICompatibleModelIds = vi.hoisted(() => vi.fn());
const isPublicOpenAICompatibleModelsEndpoint = vi.hoisted(() =>
  vi.fn(
    (endpoint: string) => endpoint === "https://opencode.ai/zen/v1" || endpoint === "https://opencode.ai/zen/go/v1",
  ),
);

vi.mock("./modelDiscovery", () => ({
  fetchOpenAICompatibleModelIds,
  getCachedOpenAICompatibleModelIds,
  isPublicOpenAICompatibleModelsEndpoint,
}));
vi.mock("@raycast/api", () => ({
  AI: {
    Model: {
      "OpenAI_GPT-5_mini": "openai-gpt-5-mini",
      Duplicate: "openai-gpt-5-mini",
      Anthropic_Claude: "anthropic-claude",
    },
  },
}));

beforeEach(() => {
  fetchOpenAICompatibleModelIds.mockReset();
  getCachedOpenAICompatibleModelIds.mockReset();
  getCachedOpenAICompatibleModelIds.mockReturnValue([]);
});

describe("AI provider model catalogs", () => {
  it("selects a default Raycast model from the available catalog entries", () => {
    expect(getDefaultRaycastAIModel()).toBe("openai-gpt-5-mini");
  });

  it("exposes Raycast models through the same catalog capability without custom values", async () => {
    const profile: AIProviderProfile = {
      id: "raycast",
      adapter: "raycast-ai",
      name: "Raycast AI",
      enabled: true,
      order: 0,
      model: "openai-gpt-5-mini",
      icon: { kind: "preset", name: "raycast" },
      wordResultMode: "translation",
    };

    const catalog = resolveAIProviderModelCatalog(profile);

    expect(catalog.allowsCustomModel).toBe(false);
    await expect(catalog.loadOptions()).resolves.toEqual([
      { title: "OpenAI GPT-5 mini", value: "openai-gpt-5-mini" },
      { title: "Anthropic Claude", value: "anthropic-claude" },
    ]);
    expect(fetchOpenAICompatibleModelIds).not.toHaveBeenCalled();
  });

  it("keeps generic OpenAI-compatible model IDs unchanged", async () => {
    const profile = createOpenAICompatibleProfile("https://api.example.com/v1");
    fetchOpenAICompatibleModelIds.mockResolvedValue(["vendor/model-b", "model-a"]);

    const catalog = resolveAIProviderModelCatalog(profile);

    await expect(catalog.loadOptions()).resolves.toEqual([
      { title: "model-a", value: "model-a" },
      { title: "vendor/model-b", value: "vendor/model-b" },
    ]);
  });

  it("normalizes Gemini resource names in its model catalog without filtering capabilities", async () => {
    const profile = createOpenAICompatibleProfile("https://generativelanguage.googleapis.com/v1beta/openai");
    fetchOpenAICompatibleModelIds.mockResolvedValue([
      "models/gemini-3.6-flash",
      "models/aqa",
      "models/deep-research-preview-04-2026",
    ]);

    const catalog = resolveAIProviderModelCatalog(profile);

    await expect(catalog.loadOptions()).resolves.toEqual([
      { title: "aqa", value: "aqa" },
      { title: "deep-research-preview-04-2026", value: "deep-research-preview-04-2026" },
      { title: "gemini-3.6-flash", value: "gemini-3.6-flash" },
    ]);
  });

  it("loads OpenCode public models without a key and keeps its load key stable when a key is entered", async () => {
    const endpoint = "https://opencode.ai/zen/v1";
    fetchOpenAICompatibleModelIds.mockResolvedValue(["deepseek-v4-flash"]);

    const withoutKey = resolveAIProviderModelCatalog(createOpenAICompatibleProfile(endpoint, ""));
    const withKey = resolveAIProviderModelCatalog(createOpenAICompatibleProfile(endpoint, "entered-key"));

    expect(withoutKey.loadKey).toBeTruthy();
    expect(withKey.loadKey).toBe(withoutKey.loadKey);
    await expect(withoutKey.loadOptions()).resolves.toEqual([
      { title: "deepseek-v4-flash", value: "deepseek-v4-flash" },
    ]);
  });

  it("does not automatically load a generic endpoint when its key is empty", () => {
    const catalog = resolveAIProviderModelCatalog(createOpenAICompatibleProfile("https://api.example.com/v1", ""));

    expect(catalog.loadKey).toBeUndefined();
  });
});

function createOpenAICompatibleProfile(endpoint: string, apiKey = "test-key"): OpenAICompatibleProfile {
  return {
    id: "openai-compatible",
    adapter: "openai-compatible",
    name: "Provider",
    enabled: true,
    order: 0,
    endpoint,
    model: "model-a",
    apiKey,
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "prompt",
    icon: { kind: "initials" },
    wordResultMode: "translation",
  };
}
