import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { once } from "node:events";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";

import { resolveBaseUrl } from "../baseUrl";
import { parseGeminiRateLimit } from "./gemini";
import { post, postWithRetry, readApiResponse, stripCodeFences } from "./transport";

type HttpErrorContext = Parameters<typeof post>[0]["context"];

const makeResponse = (status: number, body = "", headers?: Record<string, string>): Response =>
  new Response(body, { status, statusText: `status-${status}`, headers });

const GEMINI_CONTEXT: HttpErrorContext = {
  provider: "gemini",
  surface: "translate",
  model: "m",
  resolvedBaseUrl: resolveBaseUrl("", "gemini", "translate"),
  parseRateLimit: parseGeminiRateLimit,
};

describe("post: HTTP status mapping", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respondWith(response: Response, context: HttpErrorContext): Promise<Response> {
    vi.mocked(fetch).mockResolvedValue(response);
    return post({ url: "https://example.test/endpoint", headers: {}, body: {}, context });
  }

  it("returns the response on 2xx", async () => {
    await expect(respondWith(makeResponse(200), GEMINI_CONTEXT)).resolves.toMatchObject({ status: 200 });
  });

  it.each([401, 403])("maps %d to invalid-api-key with the caller's surface and provider", async (status) => {
    await expect(
      respondWith(makeResponse(status), { ...GEMINI_CONTEXT, surface: "tts", provider: "openai" }),
    ).rejects.toMatchObject({
      cause: { domain: "infrastructure", kind: "invalid-api-key", surface: "tts", provider: "openai" },
    });
  });

  it("maps 404 to model-not-found and includes the model id", async () => {
    await expect(respondWith(makeResponse(404), { ...GEMINI_CONTEXT, model: "gemini-bogus" })).rejects.toMatchObject({
      cause: { domain: "infrastructure", kind: "model-not-found", surface: "translate", model: "gemini-bogus" },
    });
  });

  // 404 cannot tell a retired model from a base URL pointing at the wrong path.
  // The endpoint is named only when it is the user's, so default installs keep
  // the narrower "update your model" copy.
  it("names the endpoint host on a 404 from a custom base URL", async () => {
    await expect(
      respondWith(makeResponse(404), {
        ...GEMINI_CONTEXT,
        resolvedBaseUrl: "https://gw.corp:8443/gemini/v1beta/models",
      }),
    ).rejects.toMatchObject({ cause: { kind: "model-not-found", endpointHost: "gw.corp:8443" } });
  });

  it("leaves the endpoint host unset on a 404 from the provider's default base URL", async () => {
    await expect(respondWith(makeResponse(404), GEMINI_CONTEXT)).rejects.toMatchObject({
      cause: { kind: "model-not-found", endpointHost: undefined },
    });
    await expect(
      respondWith(makeResponse(404), {
        provider: "anthropic",
        surface: "translate",
        model: "m",
        resolvedBaseUrl: resolveBaseUrl("", "anthropic", "translate"),
      }),
    ).rejects.toMatchObject({ cause: { kind: "model-not-found", provider: "anthropic", endpointHost: undefined } });
  });

  it.each([429, 500, 503])("maps other non-ok %d to request-failed with status + body", async (status) => {
    await expect(respondWith(makeResponse(status, "server said no"), GEMINI_CONTEXT)).rejects.toMatchObject({
      cause: {
        domain: "infrastructure",
        kind: "request-failed",
        surface: "translate",
        provider: "gemini",
        status,
        body: "server said no",
      },
    });
  });

  it("extracts safe 429 quota diagnostics from Gemini error details", async () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        message:
          "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests\nPlease retry in 21s.",
        status: "RESOURCE_EXHAUSTED",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            violations: [
              {
                quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
                quotaDimensions: { location: "global", model: "gemini-3-flash-preview" },
              },
            ],
          },
          {
            "@type": "type.googleapis.com/google.rpc.RetryInfo",
            retryDelay: "21s",
          },
        ],
      },
    });

    await expect(respondWith(makeResponse(429, body), GEMINI_CONTEXT)).rejects.toMatchObject({
      cause: {
        status: 429,
        rateLimit: {
          message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests",
          quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
          quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
          quotaModel: "gemini-3-flash-preview",
          quotaLocation: "global",
          retryDelay: "21s",
        },
      },
    });
  });

  it("tolerates a 429 body the provider parser cannot read", async () => {
    await expect(respondWith(makeResponse(429, "<html>busy</html>"), GEMINI_CONTEXT)).rejects.toMatchObject({
      cause: { kind: "request-failed", status: 429, rateLimit: undefined },
    });
  });

  describe("Retry-After", () => {
    const anthropic: HttpErrorContext = {
      provider: "anthropic",
      surface: "translate",
      model: "m",
      resolvedBaseUrl: resolveBaseUrl("", "anthropic", "translate"),
    };

    it("reads delta-seconds into rateLimit.retryDelay for providers without a body parser", async () => {
      await expect(respondWith(makeResponse(429, "{}", { "retry-after": "12" }), anthropic)).rejects.toMatchObject({
        cause: { status: 429, rateLimit: { retryDelay: "12s" } },
      });
    });

    it("keeps an HTTP-date value as given", async () => {
      const date = "Wed, 21 Oct 2026 07:28:00 GMT";
      await expect(respondWith(makeResponse(503, "", { "Retry-After": date }), anthropic)).rejects.toMatchObject({
        cause: { status: 503, rateLimit: { retryDelay: date } },
      });
    });

    it("prefers the provider's own retry delay from the body over the header", async () => {
      const body = JSON.stringify({
        error: { details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "30s" }] },
      });
      await expect(respondWith(makeResponse(429, body, { "retry-after": "5" }), GEMINI_CONTEXT)).rejects.toMatchObject({
        cause: { rateLimit: { retryDelay: "30s" } },
      });
    });

    it("fills the delay from the header when the body has quota details but no delay", async () => {
      const body = JSON.stringify({ error: { message: "Quota exceeded" } });
      await expect(respondWith(makeResponse(429, body, { "retry-after": "7" }), GEMINI_CONTEXT)).rejects.toMatchObject({
        cause: { rateLimit: { message: "Quota exceeded", retryDelay: "7s" } },
      });
    });

    it("leaves rateLimit unset when there is neither a header nor a parsed body", async () => {
      await expect(respondWith(makeResponse(500, "boom"), anthropic)).rejects.toMatchObject({
        cause: { status: 500, rateLimit: undefined },
      });
    });
  });

  it("truncates oversized error bodies to 500 chars", async () => {
    const big = "x".repeat(2000);
    await expect(respondWith(makeResponse(500, big), GEMINI_CONTEXT)).rejects.toMatchObject({
      cause: { body: expect.stringMatching(/^x{500}$/) },
    });
  });
});

