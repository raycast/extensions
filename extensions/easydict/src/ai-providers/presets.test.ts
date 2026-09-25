import { describe, expect, it } from "vitest";

import { getOpenAICompatiblePresetSelection, OPENAI_COMPATIBLE_PRESETS, type OpenAICompatiblePreset } from "./presets";

const presets = OPENAI_COMPATIBLE_PRESETS as Record<string, OpenAICompatiblePreset>;

describe("OpenAI-compatible presets", () => {
  it.each([
    ["opencodeZen", "OpenCode Zen", "https://opencode.ai/zen/v1"],
    ["opencodeGo", "OpenCode Go", "https://opencode.ai/zen/go/v1"],
  ] as const)("keeps the %s OpenCode contract", (presetName, name, endpoint) => {
    expect(presets[presetName]).toMatchObject({
      name,
      endpoint,
      website: "https://opencode.ai",
      model: "deepseek-v4-flash",
      icon: { kind: "favicon" },
      tokenLimitMode: "max-tokens",
      jsonOutputMode: "prompt",
    });
  });

  it("enables native JSON only for presets with documented support", () => {
    expect(
      Object.entries(presets)
        .filter(([, preset]) => preset.jsonOutputMode === "json-object")
        .map(([name]) => name),
    ).toEqual(["openai", "deepseek", "siliconflow", "zhipu", "kimi", "mimo"]);
  });

  it("never carries credentials into a newly selected preset", () => {
    expect(
      Object.keys(OPENAI_COMPATIBLE_PRESETS).map(
        (name) => getOpenAICompatiblePresetSelection(name as keyof typeof OPENAI_COMPATIBLE_PRESETS).apiKey,
      ),
    ).toEqual(Object.keys(OPENAI_COMPATIBLE_PRESETS).map(() => ""));
  });
});
