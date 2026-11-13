import { describe, expect, it } from "vitest";

import { inferTokenLimitMode } from "./tokenLimit";

describe("AI provider token limit mode", () => {
  it("uses max_completion_tokens only for known OpenAI models on the official endpoint", () => {
    expect(inferTokenLimitMode("https://api.openai.com/v1", "gpt-5-mini")).toBe("max-completion-tokens");
    expect(inferTokenLimitMode("https://proxy.example.com/v1", "gpt-5-mini")).toBe("max-tokens");
    expect(inferTokenLimitMode("https://api.openai.com/v1", "gpt-4.1-mini")).toBe("max-tokens");
  });
});
