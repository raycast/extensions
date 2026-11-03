import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "../../src/core/errors";
import { anthropicAdapter } from "../../src/providers/anthropic";
import { openAiCompatibleAdapter } from "../../src/providers/openai-compatible";
import { ANTHROPIC_VERSION, PROFILES } from "../../src/providers/profiles";
import {
  chatRequest,
  collect,
  collectUntilError,
  fixture,
  jsonFixture,
  jsonResponse,
  sseResponse,
  stubFetch,
  textOf,
} from "./helpers";

const TEST_KEY = "test-key-not-real";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("anthropic stream", () => {
  it("sends the documented request", async () => {
    const calls = stubFetch(sseResponse(fixture("anthropic-stream.sse")));
    const req = chatRequest({ model: "claude-opus-5-5", reasoning: "high", temperature: 0.5, maxOutputTokens: 4096 });
    await collect(anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, req));

    const call = calls[0];
    expect(call?.url).toBe("https://api.anthropic.com/v1/messages");
    expect(call?.method).toBe("POST");
    expect(call?.headers).toMatchObject({ "x-api-key": TEST_KEY, "anthropic-version": ANTHROPIC_VERSION });
    expect(ANTHROPIC_VERSION).toBe("2026-10-21");
    expect(call?.body).toEqual({
      model: "claude-opus-5-5",
      max_tokens: 4096,
      stream: true,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      output_config: { effort: "high" },
    });
  });

  it("sends no reasoning field by default and never temperature, thinking or fallbacks", async () => {
    const calls = stubFetch(sseResponse(fixture("anthropic-stream.sse")));
    await collect(anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, chatRequest({ temperature: 1 })));
    for (const field of ["output_config", "temperature", "thinking", "fallbacks", "top_p", "top_k"]) {
      expect(calls[0]?.body).not.toHaveProperty(field);
    }
  });

  it("emits only text deltas and reports usage", async () => {
    stubFetch(sseResponse(fixture("anthropic-stream.sse"), 7));
    const events = await collect(anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, chatRequest()));
    expect(textOf(events)).toBe("Hello wörld");
    expect(JSON.stringify(events)).not.toContain("SECRET");
    expect(events.at(-1)).toEqual({ type: "done", finishReason: "stop", usage: { input: 25, output: 15 } });
  });

  it("reports a refusal after partial text", async () => {
    stubFetch(sseResponse(fixture("anthropic-refusal.sse")));
    const events = await collect(anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, chatRequest()));
    expect(events.at(-1)).toMatchObject({ type: "done", finishReason: "refusal" });
  });

  it("throws an error event from inside the stream", async () => {
    stubFetch(sseResponse(fixture("anthropic-error.sse")));
    const { seen, error } = await collectUntilError(
      anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, chatRequest()),
    );
    expect(textOf(seen)).toBe("Partial");
    expect(error).toMatchObject({ kind: "provider-down" });
  });

  it.each([
    ["max_tokens", "length"],
    ["model_context_window_exceeded", "length"],
    ["stop_sequence", "stop"],
    ["pause_turn", "other"],
  ])("maps stop_reason %s to %s", async (stopReason, finishReason) => {
    stubFetch(
      sseResponse(
        `event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"${stopReason}"},"usage":{"output_tokens":1}}\n\n`,
      ),
    );
    const events = await collect(anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, chatRequest()));
    expect(events.at(-1)).toEqual({ type: "done", finishReason });
  });

  it("fails when the stream ends without a stop reason", async () => {
    stubFetch(sseResponse(fixture("anthropic-stream.sse").split("event: message_delta")[0] ?? ""));
    const { error } = await collectUntilError(anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, chatRequest()));
    expect(error).toMatchObject({ kind: "network" });
  });

  it("fails on off before any network call", async () => {
    const calls = stubFetch();
    const req = chatRequest({ reasoning: "off" });
    const { error } = await collectUntilError(anthropicAdapter.stream(PROFILES.anthropic, TEST_KEY, req));
    expect(error).toBeInstanceOf(ProviderError);
    expect(calls).toHaveLength(0);
  });
});

