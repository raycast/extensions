import { describe, expect, it } from "vitest";
import { buildRequest, parseResponse } from "./providers";

describe("buildRequest", () => {
  it("builds an OpenAI chat completions request", () => {
    const { url, init } = buildRequest("openai", "sk-test-key", "hello there");
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string);

    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(headers.Authorization).toBe("Bearer sk-test-key");
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[1]).toEqual({ role: "user", content: "hello there" });
  });

  it("builds an OpenRouter chat completions request", () => {
    const { url, init } = buildRequest(
      "openrouter",
      "or-test-key",
      "hello there",
    );
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string);

    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(headers.Authorization).toBe("Bearer or-test-key");
    expect(body.model).toBe("openai/gpt-4o-mini");
  });

  it("builds an Anthropic messages request", () => {
    const { url, init } = buildRequest(
      "anthropic",
      "anthropic-test-key",
      "hello there",
    );
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string);

    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers["x-api-key"]).toBe("anthropic-test-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(body.model).toBe("claude-3-5-haiku-20241022");
    expect(body.max_tokens).toBe(4096);
    expect(body.messages).toEqual([{ role: "user", content: "hello there" }]);
  });
});

describe("parseResponse", () => {
  it("extracts text from an OpenAI-style response", () => {
    const json = { choices: [{ message: { content: "polished text" } }] };
    expect(parseResponse("openai", json)).toBe("polished text");
  });

  it("extracts text from an OpenRouter response (OpenAI-style)", () => {
    const json = { choices: [{ message: { content: "polished text" } }] };
    expect(parseResponse("openrouter", json)).toBe("polished text");
  });

  it("extracts text from an Anthropic response", () => {
    const json = { content: [{ type: "text", text: "polished text" }] };
    expect(parseResponse("anthropic", json)).toBe("polished text");
  });

  it("throws if the OpenAI-style response has no content", () => {
    expect(() => parseResponse("openai", { choices: [] })).toThrow();
  });

  it("throws if the Anthropic response has no text block", () => {
    expect(() => parseResponse("anthropic", { content: [] })).toThrow();
  });
});