describe("postWithRetry", () => {
  const request = {
    url: "https://api.anthropic.com/v1/messages",
    headers: { "x-api-key": "k" },
    body: { hello: "world" },
    context: {
      provider: "anthropic",
      surface: "translate",
      model: "m",
      resolvedBaseUrl: "https://api.anthropic.com/v1",
    } satisfies HttpErrorContext,
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a JSON POST with the caller's headers", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, "{}"));
    await postWithRetry(request);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(request.url);
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": "k" },
      body: JSON.stringify(request.body),
    });
  });

  it("retries an overloaded 529 and returns the next success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(529, "overloaded")).mockResolvedValueOnce(makeResponse(200));
    const response = await postWithRetry(request);
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("maps a network TypeError to network-offline tagged with the provider", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    await expect(postWithRetry(request)).rejects.toMatchObject({
      cause: { kind: "network-offline", provider: "anthropic" },
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 400", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(400, "bad"));
    await expect(postWithRetry(request)).rejects.toThrow("request-failed");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps a status-zero response to request-failed without retrying", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.error());

    await expect(postWithRetry(request)).rejects.toMatchObject({
      cause: {
        domain: "infrastructure",
        kind: "request-failed",
        provider: "anthropic",
        surface: "translate",
        status: 0,
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe.each([
  { provider: "gemini", surface: "translate", header: "x-goog-api-key" },
  { provider: "gemini", surface: "tts", header: "x-goog-api-key" },
  { provider: "anthropic", surface: "translate", header: "x-api-key" },
  { provider: "openai", surface: "translate", header: "Authorization" },
  { provider: "openai", surface: "tts", header: "Authorization" },
  { provider: "openai-compatible", surface: "translate", header: "Authorization" },
] as const)("$provider $surface redirects", ({ provider, surface, header }) => {
  async function listen(server: Server): Promise<string> {
    const listening = once(server, "listening");
    server.listen(0, "127.0.0.1");
    await listening;
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");
    return `http://127.0.0.1:${address.port}`;
  }

  async function close(server: Server): Promise<void> {
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeAllConnections();
    });
  }

  it.each([307, 308])(
    "rejects HTTP %i without sending credentials to the redirect destination or retrying",
    async (status) => {
      const sourceHeaders: IncomingHttpHeaders[] = [];
      let destinationRequests = 0;
      let destinationUrl = "";
      const destination = createServer((request, response) => {
        destinationRequests++;
        request.resume();
        response.end("{}");
      });
      const source = createServer((request, response) => {
        sourceHeaders.push(request.headers);
        request.resume();
        response.writeHead(status, { Location: `${destinationUrl}/sink` });
        response.end("Redirect blocked");
      });

      try {
        destinationUrl = await listen(destination);
        const sourceUrl = await listen(source);
        const resolvedBaseUrl = resolveBaseUrl(sourceUrl, provider, surface);
        const credential = header === "Authorization" ? "Bearer fake-key" : "fake-key";
        const send = surface === "translate" ? postWithRetry : post;

        await expect(
          send({
            url: `${resolvedBaseUrl}/endpoint`,
            headers: { [header]: credential },
            body: { input: "cat" },
            context: { provider, surface, model: "m", resolvedBaseUrl },
          }),
        ).rejects.toMatchObject({
          cause: { domain: "infrastructure", kind: "request-failed", provider, surface, status },
        });
        expect(sourceHeaders).toHaveLength(1);
        expect(sourceHeaders[0][header.toLowerCase()]).toBe(credential);
        expect(destinationRequests).toBe(0);
      } finally {
        await Promise.all([close(source), close(destination)]);
      }
    },
  );
});

describe("readApiResponse", () => {
  const schema = z.object({ ok: z.literal(true) });
  const context = { provider: "openai", surface: "translate" } as const;

  it("returns the validated body", async () => {
    await expect(readApiResponse(makeResponse(200, '{"ok":true}'), schema, context)).resolves.toEqual({ ok: true });
  });

  it.each(["not json", '{"ok":false}'])(
    "maps an unreadable or off-schema body to invalid-response: %s",
    async (body) => {
      await expect(readApiResponse(makeResponse(200, body), schema, context)).rejects.toMatchObject({
        cause: { domain: "infrastructure", kind: "invalid-response", provider: "openai" },
      });
    },
  );
});

describe("stripCodeFences", () => {
  it.each([
    ['```json\n{"a":1}\n```', '{"a":1}'],
    ['```\n{"a":1}\n```', '{"a":1}'],
    ['  {"a":1}  ', '{"a":1}'],
    ['{"a":"```"}', '{"a":"```"}'],
  ])("unwraps %j", (input, expected) => {
    expect(stripCodeFences(input)).toBe(expected);
  });
});
