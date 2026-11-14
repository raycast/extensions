import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  McpClient,
  McpHttpError,
  McpRpcError,
  McpToolError,
  McpNetworkError,
  McpUnauthorizedError,
  PROTOCOL_VERSION,
  UNREACHABLE,
  describeRefusal,
  isTransient,
  retryAfterMs,
  parseEventStream,
  parseToolResult,
} from "../src/lib/mcp.ts";

type Sent = {
  url: string;
  headers: Record<string, string>;
  body: { id?: number; method: string; params?: unknown };
  signal?: AbortSignal | null;
};

type Reply = (sent: Sent) => Response | Promise<Response>;

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

function rpcResult(id: number | undefined, result: unknown, headers: Record<string, string> = {}): Response {
  return json({ jsonrpc: "2.0", id, result }, { headers });
}

function initialized(id: number | undefined, headers: Record<string, string> = {}): Response {
  return rpcResult(
    id,
    { protocolVersion: PROTOCOL_VERSION, capabilities: {}, serverInfo: { name: "socialfaktory" } },
    headers,
  );
}

function server(replies: Record<string, Reply | Reply[]>, timeoutMs?: number) {
  const sent: Sent[] = [];
  const counts: Record<string, number> = {};
  const fetch = async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const request = { url, headers: init.headers as Record<string, string>, body, signal: init.signal };
    sent.push(request);
    const key = body.method === "tools/call" ? `tools/call:${body.params.name}` : body.method;
    const reply = replies[key];
    if (!reply) return new Response(null, { status: 202 });
    const index = counts[key] ?? 0;
    counts[key] = index + 1;
    const handler = Array.isArray(reply) ? reply[Math.min(index, reply.length - 1)] : reply;
    return handler(request);
  };
  const client = new McpClient({
    url: "https://example.test/mcp",
    token: "secret",
    clientName: "test",
    clientVersion: "1.0.0",
    fetch,
    timeoutMs,
  });
  return { client, sent };
}

function hang(request: Sent): Promise<Response> {
  return new Promise((_resolve, reject) => {
    if (request.signal?.aborted) reject(request.signal.reason);
    request.signal?.addEventListener("abort", () => reject(request.signal?.reason));
  });
}

