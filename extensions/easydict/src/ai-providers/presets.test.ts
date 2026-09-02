import { describe, expect, it } from "vitest";

import { OPENAI_COMPATIBLE_PRESETS, type OpenAICompatiblePreset } from "./presets";

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
    });
  });
});
