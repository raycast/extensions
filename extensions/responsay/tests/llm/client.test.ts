import { describe, it, expect, vi } from "vitest";
import {
  chatJSON,
  chatText,
  ChatError,
  type ChatConfig,
} from "../../src/llm/client";

const cfg: ChatConfig = {
  baseURL: "https://api.test/v1",
  apiKey: "sk-x",
  model: "m",
};

function mockFetch(status: number, json: unknown): typeof fetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json),
  })) as unknown as typeof fetch;
}

describe("chatJSON", () => {
  it("POSTs to /chat/completions with auth + json_object and returns content", async () => {
    const f = mockFetch(200, {
      choices: [{ message: { content: '{"ok":true}' } }],
    });
    const out = await chatJSON(cfg, "sys", "usr", f);
    expect(out).toBe('{"ok":true}');
    const [url, init] = (
      f as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe("https://api.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-x",
    );
    expect(init.body).toContain('"json_object"');
  });
  it("sends the raw key under a custom authHeader (MiMo api-key)", async () => {
    const f = mockFetch(200, { choices: [{ message: { content: "{}" } }] });
    await chatJSON({ ...cfg, authHeader: "api-key" }, "s", "u", f);
    const headers = (
      f as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0][1].headers as Record<string, string>;
    expect(headers["api-key"]).toBe("sk-x");
    expect(headers.Authorization).toBeUndefined();
  });
  it("throws ChatError on non-2xx", async () => {
    const f = mockFetch(401, { error: "bad key" });
    await expect(chatJSON(cfg, "s", "u", f)).rejects.toBeInstanceOf(ChatError);
  });
  it("retries without response_format when the first call returns 400", async () => {
    let call = 0;
    const f = vi.fn(async () => {
      call += 1;
      if (call === 1) return { ok: false, status: 400, json: async () => ({}), text: async () => "response_format unsupported" } as any;
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "{\"ok\":true}" } }] }), text: async () => "" } as any;
    }) as unknown as typeof fetch;
    const out = await chatJSON(cfg, "s", "u", f);
    expect(out).toBe("{\"ok\":true}");
    expect((f as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2);
    // second call body must NOT contain response_format
    const secondBody = ((f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[1][1].body) as string;
    expect(secondBody).not.toContain("response_format");
  });
  it("retries without temperature when the model rejects a non-default temperature", async () => {
    let call = 0;
    const f = vi.fn(async () => {
      call += 1;
      if (call === 1)
        return {
          ok: false,
          status: 400,
          json: async () => ({}),
          text: async () =>
            JSON.stringify({
              error: {
                message:
                  "Unsupported value: 'temperature' does not support 0 with this model. Only the default (1) value is supported.",
                param: "temperature",
              },
            }),
        } as any;
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "{\"ok\":true}" } }] }),
        text: async () => "",
      } as any;
    }) as unknown as typeof fetch;
    const out = await chatJSON(cfg, "s", "u", f);
    expect(out).toBe("{\"ok\":true}");
    const calls = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[1][1].body as string).not.toContain("temperature");
  });
  it("retries the TEXT path on a temperature 400 (expression coaching path)", async () => {
    let call = 0;
    const f = vi.fn(async () => {
      call += 1;
      if (call === 1)
        return {
          ok: false,
          status: 400,
          json: async () => ({}),
          text: async () =>
            "error: 'temperature' does not support 0 with this model. Only the default (1) value is supported.",
        } as any;
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "Hello." } }] }),
        text: async () => "",
      } as any;
    }) as unknown as typeof fetch;
    const out = await chatText(cfg, "s", "u", f);
    expect(out).toBe("Hello.");
    const calls = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[1][1].body as string).not.toContain("temperature");
  });
  it("merges extraBody (e.g. enable_thinking) into the request body", async () => {
    const f = mockFetch(200, { choices: [{ message: { content: "{}" } }] });
    await chatJSON({ ...cfg, extraBody: { enable_thinking: false } }, "s", "u", f);
    const body = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body as string;
    expect(body).toContain("\"enable_thinking\":false");
  });
  it("POSTs Anthropic-compatible messages and returns text content", async () => {
    const f = mockFetch(200, {
      content: [{ type: "text", text: "{\"ok\":true}" }],
    });
    const out = await chatJSON(
      {
        ...cfg,
        baseURL: "https://api.deepseek.com/anthropic",
        apiProtocol: "anthropic",
        extraBody: { thinking: { type: "disabled" } },
      },
      "sys",
      "usr",
      f,
    );
    expect(out).toBe("{\"ok\":true}");
    const [url, init] = (
      f as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/anthropic/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["x-api-key"]).toBe("sk-x");
    expect(init.body).toContain("\"thinking\":{\"type\":\"disabled\"}");
  });
});
