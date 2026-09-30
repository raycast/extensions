import { ReadableStream } from "node:stream/web";
import type { AI } from "@raycast/api";
import { describe, expect, it, vi } from "vitest";
import { createModelProvider } from "../src/model-provider";

const gateway = false;
const baseUrl = "https://api.cerebras.ai/v1";
const model: AI.RegisteredModel = {
  id: "gpt-oss-120b",
  title: "Chat",
  capabilities: {
    temperature: { supported: true },
    tools: { supported: true },
    reasoningEffort: { supported: true, options: ["low", "medium", "high"], default: "medium" },
  },
};

function sse(chunks: unknown[]) {
  const bytes = new TextEncoder().encode(
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n",
  );
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

function completion(toolCall = false) {
  if (gateway)
    return sse([
      { type: "stream-start", warnings: [] },
      { type: "reasoning-start", id: "r" },
      { type: "reasoning-delta", id: "r", delta: "Thinking" },
      { type: "reasoning-end", id: "r" },
      ...(toolCall
        ? [{ type: "tool-call", toolCallId: "call-1", toolName: "weather", input: '{"city":"Paris"}' }]
        : [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "Hello" },
            { type: "text-end", id: "t" },
          ]),
      {
        type: "finish",
        finishReason: { unified: toolCall ? "tool-calls" : "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 4, noCache: 4, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 3, text: 2, reasoning: 1 },
        },
      },
    ]);
  const chunk = (delta: object, finish_reason: string | null = null) => ({
    id: "response-1",
    object: "chat.completion.chunk",
    created: 1,
    model: model.id,
    choices: [{ index: 0, delta, finish_reason }],
  });
  return sse([
    chunk({ reasoning: "Thinking" }),
    ...(toolCall
      ? [
          chunk({
            tool_calls: [
              { index: 0, id: "call-1", type: "function", function: { name: "weather", arguments: '{"city":' } },
            ],
          }),
          chunk({ tool_calls: [{ index: 0, function: { arguments: '"Paris"}' } }] }),
        ]
      : [chunk({ content: "Hello" })]),
    {
      ...chunk({}, toolCall ? "tool_calls" : "stop"),
      usage: {
        prompt_tokens: 4,
        completion_tokens: 3,
        total_tokens: 7,
        completion_tokens_details: { reasoning_tokens: 1 },
      },
      x_groq: { usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 } },
    },
  ]);
}

async function collect(stream: AI.ModelStream) {
  if (!("fullStream" in stream)) throw new Error("Expected a full stream");
  const parts: AI.ModelStreamPart[] = [];
  for await (const part of stream.fullStream) parts.push(part);
  return parts;
}

