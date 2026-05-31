import { describe, expect, it } from "vitest";
import {
  buildCustomChatRequest,
  extractCustomChatText,
} from "../src/lib/custom-llm";

describe("custom LLM requests", () => {
  it("uses Anthropic Messages when the base URL contains /anthropic", () => {
    const { protocol, url, init } = buildCustomChatRequest(
      "https://api.minimaxi.com/anthropic",
      "test-key",
      "MiniMax-M2.7-highspeed",
      "recommend",
    );

    expect(protocol).toBe("anthropic");
    expect(url).toBe("https://api.minimaxi.com/anthropic/v1/messages");
    expect((init.headers as Record<string, string>)["anthropic-version"]).toBe(
      "2023-06-01",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-key",
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "MiniMax-M2.7-highspeed",
      messages: [{ role: "user", content: "recommend" }],
      thinking: { type: "disabled" },
    });
    expect(
      extractCustomChatText(
        { content: [{ type: "text", text: "ok" }] },
        protocol,
      ),
    ).toBe("ok");
  });

  it("keeps OpenAI-compatible URLs on chat/completions", () => {
    const { protocol, url, init } = buildCustomChatRequest(
      "https://api.deepseek.com",
      "test-key",
      "MiniMax-M2.7-highspeed",
      "recommend",
    );

    expect(protocol).toBe("openai");
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "MiniMax-M2.7-highspeed",
      messages: [{ role: "user", content: "recommend" }],
    });
    expect(
      extractCustomChatText(
        { choices: [{ message: { content: "ok" } }] },
        protocol,
      ),
    ).toBe("ok");
  });
});
