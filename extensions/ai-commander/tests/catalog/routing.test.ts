import { describe, expect, it } from "vitest";
import { deriveFamily } from "../../src/catalog/families";
import { routeModel, visibleEntries } from "../../src/catalog/routing";
import type { CatalogEntry, ModelRef } from "../../src/core/types";

const entry = (ref: ModelRef): CatalogEntry => ({ ref, displayName: ref.modelId, family: "F" });
const direct: ModelRef = { provider: "anthropic", modelId: "claude-sonnet-5-5" };
const viaRouter: ModelRef = { provider: "openrouter", modelId: "anthropic/claude-sonnet-5.5" };

describe("routeModel", () => {
  it("prefers the direct route when its key exists", () => {
    expect(routeModel(viaRouter, { anthropic: "k", openrouter: "k" })).toEqual(direct);
    expect(routeModel(direct, { anthropic: "k", openrouter: "k" })).toEqual(direct);
  });

  it("falls back to OpenRouter without a direct key", () => {
    expect(routeModel(direct, { openrouter: "k" })).toEqual(viaRouter);
    expect(routeModel({ provider: "openai", modelId: "gpt-6-luna" }, { openrouter: "k" })).toEqual({
      provider: "openrouter",
      modelId: "openai/gpt-6-luna",
    });
    expect(routeModel({ provider: "gemini", modelId: "models/gemini-3.8-flash" }, { openrouter: "k" })).toEqual({
      provider: "openrouter",
      modelId: "google/gemini-3.8-flash",
    });
  });

  it("keeps the ref when no route has a key, so the error names the missing key", () => {
    expect(routeModel(direct, {})).toEqual(direct);
  });

  it("maps whole versions and leaves other vendors alone", () => {
    expect(routeModel({ provider: "anthropic", modelId: "claude-opus-5" }, { openrouter: "k" }).modelId).toBe(
      "anthropic/claude-opus-5",
    );
    const other: ModelRef = { provider: "openrouter", modelId: "deepseek/deepseek-v4.1-flash" };
    expect(routeModel(other, { anthropic: "k", openrouter: "k" })).toEqual(other);
  });

  it("keeps open-weight models on OpenRouter", () => {
    const open: ModelRef = { provider: "openrouter", modelId: "openai/gpt-oss-120b" };
    expect(routeModel(open, { openai: "k", openrouter: "k" })).toEqual(open);
  });
});

describe("visibleEntries", () => {
  const entries = [
    entry(direct),
    entry(viaRouter),
    entry({ provider: "openrouter", modelId: "google/gemini-3.8-flash" }),
  ];

  it("lists a family once per key", () => {
    const visible = visibleEntries(entries, { anthropic: "k", openrouter: "k" }).map((item) => item.ref.modelId);
    expect(visible).toEqual(["claude-sonnet-5-5", "google/gemini-3.8-flash"]);
  });
});

describe("deriveFamily", () => {
  it("keeps the family across routes", () => {
    expect(deriveFamily("openrouter", "anthropic/claude-opus-5")).toBe("Claude");
    expect(deriveFamily("openrouter", "openai/gpt-6-luna")).toBe("GPT");
    expect(deriveFamily("openrouter", "google/gemini-3.8-flash")).toBe("Gemini");
    expect(deriveFamily("openrouter", "openai/gpt-oss-120b")).toBe("OpenAI");
  });
});
