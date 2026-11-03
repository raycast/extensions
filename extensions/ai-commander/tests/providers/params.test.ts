import { describe, expect, it } from "vitest";
import { ProviderError } from "../../src/core/errors";
import type { CatalogEntry, ModelRef, ProviderId } from "../../src/core/types";
import {
  CREATIVITY_TEMPERATURES,
  reasoningParams,
  resolveMaxOutputTokens,
  resolveOpenRouterProvider,
  resolveTemperature,
  supportedReasoning,
  supportsCreativity,
} from "../../src/providers/params";

const ref = (provider: ProviderId, modelId: string): ModelRef => ({ provider, modelId });
const entry = (model: ModelRef, fields: Partial<CatalogEntry> = {}): CatalogEntry => ({
  ref: model,
  displayName: model.modelId,
  family: "Test",
  ...fields,
});

describe("reasoningParams", () => {
  it("sends nothing for default", () => {
    for (const style of ["anthropic", "openai", "gemini", "openrouter"] as const) {
      expect(reasoningParams(style, "default")).toEqual({});
    }
  });

  it("uses each provider's parameter", () => {
    expect(reasoningParams("anthropic", "low")).toEqual({ output_config: { effort: "low" } });
    expect(reasoningParams("openai", "high")).toEqual({ reasoning_effort: "high" });
    expect(reasoningParams("gemini", "medium")).toEqual({ reasoning_effort: "medium" });
    expect(reasoningParams("openrouter", "low")).toEqual({ reasoning: { effort: "low" } });
  });

  it("translates off to none where it exists", () => {
    expect(reasoningParams("openai", "off")).toEqual({ reasoning_effort: "none" });
    expect(reasoningParams("gemini", "off")).toEqual({ reasoning_effort: "none" });
    expect(reasoningParams("openrouter", "off")).toEqual({ reasoning: { effort: "none" } });
  });

  it("rejects off for Anthropic instead of ignoring it", () => {
    expect(() => reasoningParams("anthropic", "off")).toThrow(ProviderError);
  });
});

describe("supportedReasoning", () => {
  it("keeps the rules of the direct provider for a model that runs through OpenRouter", () => {
    const levels = ["default", "low", "medium", "high"];
    expect(supportedReasoning(ref("openrouter", "anthropic/claude-opus-5.5"))).toEqual(levels);
    expect(supportedReasoning(ref("openrouter", "openai/gpt-6.1-sol"))).toEqual(levels);
    expect(supportedReasoning(ref("openrouter", "google/gemini-3.8-flash"))).toEqual(levels);
    expect(supportedReasoning(ref("openrouter", "openai/gpt-oss-120b"))).toContain("off");
    expect(supportedReasoning(ref("openrouter", "deepseek/deepseek-v4.1-flash"))).toContain("off");
  });

  it("never offers off for Anthropic", () => {
    expect(supportedReasoning(ref("anthropic", "claude-opus-5-5"))).toEqual(["default", "low", "medium", "high"]);
  });

  it("follows the catalog when a model has no effort support", () => {
    const model = ref("anthropic", "claude-haiku-4-5");
    expect(supportedReasoning(model, entry(model, { supportsReasoning: false }))).toEqual(["default"]);
    const routed = ref("openrouter", "x/y");
    expect(supportedReasoning(routed, entry(routed, { supportsReasoning: false }))).toEqual(["default"]);
  });

  it.each([
    ["gpt-6-astra", false],
    ["gpt-6.1-sol", false],
    ["gpt-6.1-terra", true],
    ["gpt-6-luna", true],
    ["gpt-5.6-sol", true],
    ["gpt-5.5", true],
    ["gpt-5", false],
    ["o3", false],
    ["gpt-99-new", false],
  ])("openai %s has off: %s", (modelId, hasOff) => {
    expect(supportedReasoning(ref("openai", modelId)).includes("off")).toBe(hasOff);
  });

  it("offers no reasoning on legacy OpenAI models", () => {
    expect(supportedReasoning(ref("openai", "gpt-4o"))).toEqual(["default"]);
  });

  it.each([
    ["gemini-2.5-flash", true],
    ["gemini-2.5-flash-lite", true],
    ["gemini-2.5-pro", false],
    ["gemini-3.8-flash", false],
    ["gemini-4-argon", false],
  ])("gemini %s has off: %s", (modelId, hasOff) => {
    expect(supportedReasoning(ref("gemini", modelId)).includes("off")).toBe(hasOff);
  });

  it("limits gemini-3-pro-preview to its documented levels", () => {
    expect(supportedReasoning(ref("gemini", "gemini-3-pro-preview"))).toEqual(["default", "low", "high"]);
  });
});

