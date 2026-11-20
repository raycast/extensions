import type { AI } from "@raycast/api";
import { describe, expect, it, vi } from "vitest";
import { createModelProvider } from "../src/lib/model-provider";

const model = {
  type: "llm",
  publisher: "Qwen",
  key: "qwen/chat",
  display_name: "Qwen Chat",
  quantization: { name: "Q4_K_M", bits_per_weight: 4 },
  size_bytes: 4_000_000_000,
  params_string: "7B",
  loaded_instances: [{ id: "qwen-running", config: { context_length: 8192 } }],
  max_context_length: 32768,
  format: "gguf",
  capabilities: { vision: true, trained_for_tool_use: true },
};

function streamResponse(chunks: unknown[]): Response {
  const content = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
  const bytes = new TextEncoder().encode(content);
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

async function collect(stream: AI.ModelStream): Promise<AI.ModelStreamPart[]> {
  if (!("fullStream" in stream)) throw new Error("Expected a full stream");
  const parts: AI.ModelStreamPart[] = [];
  for await (const part of stream.fullStream) parts.push(part);
  return parts;
}

describe("LM Studio model provider", () => {
  it("discovers language models without loading them and maps capabilities and the active context", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ models: [model, { ...model, type: "embedding", key: "embed", capabilities: undefined }] }),
      );
    const provider = createModelProvider({
      baseUrl: "http://localhost:1234/api/v1",
      apiToken: " test-token ",
      fetch: fetchMock,
    });
    expect(await provider.getModels()).toEqual([
      {
        id: model.key,
        title: model.display_name,
        icon: "icon.png",
        description: "7B · Q4_K_M",
        isLocal: true,
        contextWindow: 8192,
        sizeInBytes: model.size_bytes,
        capabilities: {
          systemMessage: { supported: true },
          temperature: { supported: true },
          streaming: { supported: true },
          tools: { supported: true },
          vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] },
        },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "http://localhost:1234/api/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("does not advertise unsupported capabilities or describe remote servers as local", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ models: [{ ...model, loaded_instances: [], capabilities: undefined }] }));
    const provider = createModelProvider({ baseUrl: "https://127.example.test/lm/v1", fetch: fetchMock });
    const [registered] = await provider.getModels();
    expect(registered).toMatchObject({ isLocal: false, contextWindow: 32768 });
    expect(registered.capabilities?.tools).toBeUndefined();
    expect(registered.capabilities?.vision).toBeUndefined();
    expect(registered.capabilities?.reasoningEffort).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://127.example.test/lm/api/v1/models",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("streams reasoning, text, and usage from the selected loaded instance with conversation history", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ models: [model] }))
      .mockResolvedValueOnce(
        streamResponse([
          { choices: [{ index: 0, delta: { role: "assistant", reasoning_content: "Thinking" }, finish_reason: null }] },
          { choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: null }] },
          {
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
          },
        ]),
      );
    const provider = createModelProvider({
      baseUrl: "http://localhost:1234",
      apiToken: "test-token",
      fetch: fetchMock,
    });
    const parts = await collect(
      await provider.streamCompletion(
        { id: model.key, title: model.display_name },
        {
          system: "Be brief",
          temperature: 0.3,
          messages: [
            { role: "user", content: [{ type: "text", text: "Hi" }] },
            { role: "assistant", content: [{ type: "text", text: "Hi back" }] },
            { role: "user", content: [{ type: "text", text: "Again" }] },
          ],
        },
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("http://localhost:1234/v1/chat/completions");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen-running",
      temperature: 0.3,
      stream: true,
      messages: [
        { role: "system", content: "Be brief" },
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hi back" },
        { role: "user", content: "Again" },
      ],
    });
    expect(parts).toContainEqual(expect.objectContaining({ type: "reasoning-delta", text: "Thinking" }));
    expect(parts).toContainEqual(expect.objectContaining({ type: "text-delta", text: "Hello" }));
    expect(parts).toContainEqual(
      expect.objectContaining({
        type: "finish",
        finishReason: "stop",
        totalUsage: expect.objectContaining({ inputTokens: 3, outputTokens: 4 }),
      }),
    );
  });

  it("loads an unloaded model only at inference time and forwards image input and tool calls", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ models: [{ ...model, loaded_instances: [] }] }))
      .mockResolvedValueOnce(
        Response.json({ type: "llm", instance_id: "new-instance", load_time_seconds: 1, status: "loaded" }),
      )
      .mockResolvedValueOnce(
        streamResponse([
          {
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    { index: 0, id: "call-1", type: "function", function: { name: "lookup", arguments: '{"query":' } },
                  ],
                },
                finish_reason: null,
              },
            ],
          },
          {
            choices: [
              {
                index: 0,
                delta: { tool_calls: [{ index: 0, function: { arguments: '"cat"}' } }] },
                finish_reason: null,
              },
            ],
          },
          { choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] },
        ]),
      );
    const provider = createModelProvider({ baseUrl: "http://localhost:1234", fetch: fetchMock });
    const parts = await collect(
      await provider.streamCompletion(
        { id: model.key, title: model.display_name },
        {
          messages: [{ role: "user", content: [{ type: "file", mediaType: "image/png", data: "aGVsbG8=" }] }],
          tools: {
            lookup: {
              description: "Look up a value",
              inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
            },
          },
          toolChoice: "required",
        },
      ),
    );
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:1234/api/v1/models/load");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ model: model.key });
    const payload = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(payload).toMatchObject({
      model: "new-instance",
      tool_choice: "required",
      tools: [{ type: "function", function: { name: "lookup" } }],
    });
    expect(payload.messages[0].content).toEqual([
      { type: "image_url", image_url: { url: "data:image/png;base64,aGVsbG8=" } },
    ]);
    expect(parts).toContainEqual(
      expect.objectContaining({ type: "tool-call", toolCallId: "call-1", toolName: "lookup", input: { query: "cat" } }),
    );
    expect(parts).toContainEqual(expect.objectContaining({ type: "finish", finishReason: "tool-calls" }));
  });

  it("surfaces discovery and load errors without starting an inference request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ error: { message: "Token required" } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ models: [{ ...model, loaded_instances: [] }] }))
      .mockResolvedValueOnce(Response.json({ error: { message: "Not enough memory" } }, { status: 400 }));
    const provider = createModelProvider({ baseUrl: "http://localhost:1234", fetch: fetchMock });
    await expect(provider.getModels()).rejects.toThrow("Token required");
    await expect(
      provider.streamCompletion({ id: model.key, title: model.display_name }, { messages: [] }),
    ).rejects.toThrow("Not enough memory");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("forwards completed Raycast tool results without executing tools inside the extension", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ models: [model] }))
      .mockResolvedValueOnce(
        streamResponse([
          { choices: [{ index: 0, delta: { content: "Found it" }, finish_reason: null }] },
          { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
        ]),
      );
    const provider = createModelProvider({ baseUrl: "http://localhost:1234", fetch: fetchMock });
    await collect(
      await provider.streamCompletion(
        { id: model.key, title: model.display_name },
        {
          messages: [
            { role: "user", content: [{ type: "text", text: "Look up cats" }] },
            {
              role: "assistant",
              content: [{ type: "tool-call", toolCallId: "call-1", toolName: "lookup", input: { query: "cats" } }],
            },
            {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolCallId: "call-1",
                  toolName: "lookup",
                  output: { type: "json", value: { result: "Cat facts" } },
                },
              ],
            },
          ],
        },
      ),
    );
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(payload.messages[1]).toMatchObject({
      role: "assistant",
      tool_calls: [{ id: "call-1", type: "function", function: { name: "lookup", arguments: '{"query":"cats"}' } }],
    });
    expect(payload.messages[2]).toEqual({ role: "tool", tool_call_id: "call-1", content: '{"result":"Cat facts"}' });
  });

  it("returns inference failures through the stream without retrying the request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ models: [model] }))
      .mockResolvedValueOnce(Response.json({ error: { message: "Inference failed" } }, { status: 500 }));
    const provider = createModelProvider({ baseUrl: "http://localhost:1234", fetch: fetchMock });
    const parts = await collect(
      await provider.streamCompletion(
        { id: model.key, title: model.display_name },
        {
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        },
      ),
    );
    expect(parts).toContainEqual(
      expect.objectContaining({ type: "error", error: expect.objectContaining({ message: "Inference failed" }) }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a stale selected model instead of sending it to another model", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ models: [] }));
    const provider = createModelProvider({ baseUrl: "http://localhost:1234", fetch: fetchMock });
    await expect(
      provider.streamCompletion({ id: model.key, title: model.display_name }, { messages: [] }),
    ).rejects.toThrow("no longer available");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
