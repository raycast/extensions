import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WordResponseJsonSchema } from "../types";
import { openAiJsonTransport } from "./openai";
import type { ProviderConfig } from "./types";

const OPENAI: ProviderConfig = {
  provider: "openai",
  apiKey: "sk-test",
  model: "gpt-5.6-luna",
  baseUrl: "",
  reasoningEffort: "none",
};
const COMPATIBLE: ProviderConfig = {
  provider: "openai-compatible",
  apiKey: "local-key",
  model: "llama3",
  baseUrl: "http://localhost:11434",
};
const SCHEMA = {
  type: "object",
  properties: { translation: { type: "string" }, note: { type: "string", enum: ["a", "b"] } },
  required: ["translation"],
  additionalProperties: false,
  propertyOrdering: ["translation", "note"],
};

type Choice = { content?: string | null; refusal?: string | null; finish_reason?: string | null };

function completion({ content = '{"translation":"x"}', refusal = null, finish_reason = "stop" }: Choice = {}) {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: "assistant", content, refusal }, finish_reason }] }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function sentBody(): Record<string, unknown> {
  return JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
}

function sentUrl(): string {
  return vi.mocked(fetch).mock.calls[0][0] as string;
}

describe("openAiJsonTransport", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => completion()),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("posts a strict json_schema chat completion to OpenAI with a bearer key", async () => {
    await openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA });

    expect(sentUrl()).toBe("https://api.openai.com/v1/chat/completions");
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer sk-test",
    });
    expect(sentBody()).toEqual({
      model: "gpt-5.6-luna",
      messages: [{ role: "user", content: "hi" }],
      reasoning_effort: "none",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              translation: { type: "string" },
              note: { type: ["string", "null"], enum: ["a", "b", null] },
            },
            required: ["translation", "note"],
            additionalProperties: false,
          },
        },
      },
    });
  });

  it("omits reasoning_effort for OpenAI when the config has none", async () => {
    await openAiJsonTransport({ ...OPENAI, reasoningEffort: undefined }, { prompt: "hi", schema: SCHEMA });
    expect(sentBody()).not.toHaveProperty("reasoning_effort");
  });

  it("sends a compatible server the schema non-strict, unrewritten apart from propertyOrdering", async () => {
    await openAiJsonTransport(COMPATIBLE, { prompt: "hi", schema: SCHEMA });

    expect(sentBody().response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "response",
        strict: false,
        schema: {
          type: "object",
          properties: { translation: { type: "string" }, note: { type: "string", enum: ["a", "b"] } },
          required: ["translation"],
          additionalProperties: false,
        },
      },
    });
  });

  it("strips nested propertyOrdering from the real word schema for compatible servers", async () => {
    await openAiJsonTransport(COMPATIBLE, { prompt: "hi", schema: WordResponseJsonSchema });
    const schema = JSON.stringify(sentBody().response_format);
    expect(schema).not.toContain("propertyOrdering");
    expect(schema).not.toContain("null");
  });

  it("never sends reasoning_effort to a compatible server", async () => {
    await openAiJsonTransport({ ...COMPATIBLE, reasoningEffort: "low" }, { prompt: "hi", schema: SCHEMA });
    expect(sentBody()).not.toHaveProperty("reasoning_effort");
  });

  it("trims the model ID", async () => {
    await openAiJsonTransport({ ...COMPATIBLE, model: " llama3 " }, { prompt: "hi", schema: SCHEMA });
    expect(sentBody().model).toBe("llama3");
  });

  it.each([
    ["http://localhost:11434", "http://localhost:11434/v1/chat/completions"],
    ["http://localhost:11434/", "http://localhost:11434/v1/chat/completions"],
    ["https://openrouter.ai/api/v1", "https://openrouter.ai/api/v1/chat/completions"],
    [
      "https://generativelanguage.googleapis.com/v1beta/openai/",
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    ],
  ])("resolves the compatible server URL %s", async (baseUrl, expected) => {
    await openAiJsonTransport({ ...COMPATIBLE, baseUrl }, { prompt: "hi", schema: SCHEMA });
    expect(sentUrl()).toBe(expected);
  });

  it("uses a custom base URL for OpenAI too", async () => {
    await openAiJsonTransport({ ...OPENAI, baseUrl: "https://gw.corp/openai/v1" }, { prompt: "hi", schema: SCHEMA });
    expect(sentUrl()).toBe("https://gw.corp/openai/v1/chat/completions");
  });

  it.each([
    ["an empty server URL", ""],
    ["plaintext http to a remote host", "http://gw.corp/v1"],
    ["credentials in the URL", "https://user:pass@gw.corp/v1"],
  ])("rejects %s before issuing a request", async (_label, baseUrl) => {
    await expect(
      openAiJsonTransport({ ...COMPATIBLE, baseUrl }, { prompt: "hi", schema: SCHEMA }),
    ).rejects.toMatchObject({
      cause: { domain: "infrastructure", kind: "invalid-base-url", provider: "openai-compatible" },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns the answer with code fences stripped", async () => {
    vi.mocked(fetch).mockResolvedValue(completion({ content: '```json\n{"translation":"x"}\n```' }));
    await expect(openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA })).resolves.toBe('{"translation":"x"}');
  });

  it("drops the null placeholders strict mode fills optional fields with", async () => {
    vi.mocked(fetch).mockResolvedValue(completion({ content: '{"translation":"x","note":null}' }));
    await expect(openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA })).resolves.toBe('{"translation":"x"}');
  });

  it("passes non-JSON text through for the shared pipeline to reject", async () => {
    vi.mocked(fetch).mockResolvedValue(completion({ content: "Sorry, I can't." }));
    await expect(openAiJsonTransport(COMPATIBLE, { prompt: "hi", schema: SCHEMA })).resolves.toBe("Sorry, I can't.");
  });

  it.each<[string, Choice, string]>([
    ["a refusal", { content: null, refusal: "I can't help with that." }, "invalid-response"],
    ["a truncated answer", { content: '{"transl', finish_reason: "length" }, "invalid-response"],
    ["null content", { content: null }, "empty-response"],
    ["empty content", { content: "  " }, "empty-response"],
  ])("maps %s to %s", async (_label, choice, kind) => {
    vi.mocked(fetch).mockResolvedValue(completion(choice));
    await expect(openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA })).rejects.toMatchObject({
      cause: { domain: "infrastructure", kind, surface: "translate", provider: "openai" },
    });
  });

  it("maps a response without choices to empty-response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    await expect(openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA })).rejects.toMatchObject({
      cause: { kind: "empty-response" },
    });
  });

  it("maps an off-schema envelope to invalid-response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ output: "x" }), { status: 200 }));
    await expect(openAiJsonTransport(COMPATIBLE, { prompt: "hi", schema: SCHEMA })).rejects.toMatchObject({
      cause: { kind: "invalid-response", provider: "openai-compatible" },
    });
  });

  it("maps 401 to invalid-api-key without retrying", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA })).rejects.toMatchObject({
      cause: { kind: "invalid-api-key", provider: "openai" },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("names a custom server's host when it returns 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Not Found", { status: 404 }));
    await expect(
      openAiJsonTransport({ ...COMPATIBLE, baseUrl: "https://openrouter.ai/api/v1" }, { prompt: "hi", schema: SCHEMA }),
    ).rejects.toMatchObject({
      cause: { kind: "model-not-found", model: "llama3", endpointHost: "openrouter.ai" },
    });
  });

  it("omits the endpoint host on a 404 from the default OpenAI server", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Not Found", { status: 404 }));
    const err = await openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA }).catch((e: unknown) => e);
    expect(err).toMatchObject({ cause: { kind: "model-not-found", model: "gpt-5.6-luna" } });
    expect((err as Error & { cause: { endpointHost?: string } }).cause.endpointHost).toBeUndefined();
  });

  it("retries a 429 and records Retry-After once retries run out", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(
      async () => new Response('{"error":{"message":"Rate limit"}}', { status: 429, headers: { "retry-after": "7" } }),
    );
    const result = openAiJsonTransport(OPENAI, { prompt: "hi", schema: SCHEMA }).catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    expect(await result).toMatchObject({
      cause: { kind: "request-failed", status: 429, provider: "openai", rateLimit: { retryDelay: "7s" } },
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("recovers when a retried 503 is followed by success", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(completion());
    const result = openAiJsonTransport(COMPATIBLE, { prompt: "hi", schema: SCHEMA });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe('{"translation":"x"}');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("maps a fetch TypeError to network-offline", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    const result = openAiJsonTransport(COMPATIBLE, { prompt: "hi", schema: SCHEMA }).catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    expect(await result).toMatchObject({
      cause: { domain: "infrastructure", kind: "network-offline", provider: "openai-compatible" },
    });
  });
});
