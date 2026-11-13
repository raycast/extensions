const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const os = require("node:os");
const ts = require("typescript");
const root = path.join(__dirname, "../src/utils");
function load(name, mocks = {}, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(root, name + ".ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    require: (id) =>
      mocks[id] ??
      (id === "./diagnostics"
        ? { diagnostic: () => {} }
        : id === "./endpointCatalog"
          ? load("endpointCatalog")
          : id === "./getAccessToken"
            ? {
                refreshRejectedAccessToken: async () => {
                  throw new Error("Unexpected refresh");
                },
              }
            : require(id)),
    Buffer,
    URL,
    URLSearchParams,
    Headers,
    AbortSignal,
    process,
    console,
    ...globals,
  });
  return exports;
}
const { endpointCatalog } = load("endpointCatalog");
test("release commands preserve the existing Store command surface", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
  assert.deepEqual(
    manifest.commands.map((command) => command.name),
    [
      "search-notes",
      "create-note",
      "export-transcripts",
      "export-notes",
      "create-note-from-transcript",
      "search-people",
      "search-companies",
    ],
  );
});
test("folder readback normalizes embedded documents to membership IDs", () => {
  const { normalizeFolder } = load("normalizeFolder");
  const result = normalizeFolder({
    id: "folder",
    title: "test",
    documents: [{ id: "one", title: "private content" }, { id: "two" }, {}],
  });
  assert.deepEqual(Array.from(result.document_ids), ["one", "two"]);
  assert.equal(result.documents, undefined);
  assert.deepEqual(Array.from(normalizeFolder({ id: "f", document_ids: ["legacy"] }).document_ids), ["legacy"]);
});

