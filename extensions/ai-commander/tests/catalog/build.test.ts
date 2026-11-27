import { describe, expect, it } from "vitest";
import { buildCatalog, findEntry, groupByFamily, isModelMissing, parseCustomModel } from "../../src/catalog/build";
import { cleanDisplayName, deriveFamily } from "../../src/catalog/families";
import { isModelIncluded } from "../../src/catalog/filters";
import type { RawModel } from "../../src/core/types";

const ids = (list: { ref: { modelId: string } }[]) => list.map((e) => e.ref.modelId);
const raw = (...modelIds: string[]): RawModel[] => modelIds.map((id) => ({ id }));

describe("exclusions", () => {
  it("drops non-text OpenAI models", () => {
    const out = buildCatalog({
      openai: raw(
        "gpt-4o",
        "text-embedding-3-small",
        "tts-1",
        "whisper-1",
        "dall-e-3",
        "gpt-image-1",
        "gpt-4o-realtime-preview",
        "gpt-4o-audio-preview",
        "gpt-4o-transcribe",
        "omni-moderation-latest",
        "gpt-5-codex",
        "gpt-4o-mini",
      ),
    });
    expect(ids(out)).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });

  it("drops non-text Gemini models and keeps text ones", () => {
    const out = buildCatalog({
      gemini: raw(
        "models/gemini-2.5-pro",
        "models/text-embedding-004",
        "models/imagen-4.0",
        "models/gemini-live-2.5-flash",
        "models/veo-3",
        "models/gemini-2.5-flash-preview-tts",
        "models/aqa",
      ),
    });
    expect(ids(out)).toEqual(["models/gemini-2.5-pro"]);
  });

  it("hides OpenRouter models of directly offered vendors, including ~ aliases and :batch", () => {
    expect(isModelIncluded("openrouter", "anthropic/claude-opus-5")).toBe(true);
    expect(isModelIncluded("openrouter", "openai/gpt-5.5")).toBe(true);
    expect(isModelIncluded("openrouter", "google/gemini-3.5-flash")).toBe(true);
    expect(isModelIncluded("openrouter", "google/gemini-3-pro-image")).toBe(false);
    expect(isModelIncluded("openrouter", "~anthropic/claude-opus-latest")).toBe(false);
    expect(isModelIncluded("openrouter", "deepseek/deepseek-v4.1-flash:batch")).toBe(false);
    expect(isModelIncluded("openrouter", "deepseek/deepseek-v4.1-flash")).toBe(true);
    expect(isModelIncluded("openrouter", "meta/muse-spark-1.3")).toBe(true);
  });

  it("allows open models of excluded vendors", () => {
    expect(isModelIncluded("openrouter", "openai/gpt-oss-120b")).toBe(true);
    expect(isModelIncluded("openrouter", "openai/gpt-oss-safeguard-20b")).toBe(true);
    expect(isModelIncluded("openrouter", "google/gemma-4-31b-it:free")).toBe(true);
    expect(isModelIncluded("openrouter", "openai/gpt-oss-120b:batch")).toBe(false);
  });
});

describe("families and names", () => {
  it("maps direct providers", () => {
    expect(deriveFamily("anthropic", "claude-sonnet-5")).toBe("Claude");
    expect(deriveFamily("openai", "gpt-4o")).toBe("GPT");
    expect(deriveFamily("gemini", "models/gemini-2.5-pro")).toBe("Gemini");
  });

  it("maps known OpenRouter vendors and prettifies unknown ones", () => {
    expect(deriveFamily("openrouter", "deepseek/x")).toBe("DeepSeek");
    expect(deriveFamily("openrouter", "mistralai/x")).toBe("Mistral");
    expect(deriveFamily("openrouter", "x-ai/grok-4.7")).toBe("Grok");
    expect(deriveFamily("openrouter", "z-ai/glm-5.3")).toBe("GLM");
    expect(deriveFamily("openrouter", "moonshotai/kimi-k3.1-pro")).toBe("Kimi");
    expect(deriveFamily("openrouter", "qwen/qwen3")).toBe("Qwen");
    expect(deriveFamily("openrouter", "meta/muse-spark-1.3")).toBe("Muse");
    expect(deriveFamily("openrouter", "meta-llama/llama-4")).toBe("Meta Llama");
    expect(deriveFamily("openrouter", "ibm-granite/granite")).toBe("IBM Granite");
    expect(deriveFamily("openrouter", "~x-ai/grok-latest")).toBe("Grok");
    expect(deriveFamily("openrouter", "openai/gpt-oss-120b")).toBe("OpenAI");
  });

  it("cleans display names", () => {
    expect(cleanDisplayName("deepseek/a", "DeepSeek: DeepSeek V4.1 Flash")).toBe("DeepSeek V4.1 Flash");
    expect(cleanDisplayName("google/gemma-4-26b-a4b-it:free", "Google: Gemma 4 26B A4B  (free)")).toBe(
      "Gemma 4 26B A4B (free)",
    );
    expect(cleanDisplayName("claude-sonnet-5", "Claude Sonnet 5")).toBe("Claude Sonnet 5");
    expect(cleanDisplayName("models/gemini-2.5-pro")).toBe("gemini-2.5-pro");
    expect(cleanDisplayName("qwen/qwen3-max")).toBe("qwen3-max");
  });
});