describe("cerebras model provider", () => {
  it("streams text, reasoning and usage through the real SDK and forwards history", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion());
    const provider = createModelProvider({ apiKey: "test-key", fetch: fetcher });
    const parts = await collect(
      await provider.streamCompletion(model, {
        system: "Be concise",
        temperature: 0.3,
        messages: [
          { role: "user", content: [{ type: "text", text: "Hi" }] },
          { role: "assistant", content: [{ type: "text", text: "Welcome" }] },
          { role: "user", content: [{ type: "text", text: "Again" }] },
        ],
      }),
    );
    expect(parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text-delta", text: "Hello" }),
        expect.objectContaining({ type: "reasoning-delta", text: "Thinking" }),
        expect.objectContaining({
          type: "finish",
          totalUsage: expect.objectContaining({ inputTokens: 4, outputTokens: 3 }),
        }),
      ]),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe(baseUrl + (gateway ? "/language-model" : "/chat/completions"));
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    const body = JSON.parse(String(init?.body));
    expect(body.temperature).toBe(0.3);
    if (gateway)
      expect(body.prompt.map((message: { role: string }) => message.role)).toEqual([
        "system",
        "user",
        "assistant",
        "user",
      ]);
    else {
      expect(body).toMatchObject({ model: model.id, stream: true });
      expect(body.messages.map((message: { content: string }) => message.content)).toEqual([
        "Be concise",
        "Hi",
        "Welcome",
        "Again",
      ]);
    }
  });

  it("returns tool calls for Raycast to execute and forwards JSON schemas and tool choice", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion(true));
    const provider = createModelProvider({ apiKey: "test-key", fetch: fetcher });
    const parts = await collect(
      await provider.streamCompletion(model, {
        messages: [{ role: "user", content: [{ type: "text", text: "Weather?" }] }],
        toolChoice: "required",
        tools: {
          weather: {
            description: "Get weather",
            inputSchema: { type: "object", properties: { city: { type: "string" } }, required: ["city"] },
          },
        },
      }),
    );
    expect(parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "weather",
          input: { city: "Paris" },
        }),
      ]),
    );
    expect(parts.some((part) => part.type === "tool-result")).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    if (gateway) {
      expect(body.tools[0]).toMatchObject({ name: "weather", inputSchema: { required: ["city"] } });
      expect(body.toolChoice).toEqual({ type: "required" });
    } else {
      expect(body.tools[0]).toMatchObject({
        type: "function",
        function: { name: "weather", parameters: { required: ["city"] } },
      });
      expect(body.tool_choice).toBe("required");
    }
  });

  it("preserves tool result history on the next request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion());
    const provider = createModelProvider({ apiKey: "test-key", fetch: fetcher });
    await collect(
      await provider.streamCompletion(model, {
        messages: [
          { role: "user", content: [{ type: "text", text: "Weather?" }] },
          {
            role: "assistant",
            content: [{ type: "tool-call", toolCallId: "call-1", toolName: "weather", input: { city: "Paris" } }],
          },
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: "call-1",
                toolName: "weather",
                output: { type: "json", value: { temperature: 20 } },
              },
            ],
          },
        ],
      }),
    );
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    if (gateway)
      expect(body.prompt[2].content[0]).toMatchObject({
        type: "tool-result",
        toolCallId: "call-1",
        output: { value: { temperature: 20 } },
      });
    else
      expect(body.messages[2]).toMatchObject({ role: "tool", tool_call_id: "call-1", content: '{"temperature":20}' });
  });

  it("surfaces inference failures without retrying", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ error: { message: "Rate limited", type: "rate_limit_exceeded" } }, { status: 429 }),
      );
    const parts = await collect(
      await createModelProvider({ apiKey: "test-key", fetch: fetcher }).streamCompletion(model, {
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      }),
    );
    expect(parts.some((part) => part.type === "error")).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 429, 500])("reports discovery HTTP %s instead of returning an empty catalog", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({}, { status }));
    await expect(createModelProvider({ apiKey: "test-key", fetch: fetcher }).getModels()).rejects.toThrow(
      status === 401 || status === 403 ? "API key" : `HTTP ${status}`,
    );
  });

  it("rejects malformed model catalogs", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ data: [{ id: 42 }] }));
    await expect(createModelProvider({ apiKey: "test-key", fetch: fetcher }).getModels()).rejects.toThrow();
  });
});

it("enriches accessible models, excludes deprecated entries and keeps private models", async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) =>
    Response.json(
      String(url).includes("/public/")
        ? {
            data: [
              {
                id: "gpt-oss-120b",
                name: "GPT OSS",
                capabilities: { streaming: true, tools: true },
                limits: { max_context_length: 131072 },
                supported_parameters: { temperature: true },
              },
              { id: "old", deprecated: true },
              { id: "not-accessible" },
            ],
          }
        : { data: [{ id: "gpt-oss-120b" }, { id: "private-model" }, { id: "old" }] },
    ),
  );
  expect(await createModelProvider({ apiKey: "test-key", fetch: fetcher }).getModels()).toMatchObject([
    { id: "gpt-oss-120b", title: "GPT OSS", contextWindow: 131072, capabilities: { tools: { supported: true } } },
    { id: "private-model", capabilities: { tools: { supported: false } } },
  ]);
  const publicRequest = fetcher.mock.calls.find(([url]) => String(url).includes("/public/"));
  expect(new Headers(publicRequest?.[1]?.headers).has("authorization")).toBe(false);
});

it("keeps authenticated discovery working when public metadata is unavailable", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (url) =>
      String(url).includes("/public/")
        ? new Response(null, { status: 503 })
        : Response.json({ data: [{ id: "private-model" }] }),
    );
  expect(await createModelProvider({ apiKey: "test-key", fetch: fetcher }).getModels()).toMatchObject([
    { id: "private-model" },
  ]);
});

it("forwards image attachments without downloading them", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion());
  await collect(
    await createModelProvider({ apiKey: "test-key", fetch: fetcher }).streamCompletion(model, {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this" },
            { type: "file", data: "aGVsbG8=", mediaType: "image/png" },
          ],
        },
      ],
    }),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  if (gateway)
    expect(body.prompt[0].content[1]).toMatchObject({ type: "file", data: "aGVsbG8=", mediaType: "image/png" });
  else
    expect(body.messages[0].content[1]).toMatchObject({
      type: "image_url",
      image_url: { url: "data:image/png;base64,aGVsbG8=" },
    });
});

it("omits temperature for models that do not support it", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion());
  await collect(
    await createModelProvider({ apiKey: "test-key", fetch: fetcher }).streamCompletion(
      { ...model, capabilities: { temperature: { supported: false } } },
      {
        temperature: 0.5,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      },
    ),
  );
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).temperature).toBeUndefined();
});
