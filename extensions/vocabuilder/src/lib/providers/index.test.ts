import { describe, expect, it } from "vitest";

import { geminiJsonTransport } from "./gemini";
import { geminiTts } from "./geminiTts";
import {
  jsonTransportFor,
  resolveProviderConfig,
  resolveTtsConfig,
  selectedProvider,
  ttsFor,
  type ProviderPreferences,
} from ".";

describe("selectedProvider on Auto", () => {
  it.each([
    ["sk-ant-api03-abc", "anthropic"],
    ["AIzaSyAbc", "gemini"],
    ["sk-proj-abc", "openai"],
    ["sk-abc", "openai"],
    ["  sk-ant-api03-abc\n", "anthropic"],
  ] as const)("recognizes %j as %s", (key, provider) => {
    expect(selectedProvider({ provider: "auto", apiKey: key })).toBe(provider);
  });

  it.each(["", "   ", "sk_live_abc", "ollama", "aiza-lowercase", "xai-abc"])("leaves %j undetected", (key) => {
    expect(selectedProvider({ provider: "auto", apiKey: key })).toBeUndefined();
  });
});

describe("selectedProvider", () => {
  it("lets an explicit provider win over the key prefix", () => {
    expect(selectedProvider({ provider: "openai-compatible", apiKey: "sk-ant-api03-abc" })).toBe("openai-compatible");
  });

  it("detects from the key on Auto and reports an unrecognized key as undefined instead of throwing", () => {
    expect(selectedProvider({ provider: "auto", apiKey: "sk-ant-api03-abc" })).toBe("anthropic");
    expect(selectedProvider({ provider: "auto", apiKey: "ollama" })).toBeUndefined();
  });
});

describe("resolveProviderConfig", () => {
  const prefs = (overrides: Partial<ProviderPreferences>): ProviderPreferences => ({
    provider: "auto",
    apiKey: "AIzaSyAbc",
    apiBaseUrl: "",
    translationModel: "",
    ...overrides,
  });

  it("detects the provider from the key under auto and applies its default model", () => {
    expect(resolveProviderConfig(prefs({}))).toEqual({
      provider: "gemini",
      apiKey: "AIzaSyAbc",
      model: "gemini-3.5-flash-lite",
      baseUrl: "",
    });
  });

  it("lets an explicit provider override what the key looks like", () => {
    expect(resolveProviderConfig(prefs({ provider: "openai-compatible", translationModel: "llama3" }))).toMatchObject({
      provider: "openai-compatible",
      model: "llama3",
    });
  });

  it("throws provider-undetected under auto when the key prefix is not recognized", () => {
    expect(() => resolveProviderConfig(prefs({ apiKey: "ollama" }))).toThrow(
      expect.objectContaining({
        cause: { domain: "infrastructure", kind: "provider-undetected", surface: "translate", provider: "unknown" },
      }),
    );
  });

  it("sends the default reasoning effort only together with the default model", () => {
    expect(resolveProviderConfig(prefs({ apiKey: "sk-proj-abc" }))).toMatchObject({
      provider: "openai",
      model: "gpt-6-luna",
      reasoningEffort: "none",
    });

    const custom = resolveProviderConfig(prefs({ apiKey: "sk-proj-abc", translationModel: "gpt-custom" }));
    expect(custom.model).toBe("gpt-custom");
    expect(custom).not.toHaveProperty("reasoningEffort");
  });

  it("pairs the default Anthropic model with low effort, and drops it for a custom model", () => {
    expect(resolveProviderConfig(prefs({ apiKey: "sk-ant-api03-abc" }))).toMatchObject({
      provider: "anthropic",
      model: "claude-haiku-5-5",
      reasoningEffort: "low",
    });
    expect(
      resolveProviderConfig(prefs({ apiKey: "sk-ant-api03-abc", translationModel: "claude-sonnet-5-5" })),
    ).not.toHaveProperty("reasoningEffort");
  });

  it("does not invent a reasoning effort for providers whose default has none", () => {
    expect(resolveProviderConfig(prefs({ apiKey: "AIzaSyExample" }))).not.toHaveProperty("reasoningEffort");
  });

  it.each(["", "   "])("throws missing-model for openai-compatible with translationModel %j", (translationModel) => {
    expect(() =>
      resolveProviderConfig(prefs({ provider: "openai-compatible", apiKey: "anything", translationModel })),
    ).toThrow(
      expect.objectContaining({
        cause: {
          domain: "infrastructure",
          kind: "missing-model",
          surface: "translate",
          provider: "openai-compatible",
        },
      }),
    );
  });

  it("trims the key and model but passes the base URL through raw for the transport to validate", () => {
    expect(
      resolveProviderConfig(
        prefs({ apiKey: " AIzaSyAbc \n", translationModel: " gemini-x ", apiBaseUrl: " http://localhost:4000 " }),
      ),
    ).toEqual({ provider: "gemini", apiKey: "AIzaSyAbc", model: "gemini-x", baseUrl: " http://localhost:4000 " });
  });
});

describe("resolveTtsConfig", () => {
  it("uses the provider's default speech model when the preference is empty", () => {
    expect(resolveTtsConfig({ provider: "auto", apiKey: "AIzaSyAbc", ttsModel: "" })).toEqual({
      provider: "gemini",
      apiKey: "AIzaSyAbc",
      model: "gemini-3.1-flash-tts-preview",
      baseUrl: "",
    });
  });

  it("keeps a custom speech model", () => {
    expect(resolveTtsConfig({ provider: "openai", apiKey: "sk-abc", ttsModel: " gpt-custom-tts " })?.model).toBe(
      "gpt-custom-tts",
    );
  });

  it.each(["tts-1", "tts-1-hd", " tts-1 ", " tts-1-hd "])(
    "selects the system voice for the OpenAI model %j that cannot honor language instructions",
    (ttsModel) => {
      expect(resolveTtsConfig({ provider: "auto", apiKey: "sk-abc", ttsModel })).toBeNull();
    },
  );

  it.each(["anthropic", "openai-compatible"] as const)(
    "returns null for %s, which has no speech endpoint",
    (provider) => {
      expect(resolveTtsConfig({ provider, apiKey: "k", ttsModel: "anything" })).toBeNull();
    },
  );

  it("throws provider-undetected on the tts surface", () => {
    expect(() => resolveTtsConfig({ provider: "auto", apiKey: "nope" })).toThrow(
      expect.objectContaining({ cause: expect.objectContaining({ kind: "provider-undetected", surface: "tts" }) }),
    );
  });
});

describe("registry", () => {
  it("routes gemini to the Gemini transport and speech adapter", () => {
    expect(jsonTransportFor("gemini")).toBe(geminiJsonTransport);
    expect(ttsFor("gemini")).toBe(geminiTts);
  });

  it("shares one Chat Completions transport between openai and openai-compatible", () => {
    expect(jsonTransportFor("openai-compatible")).toBe(jsonTransportFor("openai"));
  });

  it.each(["anthropic", "openai-compatible"] as const)("has no speech adapter for %s", (provider) => {
    expect(ttsFor(provider)).toBeNull();
  });
});
