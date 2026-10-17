import assert from "node:assert/strict";
import test from "node:test";
import { listModels, streamChatCompletion } from "../src/openai-client";
import type { ChatMessage, ProviderProfile } from "../src/types";

const provider: ProviderProfile = {
  id: "provider",
  name: "GLM",
  baseUrl: "https://example.com/v1",
  apiKey: "secret",
  defaultModelId: "glm-test",
  systemPrompt: "Be useful.",
  models: ["glm-test"],
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};

const messages: ChatMessage[] = [
  {
    id: "message",
    role: "user",
    content: "Hello",
    status: "complete",
    createdAt: "2026-09-05T00:00:00.000Z",
  },
];

test("lists and sorts models from an OpenAI-compatible endpoint", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_input, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer secret");
    return Response.json({ data: [{ id: "z-model" }, { id: "a-model" }] });
  };
  assert.deepEqual(await listModels(provider.baseUrl, provider.apiKey), ["a-model", "z-model"]);
});

test("streams standard content and GLM reasoning_content independently", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const sse = [
    'data: {"choices":[{"delta":{"reasoning_content":"Think "}}]}',
    'data: {"choices":[{"delta":{"reasoning_content":"carefully."}}]}',
    'data: {"choices":[{"delta":{"content":"Final "}}]}',
    'data: {"choices":[{"delta":{"content":"answer"}}]}',
    "data: [DONE]",
    "",
  ].join("\n");
  globalThis.fetch = async () =>
    new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } });

  const deltas: string[] = [];
  const result = await streamChatCompletion({
    provider,
    modelId: "glm-test",
    systemPrompt: provider.systemPrompt,
    messages,
    onDelta: (delta) => deltas.push(`${delta.reasoning ?? ""}${delta.content ?? ""}`),
  });
  assert.deepEqual(result, { content: "Final answer", reasoning: "Think carefully." });
  assert.deepEqual(deltas, ["Think ", "carefully.", "Final ", "answer"]);
});

test("accepts a non-streaming JSON response from a compatible server", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    Response.json({ choices: [{ message: { role: "assistant", content: "Hello back" } }] });
  const result = await streamChatCompletion({
    provider,
    modelId: "glm-test",
    systemPrompt: "",
    messages,
    onDelta: () => undefined,
  });
  assert.equal(result.content, "Hello back");
});