describe("supportsCreativity", () => {
  it("is off for every Anthropic model", () => {
    expect(supportsCreativity(ref("anthropic", "claude-opus-5-5"))).toBe(false);
  });

  it("follows supported_parameters on OpenRouter", () => {
    const model = ref("openrouter", "x/y");
    expect(supportsCreativity(model, entry(model, { supportsTemperature: true }))).toBe(true);
    expect(supportsCreativity(model, entry(model, { supportsTemperature: false }))).toBe(false);
    expect(supportsCreativity(model)).toBe(true);
  });

  it("never allows it where a model always reasons", () => {
    expect(supportsCreativity(ref("openai", "gpt-6-astra"), undefined, "off")).toBe(false);
    expect(supportsCreativity(ref("openai", "gpt-5"))).toBe(false);
  });

  it("allows it on GPT reasoning models only without reasoning", () => {
    const model = ref("openai", "gpt-6.1-terra");
    expect(supportsCreativity(model)).toBe(false);
    expect(supportsCreativity(model, undefined, "low")).toBe(false);
    expect(supportsCreativity(model, undefined, "off")).toBe(true);
  });

  it("treats default as no reasoning where the model defaults to none", () => {
    const model = ref("openai", "gpt-5.4");
    expect(supportsCreativity(model)).toBe(true);
    expect(supportsCreativity(model, undefined, "low")).toBe(false);
  });

  it("stays available when support is unknown", () => {
    expect(supportsCreativity(ref("openai", "gpt-4o"))).toBe(true);
    expect(supportsCreativity(ref("openai", "brand-new"))).toBe(true);
    expect(supportsCreativity(ref("gemini", "gemini-3.8-flash"))).toBe(true);
  });
});

describe("resolveTemperature", () => {
  it("sends nothing for default", () => {
    expect(resolveTemperature("default", ref("openai", "gpt-4o"))).toBeUndefined();
  });

  it("sends nothing for Anthropic", () => {
    expect(resolveTemperature("high", ref("anthropic", "claude-opus-5-5"))).toBeUndefined();
  });

  it("sends nothing when the model rejects it in this combination", () => {
    expect(resolveTemperature("low", ref("openai", "gpt-6.1-terra"))).toBeUndefined();
    expect(resolveTemperature("low", ref("openai", "gpt-6.1-terra"), undefined, "off")).toBe(0.3);
  });

  it("maps levels per provider", () => {
    expect(resolveTemperature("none", ref("gemini", "gemini-3.8-flash"))).toBe(0);
    expect(resolveTemperature("maximum", ref("openrouter", "x/y"))).toBe(1.5);
  });

  it("keeps every level inside the documented range and rising", () => {
    for (const table of [
      CREATIVITY_TEMPERATURES.openai,
      CREATIVITY_TEMPERATURES.gemini,
      CREATIVITY_TEMPERATURES.openrouter,
    ]) {
      const values = Object.values(table ?? {});
      expect(values).toHaveLength(5);
      expect([...values].sort((a, b) => a - b)).toEqual(values);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...values)).toBeLessThanOrEqual(2);
    }
  });
});

describe("resolveMaxOutputTokens", () => {
  const model = ref("anthropic", "claude-opus-5-5");

  it("stays undefined for an unknown limit, honors a lower one, and caps a higher one", () => {
    expect(resolveMaxOutputTokens()).toBeUndefined();
    expect(resolveMaxOutputTokens(entry(model))).toBeUndefined();
    expect(resolveMaxOutputTokens(entry(model, { maxOutputTokens: 8192 }))).toBe(8192);
    expect(resolveMaxOutputTokens(entry(model, { maxOutputTokens: 128_000 }))).toBe(64_000);
  });
});

describe("resolveOpenRouterProvider", () => {
  it("is empty in standard mode", () => {
    expect(resolveOpenRouterProvider({ mode: "standard", ignoreProviders: [] })).toBeUndefined();
  });

  it("sets zdr and data_collection in strict mode", () => {
    expect(resolveOpenRouterProvider({ mode: "strict", ignoreProviders: [] })).toEqual({
      zdr: true,
      data_collection: "deny",
    });
  });

  it("lets a prompt tighten the mode and passes ignored hosts", () => {
    expect(resolveOpenRouterProvider({ mode: "standard", ignoreProviders: ["deepseek"] }, "strict")).toEqual({
      zdr: true,
      data_collection: "deny",
      ignore: ["deepseek"],
    });
  });
});
