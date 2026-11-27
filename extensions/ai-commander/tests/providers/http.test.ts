import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "../../src/core/errors";
import { errorFromPayload, errorFromStatus, fetchJson, fetchStream, IDLE_TIMEOUT_MS } from "../../src/providers/http";
import { bytes, hangingFetch, jsonResponse, stubFetch } from "./helpers";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const body = (message: string, extra: Record<string, unknown> = {}) => JSON.stringify({ error: { message, ...extra } });

async function failure(run: () => Promise<unknown>): Promise<ProviderError> {
  const error = await run().then(
    () => undefined,
    (cause: unknown) => cause,
  );
  expect(error).toBeInstanceOf(ProviderError);
  return error as ProviderError;
}

async function drain(stream: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const chunk of stream) expect(chunk).toBeDefined();
}

describe("errorFromStatus", () => {
  it.each([
    [401, "auth"],
    [403, "auth"],
    [404, "model-not-found"],
    [402, "out-of-credits"],
    [429, "rate-limit"],
    [408, "timeout"],
    [500, "provider-down"],
    [503, "provider-down"],
    [529, "provider-down"],
    [400, "invalid-parameter"],
    [413, "invalid-parameter"],
    [422, "invalid-parameter"],
    [418, "unknown"],
  ])("maps %i to %s", (status, kind) => {
    const error = errorFromStatus("openai", status, body("nope"));
    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
    expect(error.provider).toBe("openai");
  });

  it("copes with bodies that are not JSON", () => {
    expect(errorFromStatus("openai", 502, "<html>Bad Gateway</html>").kind).toBe("provider-down");
  });

  it("names the rejected key without quoting it, and leaves the title to the UI", () => {
    const key = "sk-abcdefghijklmnop1234";
    const error = errorFromStatus("openai", 401, body(`Incorrect API key provided: ${key}`));
    expect(error.message).toBe("OpenAI rejected the key. Check it in the extension preferences.");
    expect(error.message).not.toContain(key);
  });

  it("tells missing credits apart from rate limits", () => {
    expect(errorFromStatus("openrouter", 402, body("Insufficient credits")).message).toContain("no credits left");
    expect(errorFromStatus("openrouter", 429, body("Slow down")).message).toContain("limiting requests");
  });

  it("recognizes Gemini's 400 for a bad key, also in array form", () => {
    const payload = JSON.stringify([
      { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } },
    ]);
    expect(errorFromStatus("gemini", 400, payload).kind).toBe("auth");
  });

  it("recognizes an unknown model reported as 400", () => {
    expect(errorFromStatus("openrouter", 400, body("foo/bar is not a valid model ID")).kind).toBe("model-not-found");
    expect(errorFromStatus("openai", 400, body("x", { code: "model_not_found" })).kind).toBe("model-not-found");
  });

  it("explains rejected parameters using the provider's words", () => {
    const error = errorFromStatus(
      "openai",
      400,
      body("Unsupported parameter: 'temperature' is not supported with this model.", { param: "temperature" }),
    );
    expect(error.kind).toBe("invalid-parameter");
    expect(error.message).toContain("temperature");
  });

  it("masks secrets in provider details", () => {
    const error = errorFromStatus("openai", 400, body("bad header Bearer abcdefghijklmnop"));
    expect(error.message).not.toContain("abcdefghijklmnop");
    expect(error.message).toContain("[redacted]");
  });

  it("drops details that quote the user's text", () => {
    const user = "Our secret merger with Acme closes on Friday at noon";
    const message = "Invalid content near 'merger with Acme closes on Friday' in request";
    const error = errorFromStatus("anthropic", 400, body(message), { sensitive: [user] });
    expect(error.kind).toBe("invalid-parameter");
    expect(error.message).toBe("Anthropic rejected the request");
  });

  it("caps long details", () => {
    expect(errorFromStatus("openai", 400, body("x".repeat(5000))).message.length).toBeLessThan(260);
  });

  it("does not take the message from moderation metadata", () => {
    const error = errorFromStatus(
      "openrouter",
      403,
      JSON.stringify({
        error: {
          code: 403,
          message: "Input flagged",
          metadata: { reasons: ["x"], flagged_input: "the user's text", provider_name: "p", model_slug: "m" },
        },
      }),
    );
    expect(error.kind).toBe("refusal");
    expect(error.message).not.toContain("the user's text");
  });

  describe("OpenRouter routing", () => {
    const strict = { restricted: true };

    it("detects the data policy failure", () => {
      const message = "No endpoints found matching your data policy (Zero data retention). Configure: https://x";
      const error = errorFromStatus("openrouter", 404, body(message, { code: 404 }), strict);
      expect(error.kind).toBe("no-strict-endpoint");
      expect(error.message).toBe("Choose another model, or change the privacy mode in Models & Providers.");
    });

    it("detects account-level policy failures too", () => {
      const message =
        "0 endpoints out of 3 requested are available matching your guardrail restrictions and data policy";
      expect(errorFromStatus("openrouter", 404, body(message)).kind).toBe("no-strict-endpoint");
    });

    it("detects ignore-list and 503 routing failures while restricted", () => {
      const ignored = "No allowed providers are available for the selected model.";
      expect(errorFromStatus("openrouter", 404, body(ignored), strict).kind).toBe("no-strict-endpoint");
      const routing = "No available provider meets the routing requirements";
      expect(errorFromStatus("openrouter", 503, body(routing), strict).kind).toBe("no-strict-endpoint");
    });

    it("keeps the plain meaning when nothing is restricted", () => {
      expect(errorFromStatus("openrouter", 404, body("No endpoints found for x/y.")).kind).toBe("model-not-found");
      expect(errorFromStatus("openrouter", 503, body("No available provider")).kind).toBe("provider-down");
    });

    it("separates parameter routing failures from privacy", () => {
      const message = "No endpoints found that support the provided 'temperature' value.";
      expect(errorFromStatus("openrouter", 404, body(message), strict).kind).toBe("invalid-parameter");
    });

    it("does not apply to other providers", () => {
      expect(errorFromStatus("openai", 404, body("data policy"), strict).kind).toBe("model-not-found");
    });
  });
});

