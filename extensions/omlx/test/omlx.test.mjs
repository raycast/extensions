import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Exercise real implementations with synthetic Raycast exports and HTTP
// responses; no Raycast process, credentials, or running server is used.
let sequence = 0;
const fixtures = new Map();
globalThis.__omlxReviewFixtures = fixtures;
const uri = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
async function compile(path, replacements = {}, append = "") {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let code =
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText + append;
  for (const [name, replacement] of Object.entries(replacements)) {
    code = code.replaceAll(JSON.stringify(name), JSON.stringify(replacement));
  }
  return uri(code);
}
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const task = {
  task_id: "same-id",
  repo_id: "example/model",
  status: "downloading",
  progress: 10,
  downloaded_size: 10,
  total_size: 100,
  error: "",
  created_at: 0,
  started_at: 0,
  completed_at: 0,
  retry_count: 0,
};

async function harness(t, handler) {
  const id = ++sequence;
  const fixture = { toasts: [], requests: [] };
  fixtures.set(id, fixture);
  const api = uri(`
    const fixture = globalThis.__omlxReviewFixtures.get(${id});
    export const getPreferenceValues = () => ({ serverUrl: "https://omlx.example.invalid/v1", apiKey: "<YOUR_API_KEY>" });
    export const showToast = async (options) => { fixture.toasts.push(options); return options; };
    export const open = async () => {};
    export const Toast = { Style: { Success: "success" } };
    export const Tool = {};
    export const AI = {};
    export const Icon = new Proxy({}, { get: (_, name) => name });
    export const Color = new Proxy({}, { get: (_, name) => name });
    export const Action = { Style: { Destructive: "destructive" } };
    export const ActionPanel = {};
    export const List = {};
  `);
  const libUri = await compile("../src/lib/omlx.ts", { "@raycast/api": api });
  const lib = await import(libUri);
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    fixture.requests.push({ path, options });
    if (path === "/admin/api/login") {
      return new Response("{}", {
        headers: { "set-cookie": "omlx_admin_session=test-session; Path=/" },
      });
    }
    return handler(path, options);
  };
  t.after(() => {
    globalThis.fetch = original;
    fixtures.delete(id);
  });
  return { ...fixture, lib, libUri, api };
}

test("concurrent update checks share the in-flight result", async (t) => {
  const pending = deferred();
  const h = await harness(t, () => pending.promise);
  const checks = [
    h.lib.checkUpdateOnce(),
    h.lib.checkUpdateOnce(),
    h.lib.checkUpdateOnce(),
  ];
  pending.resolve(json({ update_available: true, latest_version: "1.2.3" }));
  const results = await Promise.all(checks);
  assert.ok(results.every((r) => r?.latest_version === "1.2.3"));
  assert.equal(
    h.requests.filter((r) => r.path.endsWith("update-check")).length,
    1,
  );
});

test("concurrent notifications and repeated polling show one passive toast", async (t) => {
  const h = await harness(t, () =>
    json({ update_available: true, latest_version: "1.2.3" }),
  );
  await h.lib.checkUpdateOnce();
  await Promise.all([
    h.lib.notifyIfUpdateAvailable(),
    h.lib.notifyIfUpdateAvailable(),
    h.lib.notifyIfUpdateAvailable(),
  ]);
  await h.lib.notifyIfUpdateAvailable();
  assert.equal(h.toasts.length, 1);
  // Explicit checks are not blocked by the passive notification cache.
  await h.lib.checkForUpdate();
  assert.equal(
    h.requests.filter((r) => r.path.endsWith("update-check")).length,
    2,
  );
});

for (const scenario of ["no update", "failed check"]) {
  test(`${scenario}: no toast, no repeated passive requests`, async (t) => {
    const h = await harness(t, () =>
      scenario === "no update"
        ? json({ update_available: false })
        : json({ detail: "failure" }, 500),
    );
    await Promise.all([
      h.lib.notifyIfUpdateAvailable(),
      h.lib.notifyIfUpdateAvailable(),
    ]);
    await h.lib.notifyIfUpdateAvailable();
    assert.equal(h.toasts.length, 0);
    assert.equal(
      h.requests.filter((r) => r.path.endsWith("update-check")).length,
      1,
    );
  });
}

