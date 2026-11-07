import { afterEach, describe, expect, it, vi } from "vitest";
import { anthropicAdapter } from "../../src/providers/anthropic";
import { getAdapter, getProfile, streamChat, testConnection } from "../../src/providers";
import { openAiCompatibleAdapter } from "../../src/providers/openai-compatible";
import {
  chatRequest,
  collect,
  collectUntilError,
  fixture,
  jsonResponse,
  sseResponse,
  stubFetch,
  textOf,
} from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const key = "test-key-not-real";
const openRouter = { provider: "openrouter", modelId: "deepseek/deepseek-v4.1-flash-1017" } as const;
const claude = { provider: "anthropic", modelId: "claude-opus-5-5" } as const;

describe("profiles", () => {
  it("pairs each provider with its adapter", () => {
    expect(getAdapter(getProfile("anthropic"))).toBe(anthropicAdapter);
    for (const id of ["openai", "gemini", "openrouter"] as const) {
      expect(getProfile(id).id).toBe(id);
      expect(getAdapter(getProfile(id))).toBe(openAiCompatibleAdapter);
    }
  });
});

describe("streamChat", () => {
  it("uses the ref's model and removes think tags split across chunks", async () => {
    const calls = stubFetch(sseResponse(fixture("openrouter-stream.sse"), 9));
    const events = await collect(streamChat(openRouter, key, chatRequest()));
    expect(calls[0]?.body).toMatchObject({ model: openRouter.modelId });
    expect(textOf(events)).toBe("Visible");
    expect(events.at(-1)).toMatchObject({ type: "done", finishReason: "stop" });
  });

  it("flushes a held tag prefix before done", async () => {
    stubFetch(
      sseResponse(
        `data: {"choices":[{"delta":{"content":"a <th"},"finish_reason":null}]}\n\n` +
          `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n`,
      ),
    );
    const events = await collect(streamChat(openRouter, key, chatRequest()));
    expect(textOf(events)).toBe("a <th");
  });

  it("throws on refusal and never yields done", async () => {
    stubFetch(sseResponse(fixture("anthropic-refusal.sse")));
    const { seen, error } = await collectUntilError(streamChat(claude, key, chatRequest()));
    expect(error).toMatchObject({ kind: "refusal", provider: "anthropic" });
    expect(seen.some((event) => event.type === "done")).toBe(false);
  });

  it("explains an empty result cut off by the output limit", async () => {
    stubFetch(
      sseResponse(
        `data: {"choices":[{"delta":{"content":"<think>only reasoning"},"finish_reason":null}]}\n\n` +
          `data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n`,
      ),
    );
    const { error } = await collectUntilError(streamChat(openRouter, key, chatRequest()));
    expect(error).toMatchObject({ kind: "empty-result" });
    expect((error as Error).message).toContain("output limit");
  });

  const stream = (content: string, finishReason: string) =>
    sseResponse(
      `data: {"choices":[{"delta":{"content":${JSON.stringify(content)}},"finish_reason":null}]}\n\n` +
        `data: {"choices":[{"delta":{},"finish_reason":"${finishReason}"}]}\n\ndata: [DONE]\n\n`,
    );

  it("rejects text cut off by the output limit", async () => {
    stubFetch(stream("Half a sent", "length"));
    const { error } = await collectUntilError(streamChat(openRouter, key, chatRequest()));
    expect(error).toMatchObject({ kind: "incomplete" });
  });

  it("rejects text that ends inside a think block", async () => {
    stubFetch(stream("Visible <think>still thinking", "stop"));
    const { error } = await collectUntilError(streamChat(openRouter, key, chatRequest()));
    expect(error).toMatchObject({ kind: "incomplete" });
  });

  it("keeps think tags on request, for input that contains them", async () => {
    stubFetch(stream("Use <think> for reasoning.", "stop"));
    const events = await collect(streamChat(openRouter, key, chatRequest(), { preserveThinkTags: true }));
    expect(textOf(events)).toBe("Use <think> for reasoning.");
  });

  it("treats whitespace as empty", async () => {
    stubFetch(
      sseResponse(
        `data: {"choices":[{"delta":{"content":" \\n"},"finish_reason":null}]}\n\n` +
          `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n`,
      ),
    );
    const { error } = await collectUntilError(streamChat(openRouter, key, chatRequest()));
    expect(error).toMatchObject({ kind: "empty-result" });
  });
});

describe("testConnection", () => {
  it("checks an OpenRouter key separately, because the model list is public", async () => {
    const calls = stubFetch(jsonResponse({ data: {} }), jsonResponse({ data: [{ id: "deepseek/a" }] }));
    await expect(testConnection("openrouter", key)).resolves.toBe(1);
    expect(calls[0]?.url).toBe("https://openrouter.ai/api/v1/key");
  });

  it("fails on an invalid OpenRouter key, even though the model list would answer", async () => {
    stubFetch(jsonResponse({ error: { code: 401, message: "No auth" } }, 401));
    await expect(testConnection("openrouter", key)).rejects.toMatchObject({ kind: "auth" });
  });

  it("uses the model list for providers that require a key for it", async () => {
    const calls = stubFetch(jsonResponse({ data: [{ id: "gpt-6-luna" }] }));
    await expect(testConnection("openai", key)).resolves.toBe(1);
    expect(calls).toHaveLength(1);
  });
});
