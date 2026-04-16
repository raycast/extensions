import { afterEach, describe, expect, it, vi } from "vitest";
import { requestChatCompletion } from "../src/lib/openai-compatible-client";
import { OpenAIHttpError, OpenAIResponseError } from "../src/lib/errors";

const stubFetch = (payload: unknown, ok = true, status = 200) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  }));

function createSseBody(events: string[]) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    },
  });
}

describe("requestChatCompletion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("应解析标准 chat completions 响应", async () => {
    stubFetch({ choices: [{ message: { content: "hello" } }] });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("hello");
  });

  it("应解析 content 数组中的文本片段", async () => {
    stubFetch({
      choices: [
        {
          message: {
            content: [
              {
                type: "text",
                text: "hello from parts",
              },
            ],
          },
        },
      ],
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("hello from parts");
  });

  it("应解析 content 对象中的 text 字段", async () => {
    stubFetch({
      choices: [
        {
          message: {
            content: {
              type: "text",
              text: "hello from object",
            },
          },
        },
      ],
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("hello from object");
  });

  it("应递归解析 content 对象中的 result 字段", async () => {
    stubFetch({
      choices: [
        {
          message: {
            content: {
              kind: "translation",
              result: "hello from result",
            },
          },
        },
      ],
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("hello from result");
  });

  it("message.content 为空时应继续解析 message 上的 text 字段", async () => {
    stubFetch({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            text: "hello from message",
          },
        },
      ],
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("hello from message");
  });

  it("应解析 choices[0].text 形式的兼容响应", async () => {
    stubFetch({
      choices: [{ text: "legacy text" }],
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("legacy text");
  });

  it("应解析 output_text 形式的兼容响应", async () => {
    stubFetch({
      output_text: "output text result",
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("output text result");
  });

  it("base url 已包含 chat/completions 时不应重复拼接路径", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "hello" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestChatCompletion({
      baseUrl: "https://api.example.com/v1/chat/completions",
      apiKey: "sk-test",
      model: "test-model",
      messages: [],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.any(Object),
    );
  });

  it("应在 HTTP 错误时抛出 OpenAIHttpError", async () => {
    stubFetch({ error: "bad" }, false, 502);

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).rejects.toBeInstanceOf(OpenAIHttpError);
  });

  it("HTTP 错误时应优先展示代理返回的错误消息", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({
          error: {
            message: "unknown provider for model gpt-5.4-mini-2026-03-17",
          },
        }),
      }),
    );

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "gpt-5.4-mini-2026-03-17",
        messages: [],
      }),
    ).rejects.toThrow("unknown provider for model gpt-5.4-mini-2026-03-17");
  });

  it("应在响应格式不合法时抛出 OpenAIResponseError", async () => {
    stubFetch({ choices: [] });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).rejects.toBeInstanceOf(OpenAIResponseError);
  });

  it("解析失败时应附带完整响应 JSON", async () => {
    stubFetch({
      id: "resp_123",
      choices: [],
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).rejects.toThrow('"id": "resp_123"');
  });

  it("应透传响应中的错误消息", async () => {
    stubFetch({
      error: {
        message: "provider says no",
      },
    });

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).rejects.toThrow("provider says no");
  });

  it("非流式 chat completions 返回空 content 时应回退解析 SSE", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "resp_1",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: null,
                reasoning_content: null,
                tool_calls: null,
              },
              finish_reason: "stop",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("stream fallback should not call json");
        },
        body: createSseBody([
          'data: {"id":"resp_1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}\n\n',
          'data: {"id":"resp_1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"."},"finish_reason":null}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("Hello.");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "text/event-stream",
        }),
      }),
    );
  });
});