test("mixed downloads preserve source even when task IDs collide", async (t) => {
  const h = await harness(t, () => json({ tasks: [task] }));
  const downloads = await h.lib.fetchDownloads();
  assert.deepEqual(
    downloads.map((d) => `${d.source}:${d.task_id}`),
    ["huggingface:same-id", "modelscope:same-id"],
  );
});

test("documented optional ModelScope unavailability preserves HuggingFace tasks", async (t) => {
  const h = await harness(t, (path) =>
    path.includes("/ms/")
      ? json({ detail: "ModelScope downloader not initialized" }, 503)
      : json({ tasks: [task] }),
  );
  assert.deepEqual(
    (await h.lib.fetchDownloads()).map((d) => d.source),
    ["huggingface"],
  );
});

for (const status of [401, 403, 500, 503]) {
  test(`ModelScope ${status} failure is surfaced rather than hidden`, async (t) => {
    const h = await harness(t, (path) =>
      path.includes("/ms/")
        ? json({ detail: "Unexpected failure" }, status)
        : json({ tasks: [task] }),
    );
    await assert.rejects(
      h.lib.fetchDownloads(),
      /Failed to fetch ModelScope tasks/,
    );
  });
}

test("ModelScope network and malformed JSON errors propagate", async (t) => {
  let networkError = true;
  const h = await harness(t, (path) => {
    if (!path.includes("/ms/")) return json({ tasks: [task] });
    if (networkError) throw new Error("Synthetic network failure");
    return new Response("invalid JSON");
  });
  await assert.rejects(h.lib.fetchDownloads(), /Synthetic network failure/);
  networkError = false;
  await assert.rejects(h.lib.fetchDownloads(), SyntaxError);
});

test("ModelScope client actions use source-specific encoded task endpoints", async (t) => {
  const h = await harness(t, () => json({ success: true }));
  await h.lib.cancelMsDownload("task/one");
  await h.lib.retryMsDownload("task/one");
  await h.lib.removeMsTask("task/one");
  assert.deepEqual(
    h.requests
      .filter((r) => !r.path.endsWith("login"))
      .map((r) => [r.path, r.options.method]),
    [
      ["/admin/api/ms/cancel/task%2Fone", "POST"],
      ["/admin/api/ms/retry/task%2Fone", "POST"],
      ["/admin/api/ms/task/task%2Fone", "DELETE"],
    ],
  );
});

test("cancel tool routes ModelScope explicitly and defaults old callers to HuggingFace", async (t) => {
  const h = await harness(t, () => json({ success: true }));
  const tool = await import(
    await compile("../src/tools/cancel-download.ts", {
      "@raycast/api": h.api,
      "../lib/omlx": h.libUri,
    })
  );
  await tool.default({ taskId: "same-id", source: "modelscope" });
  await tool.default({ taskId: "same-id" });
  assert.deepEqual(
    h.requests.filter((r) => !r.path.endsWith("login")).map((r) => r.path),
    ["/admin/api/ms/cancel/same-id", "/admin/api/hf/cancel/same-id"],
  );
});

test("Manage Downloads actions route cancel/retry/remove to the row's source", async (t) => {
  const h = await harness(t, () => json({ success: true }));
  const react = uri(
    "export const useCallback = x => x; export const useEffect = () => {}; export const useRef = () => ({}); export const useState = () => [];",
  );
  const jsx = uri(
    "export const jsx = (type, props) => ({type,props}); export const jsxs = jsx;",
  );
  const component = await import(
    await compile(
      "../src/manage-downloads.tsx",
      {
        "@raycast/api": h.api,
        "./lib/omlx": h.libUri,
        react,
        "react/jsx-runtime": jsx,
      },
      "\nexport { TaskItem };",
    )
  );
  const actions = (node, list = []) => {
    if (!node || typeof node !== "object") return list;
    if (node.props?.onAction) list.push(node.props);
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach((n) => actions(n, list));
      else if (child && typeof child === "object") actions(child, list);
    }
    return list;
  };
  for (const source of ["huggingface", "modelscope"]) {
    for (const [status, title] of [
      ["downloading", "Cancel Download"],
      ["failed", "Retry Download"],
      ["completed", "Remove"],
    ]) {
      const row = component.TaskItem({
        task: { ...task, source, status },
        onRefresh: async () => {},
      });
      await actions(row)
        .find((action) => action.title === title)
        .onAction();
    }
  }
  assert.deepEqual(
    h.requests.filter((r) => !r.path.endsWith("login")).map((r) => r.path),
    [
      "/admin/api/hf/cancel/same-id",
      "/admin/api/hf/retry/same-id",
      "/admin/api/hf/task/same-id",
      "/admin/api/ms/cancel/same-id",
      "/admin/api/ms/retry/same-id",
      "/admin/api/ms/task/same-id",
    ],
  );
});

