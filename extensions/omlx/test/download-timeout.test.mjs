// Deterministic deadline tests: expire the real request signals explicitly,
// rather than waiting ten seconds or contacting a running oMLX server.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const uri = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const source = await readFile(
  new URL("../src/lib/omlx.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
});
const task = {
  task_id: "synthetic-task",
  repo_id: "example/model",
  status: "downloading",
  progress: 10,
  downloaded_size: 10,
  total_size: 100,
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });
function login() {
  return new Response("{}", {
    headers: { "set-cookie": "omlx_admin_session=synthetic-session; Path=/" },
  });
}
function hang(signal) {
  assert.ok(
    signal instanceof AbortSignal,
    "every request must have the source deadline",
  );
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
  });
}
async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
let id = 0;
async function harness(t, handler) {
  const deadlines = [],
    requests = [];
  t.mock.method(AbortSignal, "timeout", (ms) => {
    const controller = new AbortController();
    deadlines.push({ ms, controller });
    return controller.signal;
  });
  const api = uri(`
    export const getPreferenceValues = () => ({serverUrl:"https://omlx.example.invalid/v1",apiKey:"<YOUR_API_KEY>"});
    export const open = async () => {};
    export const showToast = async () => {};
    export const Toast = {Style:{Success:"success"}};
    // Unique mock module keeps admin session state isolated between cases.
    export const fixtureId = ${++id};
  `);
  const lib = await import(
    uri(outputText.replaceAll('"@raycast/api"', JSON.stringify(api)))
  );
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, options });
    return handler(path, options, deadlines);
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  function expire(index) {
    assert.equal(deadlines[index].ms, 10_000);
    deadlines[index].controller.abort(
      new DOMException("Synthetic deadline exceeded", "TimeoutError"),
    );
  }
  return { lib, deadlines, requests, expire };
}

for (const stalled of ["hf", "ms"]) {
  test(`${stalled} task timeout preserves the other backend's downloads`, async (t) => {
    const h = await harness(t, (path, { signal }) => {
      if (path.endsWith("/login")) return login();
      return path.includes(`/${stalled}/`)
        ? hang(signal)
        : json({ tasks: [task] });
    });
    const result = h.lib.fetchDownloads();
    await settle();
    h.expire(stalled === "hf" ? 0 : 1);
    const { tasks, errors } = await result;
    assert.deepEqual(
      tasks.map((entry) => entry.source),
      [stalled === "hf" ? "modelscope" : "huggingface"],
    );
    assert.match(
      errors[stalled === "hf" ? "huggingface" : "modelscope"],
      /deadline exceeded/,
    );
    assert.equal(h.deadlines.length, 2);
  });
}

test("a failed source plus a hanging source settles as an explicit dual failure", async (t) => {
  const h = await harness(t, (path, { signal }) => {
    if (path.endsWith("/login")) return login();
    return path.includes("/hf/")
      ? json({ detail: "Synthetic failure" }, 500)
      : hang(signal);
  });
  const result = h.lib.fetchDownloads();
  const rejected = assert.rejects(
    result,
    /Synthetic failure.*;.*deadline exceeded/,
  );
  await settle();
  h.expire(1);
  await rejected;
});

test("both hanging sources settle as an explicit dual timeout", async (t) => {
  const h = await harness(t, (path, { signal }) =>
    path.endsWith("/login") ? login() : hang(signal),
  );
  const result = h.lib.fetchDownloads();
  const rejected = assert.rejects(
    result,
    /deadline exceeded.*;.*deadline exceeded/,
  );
  await settle();
  h.expire(0);
  h.expire(1);
  await rejected;
});

test("initial authentication is covered by the same task deadline", async (t) => {
  const h = await harness(t, (path, { signal }, deadlines) => {
    if (path.endsWith("/login")) {
      return signal === deadlines[0].controller.signal ? hang(signal) : login();
    }
    return json({ tasks: [task] });
  });
  const result = h.lib.fetchDownloads();
  await settle();
  h.expire(0);
  const { tasks, errors } = await result;
  assert.deepEqual(
    tasks.map((entry) => entry.source),
    ["modelscope"],
  );
  assert.match(errors.huggingface, /deadline exceeded/);
  assert.equal(
    h.requests.some((request) => request.path.includes("/hf/tasks")),
    false,
  );
});

for (const stalled of ["reauth", "retry", "body", "error-body"]) {
  test(`task deadline remains active through ${stalled}`, async (t) => {
    let logins = 0,
      taskRequests = 0;
    let firstSignal;
    const h = await harness(t, (path, { signal }) => {
      if (!firstSignal) firstSignal = signal;
      assert.equal(
        signal,
        firstSignal,
        "login, 401 retry and body share one deadline",
      );
      if (path.endsWith("/login")) {
        logins++;
        return logins > 1 && stalled === "reauth" ? hang(signal) : login();
      }
      taskRequests++;
      if (taskRequests === 1) return json({}, 401);
      if (stalled === "retry") return hang(signal);
      // Model the real fetch body: aborting its request signal errors the
      // stream even when response headers have already arrived.
      const body = new ReadableStream({
        start(controller) {
          signal.addEventListener(
            "abort",
            () => controller.error(signal.reason),
            { once: true },
          );
        },
      });
      return new Response(body, {
        status: stalled === "error-body" ? 500 : 200,
      });
    });
    const result = h.lib.fetchHfTasks();
    const rejected = assert.rejects(result, /deadline exceeded/);
    await settle();
    assert.equal(h.deadlines.length, 1);
    h.expire(0);
    await rejected;
    assert.equal(logins, 2);
    assert.equal(taskRequests, stalled === "reauth" ? 1 : 2);
  });
}
