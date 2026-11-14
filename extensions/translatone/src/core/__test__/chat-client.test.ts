import { describe, expect, test } from "bun:test";
import { requestCompletion, type Fetch } from "../chat-client";
import { ProviderError } from "../errors";
import {
  completionResponse,
  providerConfig,
  rejectionOf,
  scriptedFetch,
  sseEvent,
  streamResponse,
} from "./test-helpers";

const groq = providerConfig("groq");

const stallingFetch: Fetch = async (_url, init) =>
  streamResponse({ chunks: [sseEvent("Hel")], ending: "hang", signal: init.signal });

const hangingFetch: Fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

function respondWith(response: () => Promise<Response>) {
  return scriptedFetch(new Map([["groq.test", response]]));
}

async function captureError(promise: Promise<unknown>): Promise<ProviderError> {
  const error = await rejectionOf(promise);
  if (!(error instanceof ProviderError)) {
    throw new Error(`Expected ProviderError, received ${String(error)}`);
  }
  return error;
}

describe("requestCompletion", () => {
  test("omits sampling parameters unsupported by the default OpenAI model", async () => {
    const { fetch, calls } = respondWith(async () => completionResponse("Halo"));

    await requestCompletion(fetch, {
      provider: providerConfig("openai", { baseUrl: groq.baseUrl, model: "gpt-5-mini" }),
      systemPrompt: "system",
      text: "Hello",
    });

    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).not.toHaveProperty("temperature");
  });

  test("redacts an echoed API key before shortening provider errors", async () => {
    const apiKey = `example-secret-${"x".repeat(400)}`;
    const { fetch } = respondWith(async () =>
      Response.json({ error: { message: `Rejected ${apiKey}` } }, { status: 401 }),
    );

    const error = await captureError(
      requestCompletion(fetch, {
        provider: { ...groq, apiKey },
        systemPrompt: "system",
        text: "Hello",
      }),
    );

    expect(error.message).toBe("Rejected [REDACTED]");
  });

  test("redacts transport error messages and causes before exposing them", async () => {
    const provider = providerConfig("custom", {
      baseUrl: "https://user:pass@custom.test/v1?token=secret",
      apiKey: "example-key",
    });
    const error = await captureError(
      requestCompletion(
        async () => {
          throw new Error(
            "Could not send example-key to https://user:pass@custom.test/v1?token=secret",
          );
        },
        { provider, systemPrompt: "system", text: "Hello" },
      ),
    );

    expect(error.message).toBe("Could not reach https://custom.test/v1.");
    expect(error.cause instanceof Error ? error.cause.message : error.cause).toBe(
      "Could not send [REDACTED] to https://custom.test/v1",
    );
  });

  test("sends an OpenAI-compatible request and returns the trimmed content", async () => {
    const { fetch, calls } = respondWith(async () =>
      completionResponse("  Halo  ", { headers: { "x-request-id": "req_1" } }),
    );

    const completion = await requestCompletion(fetch, {
      provider: groq,
      systemPrompt: "system",
      text: "Hello",
    });

    expect(completion).toEqual({ text: "Halo", requestId: "req_1" });
    expect(calls[0]?.url).toBe("https://groq.test/v1/chat/completions");
    expect(calls[0]?.init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer groq-key",
    });
    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).toMatchObject({
      model: "groq-model",
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "Hello" },
      ],
    });
  });

  test("reads the request ID from a plain request-id header", async () => {
    const { fetch } = respondWith(async () =>
      completionResponse("Halo", { headers: { "request-id": "req_anthropic" } }),
    );

    const completion = await requestCompletion(fetch, {
      provider: groq,
      systemPrompt: "system",
      text: "Hello",
    });

    expect(completion.requestId).toBe("req_anthropic");
  });

  test("omits the authorization header when there is no API key", async () => {
    const { fetch, calls } = respondWith(async () => completionResponse("Halo"));

    await requestCompletion(fetch, {
      provider: providerConfig("groq", { apiKey: undefined }),
      systemPrompt: "system",
      text: "Hello",
    });

    expect(calls[0]?.init.headers).toEqual({ "Content-Type": "application/json" });
  });

  test.each([
    [401, "unauthorized", false],
    [403, "unauthorized", false],
    [429, "rate_limited", true],
    [503, "server", true],
    [404, "model_unavailable", true],
    [400, "request_rejected", false],
  ] as const)("maps HTTP %i to %s", async (status, reason, recoverable) => {
    const { fetch } = respondWith(async () => new Response("provider says no", { status }));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe(reason);
    expect(error.status).toBe(status);
    expect(error.recoverable).toBe(recoverable);
    expect(error.message).toBe("provider says no");
  });

  test.each([
    ["an OpenAI-style error object", { error: { message: "The model `x` does not exist." } }],
    ["a Gemini-style error array", [{ error: { message: "The model `x` does not exist." } }]],
  ])("uses the provider's message from %s", async (_label, body) => {
    const { fetch } = respondWith(async () => Response.json(body, { status: 404 }));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.message).toBe("The model `x` does not exist.");
  });

  test("reports a network failure as recoverable", async () => {
    const { fetch } = respondWith(() => Promise.reject(new TypeError("fetch failed")));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("network");
    expect(error.recoverable).toBe(true);
  });

  test("reports a slow provider as a recoverable timeout", async () => {
    const error = await captureError(
      requestCompletion(
        hangingFetch,
        { provider: groq, systemPrompt: "system", text: "Hello" },
        { timeoutMs: 5 },
      ),
    );

    expect(error.reason).toBe("timeout");
    expect(error.recoverable).toBe(true);
    expect(error.message).toBe("No response after 5 ms.");
  });

  test("falls back to the HTTP status when the error body cannot be read", async () => {
    const brokenBody = new ReadableStream({
      start: (controller) => controller.error(new Error("stream broke")),
    });
    const { fetch } = respondWith(async () => new Response(brokenBody, { status: 502 }));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("server");
    expect(error.message).toBe("HTTP 502");
  });

  test("rejects a response that is not JSON", async () => {
    const { fetch } = respondWith(async () => new Response("<html>oops</html>"));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("bad_response");
    expect(error.status).toBe(200);
  });

  test("rethrows when the caller aborts", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Aborted", "AbortError");
    const { fetch } = respondWith(() => {
      controller.abort();
      return Promise.reject(abortError);
    });

    const result = requestCompletion(fetch, {
      provider: groq,
      systemPrompt: "system",
      text: "Hello",
      signal: controller.signal,
    });

    expect(await rejectionOf(result)).toBe(abortError);
  });
});

