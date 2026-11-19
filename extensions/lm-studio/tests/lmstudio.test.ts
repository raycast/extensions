import { describe, expect, it, vi } from "vitest";
import {
  LMStudioClient,
  LMStudioError,
  ServerSentEventParser,
  normalizeBaseUrl,
  parseChatEvent,
} from "../src/lib/lmstudio";

function streamingResponse(content: string, chunkSize = 7): Response {
  const bytes = new TextEncoder().encode(content);
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (let index = 0; index < bytes.length; index += chunkSize) {
          controller.enqueue(bytes.slice(index, index + chunkSize));
        }
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

describe("normalizeBaseUrl", () => {
  it("normalizes endpoint suffixes and trailing slashes", () => {
    expect(normalizeBaseUrl(" http://localhost:1234/api/v1/ ")).toBe("http://localhost:1234");
    expect(normalizeBaseUrl("https://example.test/lm-studio/v1")).toBe("https://example.test/lm-studio");
  });

  it("rejects credentials and unsupported protocols", () => {
    expect(() => normalizeBaseUrl("ftp://localhost:1234")).toThrow(LMStudioError);
    expect(() => normalizeBaseUrl("http://user:pass@localhost:1234")).toThrow(/API token/);
  });
});

describe("ServerSentEventParser", () => {
  it("handles arbitrarily fragmented named events and multi-line data", () => {
    const parser = new ServerSentEventParser();
    const chunks = [
      "event: message.",
      'delta\r\ndata: {"type":"message.delta",',
      '\r\ndata: "content":"hello"}\r\n\r\n',
    ];
    const frames = chunks.flatMap((chunk) => parser.push(chunk));
    frames.push(...parser.finish());
    expect(frames).toEqual([
      {
        event: "message.delta",
        data: '{"type":"message.delta",\n"content":"hello"}',
      },
    ]);
    expect(parseChatEvent(frames[0])).toEqual({
      type: "message.delta",
      content: "hello",
    });
  });
});

describe("LMStudioClient", () => {
  it("normalizes native model metadata and filters model types", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        models: [
          {
            type: "embedding",
            publisher: "Nomic",
            key: "nomic/embed",
            display_name: "Nomic Embed",
            quantization: null,
            size_bytes: 10,
            params_string: null,
            loaded_instances: [],
            max_context_length: 8192,
            format: "gguf",
          },
          {
            type: "llm",
            publisher: "Qwen",
            key: "qwen/chat",
            display_name: "Qwen Chat",
            architecture: "qwen",
            quantization: { name: "Q4_K_M", bits_per_weight: 4 },
            size_bytes: 20,
            params_string: "7B",
            loaded_instances: [{ id: "qwen/chat", config: { context_length: 4096 } }],
            max_context_length: 32768,
            format: "gguf",
            capabilities: {
              vision: false,
              trained_for_tool_use: true,
              reasoning: { allowed_options: ["off", "on"], default: "on" },
            },
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const client = new LMStudioClient({
      baseUrl: "http://localhost:1234/v1",
      fetch: fetchMock,
    });

    const models = await client.listModels();
    expect(models.map((model) => model.displayName)).toEqual(["Nomic Embed", "Qwen Chat"]);
    expect(models[1]).toMatchObject({
      key: "qwen/chat",
      sizeBytes: 20,
      loadedInstances: [{ id: "qwen/chat", config: { contextLength: 4096 } }],
      capabilities: {
        trainedForToolUse: true,
        reasoning: { allowedOptions: ["off", "on"] },
      },
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:1234/api/v1/models", expect.any(Object));
  });

  it("uses chat.end as canonical output and keeps reasoning/errors separate", async () => {
    const stream = [
      'event: chat.start\ndata: {"type":"chat.start","model_instance_id":"qwen"}\n\n',
      'event: reasoning.delta\ndata: {"type":"reasoning.delta","content":"think"}\n\n',
      'event: message.delta\ndata: {"type":"message.delta","content":"partial"}\n\n',
      'event: error\ndata: {"type":"error","error":{"type":"plugin_connection_error","message":"Plugin unavailable"}}\n\n',
      'event: chat.end\ndata: {"type":"chat.end","result":{"model_instance_id":"qwen","output":[{"type":"reasoning","content":"canonical thought"},{"type":"message","content":"canonical answer"}],"stats":{"input_tokens":4,"total_output_tokens":5,"reasoning_output_tokens":2,"tokens_per_second":12.5,"time_to_first_token_seconds":0.1},"response_id":"resp_123"}}\n\n',
    ].join("");
    const fetchMock = vi.fn(async () => streamingResponse(stream)) as unknown as typeof fetch;
    const events: string[] = [];
    const client = new LMStudioClient({
      baseUrl: "http://localhost:1234",
      apiToken: "secret",
      fetch: fetchMock,
    });

    const result = await client.chat({
      model: "qwen",
      input: [
        { type: "message", content: "Hello" },
        { type: "image", dataUrl: "data:image/png;base64,AA==" },
      ],
      store: true,
      onEvent(event) {
        events.push(event.type);
      },
    });

    expect(events).toEqual(["chat.start", "reasoning.delta", "message.delta", "error", "chat.end"]);
    expect(result).toMatchObject({
      text: "canonical answer",
      reasoning: "canonical thought",
      responseId: "resp_123",
      errors: [{ type: "plugin_connection_error", message: "Plugin unavailable" }],
      stats: { inputTokens: 4, tokensPerSecond: 12.5 },
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret" });
    expect(JSON.parse(String(init.body)).input).toEqual([
      { type: "text", content: "Hello" },
      { type: "image", data_url: "data:image/png;base64,AA==" },
    ]);
  });

  it("parses structured output and ordered embeddings", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          choices: [
            {
              message: {
                content: "",
                reasoning_content: '{"answer":42}',
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          object: "list",
          model: "embed",
          data: [
            { object: "embedding", index: 1, embedding: [0, 1] },
            { object: "embedding", index: 0, embedding: [1, 0] },
          ],
          usage: { prompt_tokens: 3, total_tokens: 3 },
        }),
      ) as unknown as typeof fetch;
    const client = new LMStudioClient({
      baseUrl: "http://localhost:1234",
      fetch: fetchMock,
    });

    await expect(
      client.structuredOutput<{ answer: number }>({
        model: "qwen",
        messages: [{ role: "user", content: "Give a number" }],
        schema: {
          type: "object",
          properties: { answer: { type: "number" } },
          required: ["answer"],
        },
      }),
    ).resolves.toEqual({ answer: 42 });

    const embeddings = await client.embeddings({
      model: "embed",
      input: ["one", "two"],
    });
    expect(embeddings.data.map((item) => item.embedding)).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(embeddings.usage).toEqual({ promptTokens: 3, totalTokens: 3 });
  });

  it("maps model lifecycle requests and download status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          type: "llm",
          instance_id: "qwen-instance",
          load_time_seconds: 1.25,
          status: "loaded",
          load_config: { context_length: 8192, flash_attention: true },
        }),
      )
      .mockResolvedValueOnce(Response.json({ instance_id: "qwen-instance" }))
      .mockResolvedValueOnce(
        Response.json({
          job_id: "job_123",
          status: "downloading",
          total_size_bytes: 100,
          started_at: "2026-01-01T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          job_id: "job_123",
          status: "completed",
          total_size_bytes: 100,
          downloaded_bytes: 100,
        }),
      ) as unknown as typeof fetch;
    const client = new LMStudioClient({
      baseUrl: "http://localhost:1234",
      fetch: fetchMock,
    });

    await expect(
      client.loadModel({
        model: "qwen",
        contextLength: 8192,
        flashAttention: true,
        echoLoadConfig: true,
      }),
    ).resolves.toMatchObject({
      instanceId: "qwen-instance",
      loadConfig: { contextLength: 8192, flashAttention: true },
    });
    await expect(client.unloadModel("qwen-instance")).resolves.toEqual({
      instanceId: "qwen-instance",
    });
    await expect(client.downloadModel({ model: "publisher/model" })).resolves.toMatchObject({
      jobId: "job_123",
      status: "downloading",
      totalSizeBytes: 100,
    });
    await expect(client.getDownloadStatus("job_123")).resolves.toMatchObject({
      status: "completed",
      downloadedBytes: 100,
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      model: "qwen",
      context_length: 8192,
      flash_attention: true,
      echo_load_config: true,
    });
    expect(fetchMock.mock.calls[3][0]).toBe("http://localhost:1234/api/v1/models/download/status/job_123");
  });

  it("surfaces typed HTTP errors", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        {
          error: {
            type: "model_not_found",
            message: "No such model",
            code: "missing_model",
            param: "model",
          },
        },
        { status: 404 },
      ),
    ) as unknown as typeof fetch;
    const client = new LMStudioClient({
      baseUrl: "http://localhost:1234",
      fetch: fetchMock,
    });

    const error = await client.listModels().catch((caught) => caught);
    expect(error).toMatchObject({
      name: "LMStudioError",
      message: "No such model",
      status: 404,
      type: "model_not_found",
      code: "missing_model",
      param: "model",
    });
  });
});
