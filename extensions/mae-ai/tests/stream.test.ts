import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import test from "node:test";
import {
  providerForTool,
  readCompletionStream,
  streamCompletion,
} from "../src/lib/stream";

test("per-tool provider overrides never forward a key to another origin", () => {
  const defaults = {
    baseUrl: "https://provider.example/v1",
    model: "default-model",
    apiKey: "test-key",
  };
  assert.equal(
    providerForTool(defaults, { model: "custom-model" }).apiKey,
    "test-key",
  );
  assert.equal(
    providerForTool(defaults, { baseUrl: "https://other.example/v1" }).apiKey,
    undefined,
  );
  assert.equal(
    providerForTool(defaults, {
      baseUrl: "https://provider.example/another/v1",
    }).apiKey,
    "test-key",
  );
  assert.equal(
    providerForTool(defaults, { baseUrl: "https://provider.example:9000/v1" })
      .apiKey,
    undefined,
  );
  assert.throws(() => providerForTool(defaults, { baseUrl: "not-a-url" }));
});

function bytes(text: string, chunkSize = 1): ReadableStream<Uint8Array> {
  const encoded = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let index = 0; index < encoded.length; index += chunkSize) {
        controller.enqueue(encoded.slice(index, index + chunkSize));
      }
      controller.close();
    },
  });
}

test("SSE streams incremental UTF-8 tokens across byte and CRLF boundaries", async () => {
  const tokens: string[] = [];
  const text = [
    ": heartbeat",
    "",
    'data: {"choices":[{"delta":{"content":"Hello "}}]}',
    "",
    'data: {"choices":[{"delta":{"content":"世界"}}]}',
    "",
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
    "",
    "data: [DONE]",
    "",
    "",
  ].join("\r\n");
  await readCompletionStream(bytes(text), (token) => tokens.push(token));
  assert.deepEqual(tokens, ["Hello ", "世界"]);
});

test("SSE supports final unterminated event and multiple data lines", async () => {
  let result = "";
  await readCompletionStream(
    bytes(
      'data: {"choices":\ndata: [{"delta":{"content":"ok"},"finish_reason":"stop"}]}',
    ),
    (token) => (result += token),
  );
  assert.equal(result, "ok");
});

test("in-stream errors, malformed JSON, empty answers, and premature EOF are failures", async () => {
  for (const [body, expected] of [
    ['data: {"error":{"message":"Quota exhausted"}}\n\n', /Quota exhausted/],
    ["data: invalid\n\n", /invalid streaming JSON/],
    ["data: [DONE]\n\n", /no text/],
    [
      'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
      /before the response completed/,
    ],
  ] as const) {
    await assert.rejects(
      readCompletionStream(bytes(body), () => undefined),
      expected,
    );
  }
});

async function serve(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}/v1`;
}

async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

test("provider request streams before completion, sends key/model/messages, and does not declare tools", async () => {
  const tokens: string[] = [];
  let release: (() => void) | undefined;
  const firstToken = new Promise<void>((resolve) => (release = resolve));
  const server = createServer(async (req, res) => {
    assert.equal(req.url, "/v1/chat/completions");
    assert.equal(req.headers.authorization, "Bearer test-key");
    let body = "";
    for await (const chunk of req) body += chunk;
    const parsed = JSON.parse(body);
    assert.equal(parsed.model, "model-test");
    assert.equal(parsed.stream, true);
    assert.equal(parsed.messages[0].content, "Hello");
    assert.equal(parsed.tools, undefined);
    assert.equal(parsed.tool_choice, undefined);
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write('data: {"choices":[{"delta":{"content":"first"}}]}\n\n');
    await firstToken;
    res.end(
      'data: {"choices":[{"delta":{"content":" second"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
    );
  });
  const baseUrl = await serve(server);
  try {
    await streamCompletion(
      { baseUrl, apiKey: "test-key", model: "model-test" },
      [{ role: "user", content: "Hello" }],
      (token) => {
        tokens.push(token);
        release?.();
      },
      new AbortController().signal,
    );
    assert.equal(tokens.join(""), "first second");
    assert.equal(tokens[0], "first");
  } finally {
    await close(server);
  }
});

test("HTTP errors and non-streaming JSON fallback are handled", async () => {
  let status = 401;
  const server = createServer((_req, res) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(
      status === 401
        ? JSON.stringify({ error: { message: "Invalid key" } })
        : JSON.stringify({ choices: [{ message: { content: "fallback" } }] }),
    );
  });
  const baseUrl = await serve(server);
  try {
    await assert.rejects(
      streamCompletion(
        { baseUrl, model: "test" },
        [],
        () => undefined,
        new AbortController().signal,
      ),
      /HTTP 401.*Invalid key/,
    );
    status = 200;
    let text = "";
    await streamCompletion(
      { baseUrl, model: "test" },
      [],
      (token) => (text += token),
      new AbortController().signal,
    );
    assert.equal(text, "fallback");
  } finally {
    await close(server);
  }
});

test("user cancellation and timeout terminate a hanging request", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.flushHeaders();
  });
  const baseUrl = await serve(server);
  try {
    const abort = new AbortController();
    setTimeout(() => abort.abort(), 50);
    await assert.rejects(
      streamCompletion(
        { baseUrl, model: "test" },
        [],
        () => undefined,
        abort.signal,
      ),
      (error: Error) => error.name === "AbortError",
    );
    await assert.rejects(
      streamCompletion(
        { baseUrl, model: "test" },
        [],
        () => undefined,
        new AbortController().signal,
        50,
      ),
      (error: Error) => error.name === "TimeoutError",
    );
  } finally {
    await close(server);
  }
});