describe("errorFromPayload", () => {
  it.each([
    ["overloaded_error", "provider-down"],
    ["rate_limit_error", "rate-limit"],
    ["authentication_error", "auth"],
    ["invalid_request_error", "invalid-parameter"],
    ["api_error", "provider-down"],
  ])("maps Anthropic type %s to %s", (type, kind) => {
    expect(errorFromPayload("anthropic", { type: "error", error: { type, message: "m" } }).kind).toBe(kind);
  });

  it("uses OpenRouter's numeric code", () => {
    const error = errorFromPayload("openrouter", { error: { code: 502, message: "Provider returned error" } });
    expect(error.kind).toBe("provider-down");
    expect(error.status).toBe(502);
  });

  it("falls back to unknown for unnamed errors", () => {
    expect(errorFromPayload("openai", { error: { message: "strange" } }).kind).toBe("unknown");
  });
});

describe("fetchJson", () => {
  it("sends GET without a body and returns parsed JSON", async () => {
    const calls = stubFetch(jsonResponse({ ok: true }));
    const result = await fetchJson({ provider: "openai", url: "https://x.test/a", headers: { a: "b" } });
    expect(result).toEqual({ ok: true });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.headers).toEqual({ a: "b" });
  });

  it("maps HTTP errors", async () => {
    stubFetch(jsonResponse({ error: { message: "no" } }, 429));
    const error = await failure(() => fetchJson({ provider: "openai", url: "https://x.test", headers: {} }));
    expect(error.kind).toBe("rate-limit");
  });

  it("hides the cause of network failures", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed https://secret.test/?key=abc");
    });
    const error = await failure(() => fetchJson({ provider: "gemini", url: "https://x.test", headers: {} }));
    expect(error.kind).toBe("network");
    expect(error.message).toBe("Could not reach Gemini. Check your connection.");
  });

  it("fails on invalid JSON", async () => {
    stubFetch(new Response("<html>"));
    const error = await failure(() => fetchJson({ provider: "openai", url: "https://x.test", headers: {} }));
    expect(error.kind).toBe("unknown");
  });
});

describe("fetchStream", () => {
  const request = { provider: "openai" as const, url: "https://x.test", headers: {}, body: {} };

  it("times out without any response", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());
    const pending = failure(() => drain(fetchStream(request)));
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS + 1);
    expect((await pending).kind).toBe("timeout");
  });

  it("times out when data stops, but not while it flows", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", (): Promise<Response> => {
      let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
        },
      });
      // No total limit: this stream outlives the idle limit several times over.
      const interval = setInterval(() => controller?.enqueue(bytes(": keepalive\n")), IDLE_TIMEOUT_MS / 2);
      setTimeout(() => {
        clearInterval(interval);
        controller?.close();
      }, IDLE_TIMEOUT_MS * 5);
      return Promise.resolve(new Response(stream, { headers: { "content-type": "text/event-stream" } }));
    });
    let chunks = 0;
    const done = (async () => {
      for await (const chunk of fetchStream(request)) chunks += chunk.length > 0 ? 1 : 0;
    })();
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS * 5 + 1);
    await done;
    expect(chunks).toBeGreaterThan(5);
  });

  it("reports a stalled stream as timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch(": first\n"));
    const pending = failure(() => drain(fetchStream(request)));
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS + 1);
    expect((await pending).kind).toBe("timeout");
  });

  it("reports the caller's abort as aborted", async () => {
    vi.stubGlobal("fetch", hangingFetch(": first\n"));
    const controller = new AbortController();
    const pending = failure(() => drain(fetchStream({ ...request, signal: controller.signal })));
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();
    expect((await pending).kind).toBe("aborted");
  });

  it("does not start when already aborted", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const error = await failure(() => drain(fetchStream({ ...request, signal: AbortSignal.abort() })));
    expect(error.kind).toBe("aborted");
  });

  it("removes its timer and abort listener afterwards", async () => {
    vi.useFakeTimers();
    stubFetch(new Response(new ReadableStream({ start: (c) => c.close() })));
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    await drain(fetchStream({ ...request, signal: controller.signal }));
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalled();
  });

  it("cancels the connection when the consumer stops early", async () => {
    const cancel = vi.fn();
    stubFetch(
      new Response(
        new ReadableStream<Uint8Array>({
          pull: (c) => c.enqueue(bytes("data: x\n\n")),
          cancel,
        }),
      ),
    );
    for await (const chunk of fetchStream(request)) {
      expect(chunk).toBeDefined();
      break;
    }
    expect(cancel).toHaveBeenCalled();
  });

  it("treats a JSON error under status 200 as a failure", async () => {
    stubFetch(jsonResponse({ error: { code: 502, message: "Provider returned error" } }));
    const error = await failure(() => drain(fetchStream(request)));
    expect(error.kind).toBe("provider-down");
  });
});