describe("anthropic listModels", () => {
  it("follows the cursor and reads capabilities", async () => {
    const calls = stubFetch(
      jsonResponse(jsonFixture("anthropic-models-1.json")),
      jsonResponse(jsonFixture("anthropic-models-2.json")),
    );
    const models = await anthropicAdapter.listModels(PROFILES.anthropic, TEST_KEY);

    expect(calls[0]?.url).toBe("https://api.anthropic.com/v1/models?limit=1000");
    expect(calls[0]?.headers).toMatchObject({ "anthropic-version": "2026-10-21" });
    expect(calls[1]?.url).toContain("after_id=claude-opus-5-5");
    expect(models).toEqual([
      {
        id: "claude-opus-5-5",
        name: "Claude Opus 5.5",
        contextLength: 1000000,
        maxOutputTokens: 128000,
        supportsReasoning: true,
        supportsTemperature: false,
      },
      {
        id: "claude-haiku-4-5-20251001",
        name: "Claude Haiku 4.5",
        contextLength: 200000,
        supportsReasoning: false,
        supportsTemperature: false,
      },
      { id: "claude-unknown", name: "Claude Unknown", supportsTemperature: false },
    ]);
  });
});

describe("openai-compatible stream", () => {
  it("sends the OpenAI request", async () => {
    const calls = stubFetch(sseResponse(fixture("openai-stream.sse")));
    const req = chatRequest({ model: "gpt-6.1-terra", reasoning: "off", temperature: 0.3 });
    await collect(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, req));

    expect(calls[0]?.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(calls[0]?.headers).toMatchObject({ authorization: `Bearer ${TEST_KEY}` });
    expect(calls[0]?.body).toEqual({
      model: "gpt-6.1-terra",
      stream: true,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      reasoning_effort: "none",
      temperature: 0.3,
      stream_options: { include_usage: true },
    });
  });

  it("sends a known token limit in the field each provider expects", async () => {
    const calls = stubFetch(
      sseResponse(fixture("openai-stream.sse")),
      sseResponse(fixture("openai-stream.sse")),
      sseResponse(fixture("openai-stream.sse")),
    );
    const limited = chatRequest({ maxOutputTokens: 4096 });
    await collect(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, limited));
    await collect(openAiCompatibleAdapter.stream(PROFILES.openrouter, TEST_KEY, limited));
    await collect(openAiCompatibleAdapter.stream(PROFILES.gemini, TEST_KEY, limited));
    expect(calls[0]?.body).toMatchObject({ max_completion_tokens: 4096 });
    expect(calls[0]?.body).not.toHaveProperty("max_tokens");
    expect(calls[1]?.body).toMatchObject({ max_tokens: 4096 });
    expect(calls[2]?.body).toMatchObject({ max_tokens: 4096 });
  });

  it("refuses redirects, which would carry the key and the text to another host", async () => {
    const calls = stubFetch(sseResponse(fixture("openai-stream.sse")));
    await collect(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, chatRequest()));
    expect(calls[0]?.redirect).toBe("error");
  });

  it("sends no reasoning, temperature or token limit by default", async () => {
    const calls = stubFetch(sseResponse(fixture("openai-stream.sse")));
    await collect(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, chatRequest()));
    for (const field of ["reasoning_effort", "temperature", "max_tokens", "max_completion_tokens", "provider"]) {
      expect(calls[0]?.body).not.toHaveProperty(field);
    }
  });

  it("emits text and takes usage from the chunk after the finish reason", async () => {
    stubFetch(sseResponse(fixture("openai-stream.sse"), 11));
    const events = await collect(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, chatRequest()));
    expect(textOf(events)).toBe("Hello world");
    expect(events.at(-1)).toEqual({ type: "done", finishReason: "length", usage: { input: 12, output: 7 } });
  });

  it("treats delta.refusal as a refusal and does not emit its text", async () => {
    stubFetch(sseResponse(fixture("openai-refusal.sse")));
    const events = await collect(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, chatRequest()));
    expect(events).toEqual([{ type: "done", finishReason: "refusal" }]);
  });

  it("treats content_filter as a refusal", async () => {
    stubFetch(sseResponse(`data: {"choices":[{"delta":{},"finish_reason":"content_filter"}]}\n\ndata: [DONE]\n\n`));
    const events = await collect(openAiCompatibleAdapter.stream(PROFILES.gemini, TEST_KEY, chatRequest()));
    expect(events.at(-1)).toMatchObject({ finishReason: "refusal" });
  });

  it("works on Gemini, where the stream may end without [DONE]", async () => {
    const calls = stubFetch(sseResponse(fixture("gemini-stream.sse")));
    const req = chatRequest({ model: "gemini-3.8-flash", reasoning: "low" });
    const events = await collect(openAiCompatibleAdapter.stream(PROFILES.gemini, TEST_KEY, req));

    expect(calls[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(calls[0]?.body).toMatchObject({ reasoning_effort: "low", stream_options: { include_usage: true } });
    expect(textOf(events)).toBe("Hallo Welt");
    expect(events.at(-1)).toEqual({ type: "done", finishReason: "stop", usage: { input: 6, output: 4 } });
  });

  it("sends strict privacy to OpenRouter and ignores its reasoning fields", async () => {
    const calls = stubFetch(sseResponse(fixture("openrouter-stream.sse")));
    const provider = { zdr: true, data_collection: "deny" as const, ignore: ["deepseek"] };
    const req = chatRequest({ reasoning: "medium", openRouterProvider: provider });
    const events = await collect(openAiCompatibleAdapter.stream(PROFILES.openrouter, TEST_KEY, req));

    expect(calls[0]?.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(calls[0]?.body).toMatchObject({ provider, reasoning: { effort: "medium" } });
    expect(calls[0]?.body).not.toHaveProperty("stream_options");
    expect(JSON.stringify(events)).not.toContain("SECRET");
    expect(events.at(-1)).toEqual({ type: "done", finishReason: "stop", usage: { input: 10, output: 20 } });
  });

  it("never sends the provider object to other profiles", async () => {
    const calls = stubFetch(sseResponse(fixture("openai-stream.sse")));
    const req = chatRequest({ openRouterProvider: { zdr: true } });
    await collect(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, req));
    expect(calls[0]?.body).not.toHaveProperty("provider");
  });

  it("throws OpenRouter's mid-stream error", async () => {
    stubFetch(sseResponse(fixture("openrouter-error.sse")));
    const { seen, error } = await collectUntilError(
      openAiCompatibleAdapter.stream(PROFILES.openrouter, TEST_KEY, chatRequest()),
    );
    expect(textOf(seen)).toBe("Partial");
    expect(error).toMatchObject({ kind: "rate-limit", status: 429 });
  });

  it("reports strict mode failures clearly", async () => {
    stubFetch(jsonResponse({ error: { code: 404, message: "No endpoints found matching your data policy" } }, 404));
    const req = chatRequest({ openRouterProvider: { zdr: true, data_collection: "deny" } });
    const { error } = await collectUntilError(openAiCompatibleAdapter.stream(PROFILES.openrouter, TEST_KEY, req));
    expect(error).toMatchObject({ kind: "no-strict-endpoint" });
  });

  it("does not leak the request into error messages", async () => {
    const req = chatRequest();
    stubFetch(jsonResponse({ error: { message: `Cannot process: ${req.user}` } }, 400));
    const { error } = await collectUntilError(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, req));
    expect((error as Error).message).not.toContain("confidential");
  });

  it("fails on an empty 200 stream", async () => {
    stubFetch(sseResponse(": OPENROUTER PROCESSING\n\n"));
    const { error } = await collectUntilError(
      openAiCompatibleAdapter.stream(PROFILES.openrouter, TEST_KEY, chatRequest()),
    );
    expect(error).toMatchObject({ kind: "network" });
  });

  it("fails when the connection drops after partial text", async () => {
    stubFetch(sseResponse(`data: {"choices":[{"delta":{"content":"Par"},"finish_reason":null}]}\n\n`));
    const { error } = await collectUntilError(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, chatRequest()));
    expect(error).toMatchObject({ kind: "network" });
  });

  it("fails on unreadable chunks instead of dropping them", async () => {
    stubFetch(sseResponse(`data: {"choices":[{"delta":{"con\n\n`));
    const { error } = await collectUntilError(openAiCompatibleAdapter.stream(PROFILES.openai, TEST_KEY, chatRequest()));
    expect(error).toMatchObject({ kind: "unknown" });
  });
});

