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
    require: (id) => mocks[id] ?? (id === "./diagnostics" ? { diagnostic: () => {} } : require(id)),
    Buffer,
    URL,
    URLSearchParams,
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
  assert.deepEqual(manifest.commands.map((command) => command.name), [
    "search-notes",
    "create-note",
    "export-transcripts",
    "export-notes",
    "create-note-from-transcript",
    "search-people",
    "search-companies",
  ]);
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
  for (const name of ["granolaApi", "fetchData", "getAccessToken"]) {
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

test("live checker never calls mutations or generation endpoints", async () => {
  const called = [];
  const checker = load("checkEndpoints", {
    "./getAccessToken": { __esModule: true, default: async () => "test" },
    "./endpointCatalog": { endpointCatalog },
    "./granolaFetch": {
      GranolaRequestError: class extends Error {},
      granolaFetch: async (url) => {
        called.push(new URL(url).pathname);
        const route = new URL(url).pathname;
        const body =
          route.endsWith("get-documents") || route.endsWith("get-documents-batch")
            ? { docs: [{ id: "sample" }] }
            : route.endsWith("get-document-lists-metadata")
              ? { lists: { folder: {} } }
              : route.endsWith("get-document-transcript")
                ? []
                : route.endsWith("get-user-info")
                  ? { id: "user" }
                  : {};
        return new Response(JSON.stringify(body));
      },
    },
  });
  const result = await checker.checkEndpoints(new AbortController().signal);
  assert.equal(result.filter((c) => c.result === "failed").length, 0);
  assert.deepEqual(
    called,
    Array.from(
      endpointCatalog.filter((e) => e.kind === "read"),
      (e) => e.path,
    ),
  );
  assert.equal(result.filter((c) => c.result === "skipped").length, 16);
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
