import { describe, expect, it } from "vitest";
import {
  buildCustomChatRequest,
  extractCustomChatText,
} from "../src/lib/custom-llm";

describe("custom LLM requests", () => {
  it("uses Anthropic Messages when the base URL contains /anthropic", () => {
    const { protocol, url, init } = buildCustomChatRequest(
      "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic",
      "test-key",
      "qwen3.6-flash",
      "recommend",
    );

    expect(protocol).toBe("anthropic");
    expect(url).toBe(
      "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic/v1/messages",
    );
    expect((init.headers as Record<string, string>)["anthropic-version"]).toBe(
      "2023-06-01",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-key",
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "qwen3.6-flash",
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
      "https://api.openai.test/v1",
      "test-key",
      "gpt-4o-mini",
      "recommend",
    );

    expect(protocol).toBe("openai");
    expect(url).toBe("https://api.openai.test/v1/chat/completions");
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "gpt-4o-mini",
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
