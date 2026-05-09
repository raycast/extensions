import { describe, expect, it } from "vitest";
import {
  normalizeMessageContent,
  type ChatCompletionRequest,
} from "../src/daemon/openai-codex-client.js";

describe("openai codex client helpers", () => {
  it("normalizes Raycast/OpenAI text content arrays", () => {
    expect(
      normalizeMessageContent([
        { type: "text", text: "hello" },
        { type: "image_url" },
        { type: "text", text: "world" },
      ]),
    ).toBe("hello\nworld");
  });

  it("accepts OpenAI-compatible reasoning effort shapes", () => {
    const topLevel: ChatCompletionRequest = {
      model: "gpt-5.5",
      messages: [{ role: "user", content: "hi" }],
      reasoning_effort: "high",
    };
    const nested: ChatCompletionRequest = {
      model: "gpt-5.5",
      messages: [{ role: "user", content: "hi" }],
      reasoning: { effort: "xhigh" },
    };

    expect(topLevel.reasoning_effort).toBe("high");
    expect(nested.reasoning?.effort).toBe("xhigh");
  });
});