test("non-chat model types are detected without false positives on chat models", async (t) => {
  const api = uri(
    'export const getPreferenceValues = () => ({});\nexport const open = async () => {};\nexport const showToast = async () => ({});\nexport const Toast = { Style: { Success: "success" } };',
  );
  const lib = await import(
    await compile("../src/lib/omlx.ts", { "@raycast/api": api })
  );
  assert.equal(lib.isNonChatModelType("s3_tokenizer_v2"), true);
  assert.equal(lib.isNonChatModelType("bert"), true);
  assert.equal(lib.isNonChatModelType("modernbert"), true);
  assert.equal(lib.isNonChatModelType("colqwen2_5"), true);
  assert.equal(lib.isNonChatModelType("jina_reranker"), true);
  assert.equal(lib.isNonChatModelType("qwen3_5", "Qwen3-Embedding-4B"), true);
  assert.equal(lib.isNonChatModelType("qwen3_5", "Qwen3.8-27B-4bit"), false);
  assert.equal(lib.isNonChatModelType("qwen3_5"), false);
  assert.equal(lib.isNonChatModelType("qwen3_5_vl"), false);
  assert.equal(lib.isNonChatModelType(""), false);
  assert.equal(lib.nonChatModelKind("s3_tokenizer_v2"), "tokenizer");
  assert.equal(
    lib.nonChatModelKind("qwen3_5", "Qwen3-Reranker-8B"),
    "reranker",
  );
  assert.equal(lib.nonChatModelKind("jina_reranker"), "reranker");
  assert.equal(
    lib.nonChatModelKind("qwen3_5", "Qwen3-Embedding-4B"),
    "embedding",
  );
  assert.equal(lib.nonChatModelKind("qwen3_5"), null);
});

test("cache-sourced models are detected by Hub cache paths", async (t) => {
  const api = uri(
    'export const getPreferenceValues = () => ({});\nexport const open = async () => {};\nexport const showToast = async () => ({});\nexport const Toast = { Style: { Success: "success" } };',
  );
  const lib = await import(
    await compile("../src/lib/omlx.ts", { "@raycast/api": api })
  );
  assert.equal(
    lib.isCacheSourcedModel(
      "/Users/x/.cache/huggingface/hub/models--org--name/snapshots/abc",
    ),
    true,
  );
  assert.equal(
    lib.isCacheSourcedModel("/Users/x/.cache/modelscope/hub/models--org--name"),
    true,
  );
  assert.equal(
    lib.isCacheSourcedModel(
      "/Users/x/.omlx/models/mlx-community/Qwen3-8B-4bit",
    ),
    false,
  );
  assert.equal(lib.isCacheSourcedModel(""), false);
  assert.equal(lib.isCacheSourcedModel(undefined), false);
});

test("an interrupted completion never flushes a pending tool call", async (t) => {
  const h = await harness(
    t,
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"noop","arguments":"{}"}}]}}]}\n\n',
              ),
            );
          },
          pull(controller) {
            controller.error(new Error("Synthetic stream interruption"));
          },
        }),
      ),
  );
  const parserUri = await compile("../src/sse-parser.ts");
  const provider = await import(
    await compile("../src/models.ts", {
      "@raycast/api": h.api,
      "./lib/omlx": h.libUri,
      "./sse-parser": parserUri,
    })
  );
  const parts = [];
  await assert.rejects(async () => {
    for await (const part of provider.streamCompletion(
      { id: "synthetic-model" },
      { messages: [] },
    ))
      parts.push(part);
  }, /Synthetic stream interruption/);
  assert.deepEqual(parts, []);
});