describe("McpClient", () => {
  it("initializes, acknowledges and then calls the tool with the bearer token", async () => {
    const { client, sent } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:get_wallet": (request) =>
        rpcResult(request.body.id, {
          content: [{ type: "text", text: "{}" }],
          structuredContent: { available_balance: 40, reserved_balance: 3, total_balance: 43 },
        }),
    });

    const wallet = await client.callTool("get_wallet");

    assert.deepEqual(wallet, { available_balance: 40, reserved_balance: 3, total_balance: 43 });
    assert.deepEqual(
      sent.map((request) => request.body.method),
      ["initialize", "notifications/initialized", "tools/call"],
    );
    assert.equal(sent[0].headers.Authorization, "Bearer secret");
    assert.equal(sent[0].headers.Accept, "application/json, text/event-stream");
    assert.equal(sent[0].headers["MCP-Protocol-Version"], undefined);
    assert.equal(sent[2].headers["MCP-Protocol-Version"], PROTOCOL_VERSION);
    assert.deepEqual(sent[2].body.params, { name: "get_wallet", arguments: {} });
  });

  it("initializes once for several calls", async () => {
    const { client, sent } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:list_brands": (request) => rpcResult(request.body.id, { structuredContent: { brands: [] } }),
    });

    await client.callTool("list_brands");
    await client.callTool("list_brands");

    assert.equal(sent.filter((request) => request.body.method === "initialize").length, 1);
  });

  it("sends back the session id the server hands out", async () => {
    const { client, sent } = server({
      initialize: (request) => initialized(request.body.id, { "Mcp-Session-Id": "session-1" }),
      "tools/call:list_brands": (request) => rpcResult(request.body.id, { structuredContent: { brands: [] } }),
    });

    await client.callTool("list_brands");

    assert.equal(sent[0].headers["Mcp-Session-Id"], undefined);
    assert.equal(sent[1].headers["Mcp-Session-Id"], "session-1");
    assert.equal(sent[2].headers["Mcp-Session-Id"], "session-1");
  });

  it("starts a new session when the server forgets the old one", async () => {
    let sessions = 0;
    const { client, sent } = server({
      initialize: (request) => initialized(request.body.id, { "Mcp-Session-Id": `session-${++sessions}` }),
      "tools/call:list_brands": [
        () => new Response("", { status: 404 }),
        (request) => rpcResult(request.body.id, { structuredContent: { brands: [] } }),
      ],
    });

    assert.deepEqual(await client.callTool("list_brands"), { brands: [] });
    assert.equal(sent.filter((request) => request.body.method === "initialize").length, 2);
    assert.equal(sent.at(-1)?.headers["Mcp-Session-Id"], "session-2");
  });

  it("reads the answer from an event stream", async () => {
    const { client } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:list_brands": (request) =>
        new Response(
          `event: message\ndata: {"jsonrpc":"2.0","method":"notifications/progress","params":{}}\n\n` +
            `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: request.body.id, result: { structuredContent: { brands: [{ id: "brand_1" }] } } })}\n\n`,
          { headers: { "Content-Type": "text/event-stream" } },
        ),
    });

    assert.deepEqual(await client.callTool("list_brands"), { brands: [{ id: "brand_1" }] });
  });

  it("raises an unauthorized error on 401", async () => {
    const { client } = server({
      initialize: () =>
        json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "unauthorized" } }, { status: 401 }),
    });

    await assert.rejects(client.callTool("list_brands"), McpUnauthorizedError);
  });

  it("initializes again after a failed handshake", async () => {
    const { client, sent } = server({
      initialize: [() => new Response("", { status: 503 }), (request) => initialized(request.body.id)],
      "tools/call:list_brands": (request) => rpcResult(request.body.id, { structuredContent: { brands: [] } }),
    });

    await assert.rejects(client.callTool("list_brands"), McpHttpError);
    assert.deepEqual(await client.callTool("list_brands"), { brands: [] });
    assert.equal(sent.filter((request) => request.body.method === "initialize").length, 2);
  });

  it("raises JSON-RPC errors", async () => {
    const { client } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:list_brands": (request) =>
        json({ jsonrpc: "2.0", id: request.body.id, error: { code: -32602, message: "Invalid params" } }),
    });

    await assert.rejects(client.callTool("list_brands"), (error: unknown) => {
      assert.ok(error instanceof McpRpcError);
      assert.equal(error.code, -32602);
      assert.equal(error.message, "Invalid params");
      return true;
    });
  });

  it("raises the refusal of a tool error envelope", async () => {
    const { client } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:generate_text": (request) =>
        rpcResult(request.body.id, {
          isError: true,
          content: [{ type: "text", text: "insufficient_tokens" }],
          structuredContent: { kind: "insufficient_tokens", balance: 1, required: 3 },
        }),
    });

    await assert.rejects(client.callTool("generate_text", { brand_id: "brand_1" }), (error: unknown) => {
      assert.ok(error instanceof McpToolError);
      assert.equal(error.kind, "insufficient_tokens");
      assert.deepEqual(error.details, { balance: 1, required: 3 });
      assert.equal(error.message, "Not enough credits: 1 available, 3 needed.");
      return true;
    });
  });
});

