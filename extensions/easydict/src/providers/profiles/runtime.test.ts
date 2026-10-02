import { describe, expect, it, vi } from "vitest";

import { resolveAIProviderRuntimeConfig } from "./runtime";
import type { AIProviderProfile, OpenAICompatibleProfile } from "./types";

vi.mock("@raycast/api", () => ({ AI: { Model: { Test_Model: "test-model" } } }));

describe("AI provider runtime configuration", () => {
  it.each([
    [{ name: "\t" }, "Enter a provider name."],
    [{ model: " " }, "Enter a model."],
    [{ endpoint: " \n " }, "Enter an API base URL."],
    [{ endpoint: "ftp://example.com/v1" }, "Enter a valid HTTP or HTTPS API base URL."],
    [{ endpoint: "not a URL" }, "Enter a valid HTTP or HTTPS API base URL."],
  ])(
    "reports an incomplete OpenAI-compatible configuration without changing the stored profile",
    (changes, message) => {
      const profile = { ...createProfile(), ...changes };
      const original = structuredClone(profile);

      expect(resolveAIProviderRuntimeConfig(profile)).toEqual({ kind: "issue", message });
      expect(profile).toEqual(original);
    },
  );

  it("resolves normalized request parameters while leaving the editable profile intact", () => {
    const profile = {
      ...createProfile(),
      name: " Example ",
      endpoint: " https://example.com/v1/chat/completions/ ",
      model: " example-model ",
      apiKey: " test-key ",
    };
    const original = structuredClone(profile);
    const config = resolveConfig(profile);

    expect(config).toMatchObject({
      id: profile.id,
      name: "Example",
      adapter: "openai-compatible",
      request: { baseURL: "https://example.com/v1", model: "example-model", apiKey: "test-key" },
      endpoint: new URL("https://example.com/v1"),
      tokenLimitMode: "max-tokens",
      jsonOutputMode: "prompt",
    });
    expect(profile).toEqual(original);
  });

  it("accepts a keyless endpoint and omits authorization from its request parameters", () => {
    const config = resolveConfig({ ...createProfile(), apiKey: "\t\n", endpoint: "http://localhost:8080/v1" });

    expect(config).toMatchObject({ request: { baseURL: "http://localhost:8080/v1" } });
    if (config.adapter !== "openai-compatible") throw new Error("Expected OpenAI-compatible config");
    expect(config.request).not.toHaveProperty("apiKey");
  });

  it("compiles disabled profiles so they remain available for connection testing", () => {
    expect(resolveAIProviderRuntimeConfig({ ...createProfile(), enabled: false })).toMatchObject({ kind: "ready" });
  });

  it("keeps unavailable Raycast models editable and resolves only an installed AI.Model", () => {
    const profile: AIProviderProfile = { ...createProfile(), adapter: "raycast-ai", model: "unavailable" };
    expect(resolveAIProviderRuntimeConfig(profile)).toEqual({
      kind: "issue",
      message: "Choose an available Raycast AI model.",
    });
    expect(profile.model).toBe("unavailable");
    expect(resolveAIProviderRuntimeConfig({ ...profile, model: "test-model" })).toMatchObject({
      kind: "ready",
      config: { adapter: "raycast-ai", model: "test-model" },
    });
    expect(resolveAIProviderRuntimeConfig({ ...profile, model: " " })).toEqual({
      kind: "issue",
      message: "Choose a Raycast AI model.",
    });
  });
});

function resolveConfig(profile: AIProviderProfile) {
  const result = resolveAIProviderRuntimeConfig(profile);
  if (result.kind === "issue") throw new Error(result.message);
  return result.config;
}

function createProfile(): OpenAICompatibleProfile {
  return {
    id: "profile",
    adapter: "openai-compatible",
    name: "Provider",
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode: "dictionary",
    endpoint: "https://example.com/v1",
    model: "model",
    apiKey: "key",
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "prompt",
  };
}
