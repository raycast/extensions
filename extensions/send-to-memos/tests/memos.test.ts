import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import {
  composeContent,
  createMemo,
  MemoInput,
  MemosConfig,
  MemosError,
  normalizeServerUrl,
  testConnection,
} from "../src/lib/memos";

const config: MemosConfig = { serverUrl: "https://memos.example.com", accessToken: "test-token", apiVersion: "auto" };
const input: MemoInput = { memo: "今天的想法", tags: "#灵感", sourceUrl: "", visibility: "PRIVATE" };
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return { calls, fetcher };
}

test("normalizes site and full API URLs while preserving deployment subpaths", () => {
  for (const value of [
    "https://example.com/notes/",
    " https://example.com/notes/api/v1/memos/ ",
    "https://example.com/notes/api",
    "https://example.com/notes/api/memos",
  ]) {
    assert.equal(normalizeServerUrl(value), "https://example.com/notes");
  }
  assert.equal(normalizeServerUrl("http://localhost:5230"), "http://localhost:5230");
});

test("rejects ambiguous or credential-bearing site URLs", () => {
  for (const value of [
    "example.com",
    "file:///tmp",
    "https://user:password@example.com",
    "https://example.com/?token=x",
    "https://example.com/#/home",
  ]) {
    assert.throws(() => normalizeServerUrl(value), MemosError);
  }
});

test("composes Markdown, a source URL and normalized Chinese/nested tags", () => {
  assert.equal(
    composeContent({
      memo: "  **想法**\n\n第二段  ",
      sourceUrl: " https://example.com/article?q=1#section ",
      tags: "灵感, #阅读，#阅读 ##研究/AI",
    }),
    "  **想法**\n\n第二段  \n\nhttps://example.com/article?q=1#section\n\n#灵感 #阅读 #研究/AI",
  );
});

test("preserves indented Markdown code blocks and trailing line breaks", () => {
  const memo = "    const answer = 42;\n    console.log(answer);\n";
  assert.equal(composeContent({ memo, sourceUrl: "", tags: "" }), memo);
  assert.equal(
    composeContent({ memo: " \t\n ", sourceUrl: "https://example.com", tags: "#reading" }),
    "https://example.com\n\n#reading",
  );
});

test("does not append duplicate tags already present in the memo", () => {
  assert.equal(
    composeContent({ memo: "#灵感 一句话 #阅读", sourceUrl: "", tags: "灵感 #阅读 #raycast" }),
    "#灵感 一句话 #阅读\n\n#raycast",
  );
});

test("allows link-only captures but rejects empty or tag-only notes", () => {
  assert.equal(composeContent({ memo: "", sourceUrl: "https://example.com", tags: "" }), "https://example.com");
  assert.throws(() => composeContent({ memo: " \n", sourceUrl: "", tags: "#tag" }), MemosError);
});

test("invalid source links are rejected before making any request", async () => {
  const { fetcher, calls } = mockFetch(() => json({}));
  for (const sourceUrl of ["javascript:alert(1)", "https://a:b@example.com", "https://example.com\n/notes"]) {
    await assert.rejects(createMemo(config, { ...input, sourceUrl }, fetcher), MemosError);
  }
  assert.equal(calls.length, 0);
});

test("detects the current API with a GET and sends one unwrapped private Memo", async () => {
  const { fetcher, calls } = mockFetch((url, init) =>
    init.method === "GET" ? json({ memos: [] }) : json({ name: "memos/hello-123" }),
  );
  const result = await createMemo(config, input, fetcher);
  assert.equal(result.url, "https://memos.example.com/memos/hello-123");
  assert.deepEqual(
    calls.map(({ url, init }) => [url, init.method]),
    [
      ["https://memos.example.com/api/memos?pageSize=1", "GET"],
      ["https://memos.example.com/api/memos", "POST"],
    ],
  );
  assert.deepEqual(JSON.parse(calls[1].init.body as string), { content: "今天的想法\n\n#灵感", visibility: "PRIVATE" });
  assert.equal((calls[1].init.headers as Record<string, string>).Authorization, "Bearer test-token");
  assert.equal(calls[1].init.redirect, "manual");
});

test("falls back to v1 after a read-only 404, including old uid responses", async () => {
  const { fetcher, calls } = mockFetch((url, init) => {
    if (url.includes("/api/memos")) return json({ code: 5 }, 404);
    return init.method === "GET" ? json({ memos: [] }) : json({ name: "memos/123", uid: "legacy-uid" });
  });
  assert.equal((await createMemo(config, input, fetcher)).url, "https://memos.example.com/m/legacy-uid");
  assert.equal(calls.filter(({ init }) => init.method === "POST").length, 1);
  assert.ok(calls[2].url.endsWith("/api/v1/memos"));
});