describe("McpClient failures", () => {
  it("names a rate limit whose body is not JSON-RPC and keeps Retry-After", async () => {
    const { client } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:list_posts": () =>
        json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": "42" } },
        ),
    });

    await assert.rejects(client.callTool("list_posts"), (error: unknown) => {
      assert.ok(error instanceof McpHttpError);
      assert.equal(error.status, 429);
      assert.equal(error.message, "Too many requests. Try again in 42 seconds.");
      assert.equal(error.retryAfter, 42);
      return true;
    });
  });

  it("names a rate limit without Retry-After", async () => {
    const { client } = server({
      initialize: () => json({ error: "Too many requests" }, { status: 429 }),
    });

    await assert.rejects(client.callTool("list_posts"), {
      name: "McpHttpError",
      message: "Too many requests. Try again in a minute.",
    });
  });

  it("rounds a long Retry-After to minutes", async () => {
    const { client } = server({
      initialize: () => new Response("slow down", { status: 429, headers: { "Retry-After": "300" } }),
    });

    await assert.rejects(client.callTool("list_posts"), { message: "Too many requests. Try again in 5 minutes." });
  });

  it("does not mistake a string error for a JSON-RPC error", async () => {
    const { client } = server({
      initialize: () => json({ error: "Forbidden" }, { status: 403 }),
    });

    await assert.rejects(client.callTool("list_posts"), (error: unknown) => {
      assert.ok(error instanceof McpHttpError);
      assert.equal(error.status, 403);
      assert.equal(error.message, "SocialFaktory answered 403");
      return true;
    });
  });

  it("reports an empty answer to a request as no answer", async () => {
    const { client } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:list_posts": () => new Response(null, { status: 202 }),
    });

    await assert.rejects(client.callTool("list_posts"), { message: "SocialFaktory sent no answer to the request" });
  });
});

describe("McpClient requests", () => {
  it("gives up on a request that does not answer in time", async () => {
    const { client } = server({ initialize: hang }, 20);

    await assert.rejects(client.callTool("list_posts"), (error: unknown) => {
      assert.ok(error instanceof McpNetworkError);
      assert.equal(error.message, "SocialFaktory took too long to answer.");
      assert.equal(error.timedOut, true);
      return true;
    });
  });

  it("names a network failure", async () => {
    const { client } = server({
      initialize: () => {
        throw new TypeError("fetch failed");
      },
    });

    await assert.rejects(client.callTool("list_posts"), (error: unknown) => {
      assert.ok(error instanceof McpNetworkError);
      assert.equal(error.message, UNREACHABLE);
      assert.equal(error.unsent, true);
      return true;
    });
  });

  it("marks a failed tool call as possibly sent", async () => {
    const { client } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:generate_text": () => {
        throw new TypeError("fetch failed");
      },
    });

    await assert.rejects(client.callTool("generate_text"), (error: unknown) => {
      assert.ok(error instanceof McpNetworkError);
      assert.equal(error.unsent, false);
      return true;
    });
  });

  it("passes the caller's abort signal to the tool call and stops when it fires", async () => {
    const controller = new AbortController();
    const { client, sent } = server({
      initialize: (request) => initialized(request.body.id),
      "tools/call:get_text_generation": (request) => {
        controller.abort();
        return hang(request);
      },
    });

    await assert.rejects(
      client.callTool("get_text_generation", {}, { signal: controller.signal }),
      (error: unknown) => {
        assert.ok(!(error instanceof McpNetworkError));
        assert.equal((error as Error).name, "AbortError");
        return true;
      },
    );
    assert.equal(sent.at(-1)?.signal?.aborted, true);
  });

  it("lets one call wait longer than the default timeout", async () => {
    const slowly = (request: Sent) =>
      new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(
          () => resolve(rpcResult(request.body.id, { structuredContent: { text_generation_id: "wgen_1" } })),
          60,
        );
        request.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(request.signal?.reason);
        });
      });
    const { client } = server(
      { initialize: (request) => initialized(request.body.id), "tools/call:generate_text": slowly },
      20,
    );

    await assert.rejects(client.callTool("generate_text"), McpNetworkError);
    assert.deepEqual(await client.callTool("generate_text", {}, { timeoutMs: 500 }), { text_generation_id: "wgen_1" });
  });

  it("treats a server error as an HTTP error even with a JSON-RPC body", async () => {
    const { client } = server({
      initialize: () =>
        json(
          { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal server error" } },
          { status: 500, headers: { "Retry-After": "5" } },
        ),
    });

    await assert.rejects(client.callTool("list_posts"), (error: unknown) => {
      assert.ok(error instanceof McpHttpError);
      assert.equal(error.status, 500);
      assert.equal(error.retryAfter, 5);
      return true;
    });
  });
});