describe("requestCompletion streaming", () => {
  const request = { provider: groq, systemPrompt: "system", text: "Halo dunia" };

  test("accepts a clean stream ending with finish_reason stop without DONE", async () => {
    const { fetch } = respondWith(async () =>
      streamResponse({
        chunks: [sseEvent("Hello"), 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'],
      }),
    );

    const completion = await requestCompletion(fetch, request, { onDelta: () => undefined });

    expect(completion.text).toBe("Hello");
  });

  test("rejects a stream that ends without a completion marker", async () => {
    const { fetch } = respondWith(async () => streamResponse({ chunks: [sseEvent("Partial")] }));

    const error = await captureError(
      requestCompletion(fetch, request, { onDelta: () => undefined }),
    );

    expect(error.reason).toBe("network");
    expect(error.recoverable).toBe(true);
  });

  test("reports a missing completion signal as an interrupted response with HTTP context", async () => {
    const { fetch } = respondWith(
      async () =>
        new Response(sseEvent("Partial"), {
          headers: { "Content-Type": "text/event-stream", "x-request-id": "stream_request" },
        }),
    );

    const error = await captureError(
      requestCompletion(fetch, request, { onDelta: () => undefined }),
    );

    expect(error).toMatchObject({ reason: "network", status: 200, requestId: "stream_request" });
    expect(error.summary).toBe("Groq: response interrupted");
  });

  test("rejects a provider error event even after receiving text", async () => {
    const { fetch } = respondWith(async () =>
      streamResponse({
        chunks: [
          sseEvent("Partial"),
          'data: {"error":{"message":"server failed"}}\n\ndata: [DONE]\n\n',
        ],
      }),
    );

    const error = await captureError(
      requestCompletion(fetch, request, { onDelta: () => undefined }),
    );

    expect(error.reason).toBe("server");
    expect(error.recoverable).toBe(true);
  });

  test("rejects malformed stream data instead of returning partial text", async () => {
    const { fetch } = respondWith(async () =>
      streamResponse({ chunks: [sseEvent("Hello"), "data: {broken-json\n\ndata: [DONE]\n\n"] }),
    );

    const error = await captureError(
      requestCompletion(fetch, request, { onDelta: () => undefined }),
    );

    expect(error.reason).toBe("bad_response");
  });

  test.each(["length", "content_filter"])("rejects a stream finished with %s", async (reason) => {
    const { fetch } = respondWith(async () =>
      streamResponse({
        chunks: [
          sseEvent("Partial"),
          `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] })}\n\ndata: [DONE]\n\n`,
        ],
      }),
    );

    const error = await captureError(
      requestCompletion(fetch, request, { onDelta: () => undefined }),
    );

    expect(error.reason).toBe("bad_response");
  });

  test("asks for a stream and reports the text as it grows", async () => {
    const { fetch, calls } = respondWith(async () =>
      streamResponse({
        chunks: [
          sseEvent("Hel"),
          `${sseEvent("lo")}${sseEvent(" world").slice(0, 12)}`,
          `${sseEvent(" world").slice(12)}data: [DONE]\n\n`,
        ],
      }),
    );
    const updates: string[] = [];

    const completion = await requestCompletion(fetch, request, {
      onDelta: (text) => updates.push(text),
    });

    expect(updates).toEqual(["Hel", "Hello", "Hello world"]);
    expect(completion.text).toBe("Hello world");
    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).toMatchObject({ stream: true });
  });

  test("does not ask for a stream without a listener", async () => {
    const { fetch, calls } = respondWith(async () => completionResponse("Hello"));

    await requestCompletion(fetch, request);

    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).not.toHaveProperty("stream");
  });

  test("ignores comments, blank events, and non-content events", async () => {
    const { fetch } = respondWith(async () =>
      streamResponse({
        chunks: [
          ": keep-alive\n\n",
          'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
          'data: {"usage":{"total_tokens":10}}\n\n',
          sseEvent("Hello"),
          "data: [DONE]\n\n",
        ],
      }),
    );
    const updates: string[] = [];

    const completion = await requestCompletion(fetch, request, {
      onDelta: (text) => updates.push(text),
    });

    expect(updates).toEqual(["Hello"]);
    expect(completion.text).toBe("Hello");
  });

  test("reports the whole text once when the provider answers without streaming", async () => {
    const { fetch } = respondWith(async () => completionResponse("Hello"));
    const updates: string[] = [];

    const completion = await requestCompletion(fetch, request, {
      onDelta: (text) => updates.push(text),
    });

    expect(updates).toEqual(["Hello"]);
    expect(completion.text).toBe("Hello");
  });

  test("rejects a stream that carries no text", async () => {
    const { fetch } = respondWith(async () => streamResponse({ chunks: ["data: [DONE]\n\n"] }));

    const error = await captureError(
      requestCompletion(fetch, request, { onDelta: () => undefined }),
    );

    expect(error.reason).toBe("bad_response");
  });

  test("treats a dropped stream as a recoverable network failure", async () => {
    const { fetch } = respondWith(async () =>
      streamResponse({ chunks: [sseEvent("Hel")], ending: "error" }),
    );

    const error = await captureError(
      requestCompletion(fetch, request, { onDelta: () => undefined }),
    );

    expect(error.reason).toBe("network");
    expect(error.recoverable).toBe(true);
  });

  test("times out a stream that stops sending", async () => {
    const error = await captureError(
      requestCompletion(stallingFetch, request, { timeoutMs: 5, onDelta: () => undefined }),
    );

    expect(error.reason).toBe("timeout");
  });

  test("rethrows when the caller aborts mid-stream", async () => {
    const controller = new AbortController();

    const result = requestCompletion(
      stallingFetch,
      { ...request, signal: controller.signal },
      { onDelta: () => controller.abort() },
    );

    expect(await rejectionOf(result)).toBeInstanceOf(DOMException);
  });
});

describe("requestCompletion responses", () => {
  test("rejects a non-streaming response truncated by the output limit", async () => {
    const { fetch } = respondWith(async () =>
      Response.json({
        choices: [{ message: { content: "Partial" }, finish_reason: "length" }],
      }),
    );

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("bad_response");
  });
  test("rejects a response without content", async () => {
    const { fetch } = respondWith(async () => Response.json({ choices: [] }));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("bad_response");
  });
});