test("a website HTML fallback is not mistaken for the current API", async () => {
  const { fetcher } = mockFetch((url, init) =>
    url.includes("/api/memos")
      ? new Response("<html>website</html>", { headers: { "content-type": "text/html" } })
      : json(init.method === "GET" ? {} : { name: "memos/v1-id" }),
  );
  assert.equal((await createMemo(config, input, fetcher)).apiVersion, "v1");
});

test("explicit API selection skips probing; a pasted Bearer prefix is normalized", async () => {
  const { fetcher, calls } = mockFetch(() => json({ name: "memos/new-id" }));
  const result = await createMemo(
    {
      ...config,
      serverUrl: "https://example.com/notes/api/v1/memos",
      accessToken: " Bearer test-token ",
      apiVersion: "v1",
    },
    input,
    fetcher,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.com/notes/api/v1/memos");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer test-token");
  assert.equal(result.url, "https://example.com/notes/m/new-id");
});

test("connection checking verifies the chosen endpoint without creating a memo", async () => {
  const { fetcher, calls } = mockFetch(() => json({ memos: [] }));
  assert.equal(await testConnection({ ...config, apiVersion: "v1" }, fetcher), "v1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "GET");
});

test("authentication failure stops detection without posting or leaking the server response", async () => {
  const { fetcher, calls } = mockFetch(() => json({ message: "sensitive-server-debug-test-token" }, 401));
  await assert.rejects(
    createMemo(config, input, fetcher),
    (error: Error) =>
      error instanceof MemosError && !error.message.includes("test-token") && error.message.includes("token"),
  );
  assert.equal(calls.length, 1);
});

test("does not follow redirects with the token", async () => {
  const { fetcher, calls } = mockFetch(
    () => new Response(null, { status: 302, headers: { location: "https://another.example.com" } }),
  );
  await assert.rejects(createMemo(config, input, fetcher), /redirects/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.redirect, "manual");
});

test("a failed POST is never retried against a second API", async () => {
  const { fetcher, calls } = mockFetch((url, init) =>
    init.method === "GET" ? json({ memos: [] }) : json({ message: "debug" }, 503),
  );
  await assert.rejects(
    createMemo(config, input, fetcher),
    (error: MemosError) => error.uncertain && error.message.includes("whether the memo was saved"),
  );
  assert.equal(calls.filter(({ init }) => init.method === "POST").length, 1);
});

test("network failure during POST is reported as uncertain without exposing raw errors", async () => {
  const { fetcher, calls } = mockFetch((url, init) => {
    if (init.method === "POST") throw new Error("secret-token-in-network-error");
    return json({ memos: [] });
  });
  await assert.rejects(
    createMemo(config, input, fetcher),
    (error: MemosError) => error.uncertain && !error.message.includes("secret-token"),
  );
  assert.equal(calls.length, 2);
});

test("an HTML or malformed success response is not treated as a saved memo", async () => {
  for (const response of [
    new Response("<html>login</html>"),
    json({ code: 0 }),
    json({ name: "https://untrusted.example.com" }),
  ]) {
    const { fetcher, calls } = mockFetch(() => response);
    await assert.rejects(
      createMemo({ ...config, apiVersion: "current" }, input, fetcher),
      (error: MemosError) => error.uncertain,
    );
    assert.equal(calls.length, 1);
  }
});

test("rejects invalid visibility and tokens before touching the network", async () => {
  const { fetcher, calls } = mockFetch(() => json({}));
  await assert.rejects(
    createMemo(config, { ...input, visibility: "SPACE" as MemoInput["visibility"] }, fetcher),
    MemosError,
  );
  await assert.rejects(createMemo({ ...config, accessToken: "\n" }, input, fetcher), MemosError);
  await assert.rejects(createMemo({ ...config, accessToken: "a\r\nb" }, input, fetcher), MemosError);
  assert.equal(calls.length, 0);
});

test("real HTTP integration sends UTF-8 JSON and preserves the reverse-proxy subpath", async () => {
  const received: { path: string; method: string; body: string; token?: string }[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const part of request) body += part.toString();
    received.push({
      path: request.url ?? "",
      method: request.method ?? "",
      body,
      token: request.headers.authorization,
    });
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/notes/api/memos?pageSize=1") response.end(JSON.stringify({ memos: [] }));
    else if (request.url === "/notes/api/memos" && request.method === "POST")
      response.end(JSON.stringify({ name: "memos/local-integration" }));
    else {
      response.statusCode = 404;
      response.end("{}");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const base = `http://127.0.0.1:${address.port}/notes`;
    const result = await createMemo(
      { ...config, serverUrl: base },
      { ...input, sourceUrl: "https://example.com/reading" },
    );
    assert.equal(result.url, `${base}/memos/local-integration`);
    assert.equal(received.length, 2);
    assert.deepEqual(JSON.parse(received[1].body), {
      content: "今天的想法\n\nhttps://example.com/reading\n\n#灵感",
      visibility: "PRIVATE",
    });
    assert.equal(received[1].token, "Bearer test-token");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