describe("buildCatalog", () => {
  it("dedupes repeated IDs and keeps one entry per provider and model", () => {
    const out = buildCatalog({
      openai: [
        { id: "gpt-4o", name: "A" },
        { id: "gpt-4o", name: "B" },
      ],
      openrouter: raw("qwen/q", "qwen/q"),
    });
    expect(out).toHaveLength(2);
    expect(findEntry(out, { provider: "openai", modelId: "gpt-4o" })?.displayName).toBe("A");
  });

  it("sorts by family order, then name numerically, independent of input order", () => {
    const a = buildCatalog({
      openrouter: [
        { id: "zeta/m" },
        { id: "qwen/q10", name: "Qwen: Q10" },
        { id: "qwen/q2", name: "Qwen: Q2" },
        { id: "deepseek/d" },
      ],
      gemini: raw("models/gemini-x"),
      anthropic: raw("claude-a"),
      openai: raw("gpt-a"),
    });
    const b = buildCatalog({
      openai: raw("gpt-a"),
      anthropic: raw("claude-a"),
      gemini: raw("models/gemini-x"),
      openrouter: [
        { id: "deepseek/d" },
        { id: "qwen/q2", name: "Qwen: Q2" },
        { id: "qwen/q10", name: "Qwen: Q10" },
        { id: "zeta/m" },
      ],
    });
    expect(ids(a)).toEqual(["claude-a", "gpt-a", "models/gemini-x", "deepseek/d", "qwen/q2", "qwen/q10", "zeta/m"]);
    expect(b).toEqual(a);
  });

  it("keeps previous entries of providers not in the new listing and replaces the others", () => {
    const first = buildCatalog({ openai: raw("gpt-old"), anthropic: raw("claude-a") });
    const next = buildCatalog({ openai: raw("gpt-new") }, first);
    expect(ids(next)).toEqual(["claude-a", "gpt-new"]);
  });

  it("copies capabilities and pricing", () => {
    const [entry] = buildCatalog({
      openrouter: [
        {
          id: "qwen/q",
          supportsReasoning: true,
          supportsTemperature: false,
          contextLength: 10,
          maxOutputTokens: 5,
          pricing: { inputPerMTok: 1, outputPerMTok: 2 },
        },
      ],
    });
    expect(entry).toMatchObject({
      supportsReasoning: true,
      supportsTemperature: false,
      contextLength: 10,
      maxOutputTokens: 5,
      pricing: { inputPerMTok: 1, outputPerMTok: 2 },
    });
  });
});

describe("groupByFamily", () => {
  const entries = buildCatalog({
    anthropic: raw("claude-a", "claude-b"),
    openai: raw("gpt-a"),
    openrouter: raw("qwen/q", "zeta/m"),
  });

  it("puts favorites first, in favorite order, and removes them from their family", () => {
    const groups = groupByFamily(entries, [
      { provider: "openrouter", modelId: "qwen/q" },
      { provider: "anthropic", modelId: "claude-b" },
      { provider: "openai", modelId: "vanished" },
    ]);
    expect(groups.map((g) => g.title)).toEqual(["Favorites", "Claude", "GPT", "Zeta"]);
    expect(ids(groups[0]?.entries ?? [])).toEqual(["qwen/q", "claude-b"]);
    expect(ids(groups[1]?.entries ?? [])).toEqual(["claude-a"]);
  });

  it("omits the favorites section when empty", () => {
    expect(groupByFamily(entries, []).map((g) => g.title)).toEqual(["Claude", "GPT", "Qwen", "Zeta"]);
  });
});

describe("custom and missing models", () => {
  it("parses provider:model-id", () => {
    expect(parseCustomModel(" openrouter:deepseek/x:free ")).toEqual({
      provider: "openrouter",
      modelId: "deepseek/x:free",
    });
    expect(parseCustomModel("OpenAI:gpt-4o")).toEqual({ provider: "openai", modelId: "gpt-4o" });
    expect(parseCustomModel("gpt-4o")).toBeUndefined();
    expect(parseCustomModel("acme:model")).toBeUndefined();
    expect(parseCustomModel("openai:")).toBeUndefined();
    expect(parseCustomModel("openai:a b")).toBeUndefined();
  });

  it("detects missing models only when the provider is loaded", () => {
    const entries = buildCatalog({ openai: raw("gpt-a") });
    expect(isModelMissing(entries, { provider: "openai", modelId: "gpt-gone" })).toBe(true);
    expect(isModelMissing(entries, { provider: "openai", modelId: "gpt-a" })).toBe(false);
    expect(isModelMissing(entries, { provider: "anthropic", modelId: "claude-a" })).toBe(false);
  });
});