test("every Granola call site is catalogued and uses POST", () => {
  const seen = new Set();
  for (const name of ["granolaApi", "fetchData", "getUserInfo"]) {
    const source = fs.readFileSync(path.join(root, name + ".ts"), "utf8");
    for (const m of source.matchAll(/https:\/\/api\.granola\.ai(\/v[12]\/[a-z-]+)/g)) seen.add(m[1]);
    for (const m of source.matchAll(/\$\{API_CONFIG\.(?:STREAM_)?API_URL\}\/([a-z-]+)/g)) seen.add("/v1/" + m[1]);
    for (const m of source.matchAll(/postToGranolaApi<[^>]+>\(\s*"([a-z0-9-]+)"/g)) seen.add("/v1/" + m[1]);
    const ast = ts.createSourceFile(name + ".ts", source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === "granolaFetch") {
        const options = node.arguments[1];
        assert.ok(options && ts.isObjectLiteralExpression(options), `${name}: explicit request options`);
        const method = options.properties.find((p) => p.name?.getText(ast) === "method");
        assert.equal(method?.initializer?.text, "POST", `${name}: POST required`);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  seen.add("/v2/get-documents");
  seen.add("/user_management/authorize/device");
  seen.add("/user_management/authenticate");
  assert.deepEqual([...seen].sort(), Array.from(endpointCatalog, (e) => e.path).sort());
});

test("transport reports status and reference, never server body or credentials", async () => {
  const events = [];
  const transport = load(
    "granolaFetch",
    { "./diagnostics": { diagnostic: (...args) => events.push(args) } },
    { fetch: async () => new Response("SECRET note text and token", { status: 429, headers: { "retry-after": "2" } }) },
  );
  await assert.rejects(
    transport.granolaFetch("https://api.granola.ai/v2/get-documents?secret=SECRET", {
      method: "POST",
      headers: { Authorization: "Bearer SECRET" },
      body: "SECRET",
    }),
    (e) => e.status === 429 && e.retryAfterMs === 2000 && !e.message.includes("SECRET"),
  );
  assert.ok(!JSON.stringify(events).includes("SECRET"));
  assert.equal(events[0][1].status, 429);
});
test("successful streaming responses remain readable", async () => {
  const transport = load("granolaFetch", {}, { fetch: async () => new Response("stream payload") });
  const r = await transport.granolaFetch("https://stream.api.granola.ai/v1/chat-with-documents", { method: "POST" });
  assert.equal(await r.text(), "stream payload");
});
test("a rejected read token refreshes once and retries with the replacement", async () => {
  const requests = [];
  const rejected = [];
  const transport = load(
    "granolaFetch",
    {
      "./getAccessToken": {
        refreshRejectedAccessToken: async (token) => {
          rejected.push(token);
          return "replacement";
        },
      },
    },
    {
      fetch: async (_url, options) => {
        requests.push(options);
        return requests.length === 1 ? new Response("rejected", { status: 401 }) : new Response("notes");
      },
    },
  );
  const result = await transport.granolaFetch("https://api.granola.ai/v2/get-documents", {
    method: "POST",
    headers: { Authorization: "Bearer rejected", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(await result.text(), "notes");
  assert.deepEqual(rejected, ["rejected"]);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.get("Authorization"), "Bearer replacement");
  assert.equal(requests[1].headers.get("Content-Type"), "application/json");
  assert.equal(requests[1].body, "{}");
});
test("a second 401 stops instead of looping refresh and replay", async () => {
  let requests = 0,
    refreshes = 0;
  const transport = load(
    "granolaFetch",
    {
      "./getAccessToken": {
        refreshRejectedAccessToken: async () => {
          refreshes++;
          return "replacement";
        },
      },
    },
    {
      fetch: async () => {
        requests++;
        return new Response("rejected", { status: 401 });
      },
    },
  );
  await assert.rejects(
    transport.granolaFetch("https://api.granola.ai/v2/get-documents", {
      method: "POST",
      headers: { Authorization: "Bearer rejected" },
    }),
    (error) => error.status === 401,
  );
  assert.equal(requests, 2);
  assert.equal(refreshes, 1);
});
test("401 recovery never replays mutations, generation, or unknown routes", async () => {
  for (const route of ["/v1/create-document", "/v1/save-to-notion", "/v1/llm-proxy", "/v1/unknown"]) {
    let requests = 0,
      refreshes = 0;
    const transport = load(
      "granolaFetch",
      {
        "./getAccessToken": {
          refreshRejectedAccessToken: async () => {
            refreshes++;
            return "replacement";
          },
        },
      },
      {
        fetch: async () => {
          requests++;
          return new Response("rejected", { status: 401 });
        },
      },
    );
    await assert.rejects(
      transport.granolaFetch("https://api.granola.ai" + route, {
        method: "POST",
        headers: { Authorization: "Bearer rejected" },
        body: "{}",
      }),
      /not retried/,
    );
    assert.equal(requests, 1);
    assert.equal(refreshes, 1);
  }
});
test("cancellation during refresh prevents the read retry", async () => {
  let requests = 0;
  const controller = new AbortController();
  const transport = load(
    "granolaFetch",
    {
      "./getAccessToken": {
        refreshRejectedAccessToken: async () => {
          controller.abort();
          return "replacement";
        },
      },
    },
    {
      fetch: async () => {
        requests++;
        return new Response("rejected", { status: 401 });
      },
    },
  );
  await assert.rejects(
    transport.granolaFetch("https://api.granola.ai/v2/get-documents", {
      method: "POST",
      headers: { Authorization: "Bearer rejected" },
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
  assert.equal(requests, 1);
});
test("a revoked refresh session propagates sign-in required without replay", async () => {
  let requests = 0;
  const error = Object.assign(new Error("Sign in again"), { name: "SignInRequired" });
  const transport = load(
    "granolaFetch",
    {
      "./getAccessToken": {
        refreshRejectedAccessToken: async () => {
          throw error;
        },
      },
    },
    {
      fetch: async () => {
        requests++;
        return new Response("rejected", { status: 401 });
      },
    },
  );
  await assert.rejects(
    transport.granolaFetch("https://api.granola.ai/v2/get-documents", {
      method: "POST",
      headers: { Authorization: "Bearer rejected" },
    }),
    { name: "SignInRequired" },
  );
  assert.equal(requests, 1);
});
test("diagnostic export omits unknown fields, query strings, and error bodies", async () => {
  const supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "granola-log-test-"));
  try {
    const logs = load(
      "diagnostics",
      { "@raycast/api": { environment: { supportPath, commandName: "search-notes" } } },
      { console: { log: () => {} } },
    );
    logs.diagnostic("request.failed", {
      endpoint: "api.granola.ai/v1/get-documents?token=SECRET",
      status: 401,
      body: "SECRET",
      accessToken: "SECRET",
      message: "SECRET",
      email: "SECRET",
    });
    const report = await logs.readDiagnostics();
    assert.ok(report.includes("401"));
    assert.ok(!report.includes("SECRET"));
  } finally {
    fs.rmSync(supportPath, { recursive: true, force: true });
  }
});
