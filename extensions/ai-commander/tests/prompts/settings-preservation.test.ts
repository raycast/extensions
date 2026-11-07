import { describe, expect, it } from "vitest";
import { parsePersistedState, serializeState } from "../../src/prompts/schema";

describe("settings written by a newer version", () => {
  const document = {
    schemaVersion: 1,
    defaultModel: { future: true },
    favorites: [{ provider: "anthropic", modelId: "claude-haiku-5-5" }, { future: true }],
    openRouterPrivacy: "future-format",
  };

  it("survive a round trip through an older version", () => {
    const parsed = parsePersistedState(document);
    expect(parsed).toBeDefined();
    const saved = JSON.parse(serializeState(parsed!));
    expect(saved.defaultModel).toEqual({ future: true });
    expect(saved.favorites).toContainEqual({ future: true });
    expect(saved.openRouterPrivacy).toBe("future-format");
  });

  it("give way to values the user set since", () => {
    const parsed = parsePersistedState(document)!;
    parsed.state.defaultModel = { ref: { provider: "openai", modelId: "m" }, reasoning: "default" };
    parsed.state.openRouterPrivacy = { mode: "standard", ignoreProviders: [] };
    const saved = JSON.parse(serializeState(parsed));
    expect(saved.defaultModel.ref.modelId).toBe("m");
    expect(saved.openRouterPrivacy.mode).toBe("standard");
  });
});