describe("isTransient", () => {
  it("retries rate limits, server errors, timeouts and network failures only", () => {
    assert.equal(isTransient(new McpNetworkError("down")), true);
    assert.equal(isTransient(new McpHttpError(429, "slow down", 60)), true);
    assert.equal(isTransient(new McpHttpError(500, "boom")), true);
    assert.equal(isTransient(new McpHttpError(503, "busy")), true);
    assert.equal(isTransient(new McpHttpError(400, "bad")), false);
    assert.equal(isTransient(new McpHttpError(404, "gone")), false);
    assert.equal(isTransient(new McpToolError("not_found", {})), false);
    assert.equal(isTransient(new McpUnauthorizedError()), false);
    assert.equal(isTransient(new McpRpcError(-32602, "Invalid params")), false);
  });

  it("reads Retry-After in milliseconds", () => {
    assert.equal(retryAfterMs(new McpHttpError(429, "slow down", 60)), 60_000);
    assert.equal(retryAfterMs(new McpHttpError(503, "busy")), undefined);
    assert.equal(retryAfterMs(new McpNetworkError("down")), undefined);
  });
});

describe("describeRefusal", () => {
  it("explains the refusals that only carry a code", () => {
    assert.equal(describeRefusal("validation_failed", { code: "source_required" }), "Write a brief first.");
    assert.equal(
      describeRefusal("validation_failed", { code: "no_connected_channels" }),
      "Connect a social channel to this brand in SocialFaktory first.",
    );
    assert.equal(
      describeRefusal("idempotency_in_progress", {}),
      "SocialFaktory is still working on this request. Try again in a moment.",
    );
    assert.equal(
      describeRefusal("tool_failed", {}),
      "SocialFaktory could not finish this request. Try again in a moment.",
    );
  });

  it("asks for Sign in Again, not the preferences, when a permission is missing", () => {
    const message = describeRefusal("scope_required", { scope: "generate" });

    assert.match(message, /generate permission/);
    assert.match(message, /Sign in Again/);
    assert.doesNotMatch(message, /preferences/);
  });

  it("does not leak internal field names", () => {
    assert.equal(
      describeRefusal("validation_failed", { code: "blank", message: "Substance can't be blank" }),
      "Write a brief first.",
    );
    assert.equal(
      describeRefusal("validation_failed", {
        code: "brand_id_required",
        message: "brand_id names the brand this call belongs to, and only a token pinned to a brand may omit it",
      }),
      "Pick a brand first.",
    );
  });

  it("keeps a readable validation message", () => {
    assert.equal(
      describeRefusal("validation_failed", { code: "too_long", message: "Caption is too long for X" }),
      "Caption is too long for X",
    );
  });
});

describe("parseToolResult", () => {
  it("prefers structured content", () => {
    assert.deepEqual(parseToolResult({ content: [{ type: "text", text: '{"a":2}' }], structuredContent: { a: 1 } }), {
      a: 1,
    });
  });

  it("falls back to the JSON text content", () => {
    assert.deepEqual(parseToolResult({ content: [{ type: "text", text: '{"brands":[]}' }] }), { brands: [] });
  });

  it("names the refusal from the text when there is no structured content", () => {
    assert.throws(
      () => parseToolResult({ isError: true, content: [{ type: "text", text: "brand_not_allowed" }] }),
      (error: unknown) => error instanceof McpToolError && error.kind === "brand_not_allowed",
    );
  });

  it("uses the message of a validation refusal", () => {
    assert.throws(
      () =>
        parseToolResult({
          isError: true,
          structuredContent: { kind: "validation_failed", code: "too_long", message: "Caption is too long for X" },
        }),
      { message: "Caption is too long for X" },
    );
  });

  it("rejects an empty answer", () => {
    assert.throws(() => parseToolResult({ content: [] }), /empty answer/);
  });
});

describe("parseEventStream", () => {
  it("joins multi-line data and skips comments and empty events", () => {
    const stream = ': ping\n\nevent: message\ndata: {"jsonrpc":"2.0",\ndata: "id":1,"result":{}}\n\n';

    assert.deepEqual(parseEventStream(stream), [{ jsonrpc: "2.0", id: 1, result: {} }]);
  });
});