describe("openai-compatible listModels", () => {
  it("lists OpenAI IDs without Responses-only models", async () => {
    const calls = stubFetch(jsonResponse(jsonFixture("openai-models.json")));
    const models = await openAiCompatibleAdapter.listModels(PROFILES.openai, TEST_KEY);
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/models");
    // Embeddings are filtered by the catalog, which owns the name-based exclusion list.
    expect(models.map((model) => model.id)).toEqual(["gpt-6.1-terra", "text-embedding-3-small"]);
  });

  it("reads Gemini's native list with pagination and keeps text models only", async () => {
    const calls = stubFetch(
      jsonResponse(jsonFixture("gemini-models-1.json")),
      jsonResponse(jsonFixture("gemini-models-2.json")),
    );
    const models = await openAiCompatibleAdapter.listModels(PROFILES.gemini, TEST_KEY);

    expect(calls[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000");
    expect(calls[0]?.headers).toEqual({ "x-goog-api-key": TEST_KEY });
    expect(calls[1]?.url).toContain("pageToken=page-2");
    expect(models).toEqual([
      {
        id: "gemini-3.8-flash",
        name: "Gemini 3.8 Flash",
        contextLength: 1048576,
        maxOutputTokens: 65536,
        supportsReasoning: true,
        supportsTemperature: true,
      },
      { id: "gemma-4", name: "Gemma 4" },
    ]);
  });

  it("reads OpenRouter metadata and never follows a foreign next link", async () => {
    const calls = stubFetch(
      jsonResponse(jsonFixture("openrouter-models-1.json")),
      jsonResponse(jsonFixture("openrouter-models-2.json")),
    );
    const models = await openAiCompatibleAdapter.listModels(PROFILES.openrouter, TEST_KEY);

    expect(calls[0]?.url).toBe("https://openrouter.ai/api/v1/models?output_modalities=text");
    expect(calls[1]?.url).toBe("https://openrouter.ai/api/v1/models?output_modalities=text&offset=2");
    expect(models).toEqual([
      {
        id: "deepseek/deepseek-v4.1-flash-1017",
        name: "DeepSeek: V4.1 Flash",
        contextLength: 256000,
        maxOutputTokens: 16000,
        pricing: { inputPerMTok: 0.3, outputPerMTok: 1.2 },
        supportsReasoning: true,
        supportsTemperature: true,
      },
      { id: "openrouter/auto", name: "Auto Router", supportsReasoning: false, supportsTemperature: false },
      { id: "mistralai/mistral-next", name: "Mistral: Next", contextLength: 128000 },
    ]);
  });

  it("maps a bad key on listing", async () => {
    stubFetch(jsonResponse({ error: { message: "nope" } }, 401));
    await expect(openAiCompatibleAdapter.listModels(PROFILES.openrouter, TEST_KEY)).rejects.toMatchObject({
      kind: "auth",
    });
  });
});
