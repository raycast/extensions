import { describe, expect, it } from "vitest";
import { groupModels, normalizeModels, resolveDefaultModel } from "./models";

describe("model catalog", () => {
  const catalog = normalizeModels([
    { id: "gpt-5", owned_by: "openai" },
    { id: "claude-sonnet-4", owned_by: "anthropic" },
    { id: "deepseek-chat" },
    { id: "gpt-5", owned_by: "duplicate" },
    { id: "  " },
  ]);

  it("normalizes, deduplicates, and sorts live models", () => {
    expect(catalog.map((model) => model.id)).toEqual([
      "claude-sonnet-4",
      "deepseek-chat",
      "gpt-5",
    ]);
  });

  it("groups models by explicit owner then stable id inference", () => {
    expect(groupModels(catalog).map((group) => group.provider)).toEqual([
      "Anthropic",
      "DeepSeek",
      "OpenAI",
    ]);
  });

  it("uses a valid stored default and rejects a stale one", () => {
    expect(resolveDefaultModel(catalog, "gpt-5")).toBe("gpt-5");
    expect(resolveDefaultModel(catalog, "retired-model")).toBe(
      "claude-sonnet-4",
    );
  });
});
