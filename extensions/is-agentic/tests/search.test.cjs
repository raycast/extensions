const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const { EventEmitter } = require("node:events");
const ts = require("typescript");
const React = require("react");
const { act, create } = require("react-test-renderer");

// Exercise the actual Raycast promise/cache hooks and HTTPS helper, replacing
// only native Raycast services and the network boundary.
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    module._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        fileName: filename,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2023,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      filename,
    );
  };
}
class Cache {
  values = new Map();
  listeners = new Set();
  get = (key) => this.values.get(key);
  set = (key, value) => {
    this.values.set(key, value);
    this.listeners.forEach((listener) => listener());
  };
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
const pending = [];
const history = [];
let honorAbort = true;
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === "@raycast/api") {
    return {
      Cache,
      environment: {},
      LaunchType: {},
      List: Object.assign(() => null, { EmptyView: "EmptyView", Section: "Section", Item: "Item" }),
      Action: Object.assign(() => null, { Push: "Push", OpenInBrowser: "OpenInBrowser", CopyToClipboard: "Copy" }),
      ActionPanel: "ActionPanel",
      Icon: {},
    };
  }
  if (id === "./lib/history") return { saveReportToHistory: async (report) => history.push(report) };
  if (id === "node:https") {
    return {
      get: (url, options, callback) => {
        const request = new EventEmitter();
        request.destroy = (error) => request.emit("error", error);
        const abort = () => request.destroy(Object.assign(new Error("Cancelled"), { name: "AbortError" }));
        if (honorAbort) options.signal?.addEventListener("abort", abort, { once: true });
        pending.push({
          url,
          signal: options.signal,
          reply: (body, statusCode = 200) => {
            const response = new EventEmitter();
            response.statusCode = statusCode;
            callback(response);
            response.emit("data", Buffer.from(typeof body === "string" ? body : JSON.stringify(body)));
            response.emit("end");
            options.signal?.removeEventListener("abort", abort);
          },
          fail: (error) => {
            options.signal?.removeEventListener("abort", abort);
            request.emit("error", error);
          },
        });
        if (options.signal?.aborted && honorAbort) queueMicrotask(abort);
        return request;
      },
    };
  }
  return originalLoad.call(this, id, parent, isMain);
};
global.IS_REACT_ACT_ENVIRONMENT = true;
const { useReportSearch } = require("../src/lib/use-report-search.ts");
const { getReport } = require("../src/lib/is-agentic.ts");
const Command = require("../src/check-is-agentic.tsx").default;
const report = (target) => ({
  target,
  display_target: target,
  report_url: `https://is-agentic.com/report/${target}`,
  score: 72,
  score_label: "Good foundation",
  scanned_at: "2026-10-01T00:00:00Z",
  eligible_checks: 1,
  issues: [],
});
async function harness(initialUrl) {
  let state;
  function Probe() {
    state = useReportSearch(initialUrl);
    return null;
  }
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Probe));
  });
  return {
    get state() {
      return state;
    },
    edit: (text) => act(async () => state.setSearchText(text)),
    close: () => act(async () => renderer.unmount()),
  };
}
const reply = (request, body, status) => act(async () => request.reply(body, status));
const tick = (t, ms) => act(async () => t.mock.timers.tick(ms));

test("empty and invalid input never request a report; rapid edits request only the final URL", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  pending.length = 0;
  const hook = await harness();
  try {
    assert.equal(hook.state.isLoading, false);
    assert.equal(hook.state.report, undefined);
    await hook.edit("   ");
    await tick(t, 300);
    assert.equal(pending.length, 0);
    await hook.edit("https://");
    await tick(t, 300);
    assert.ok(hook.state.error);
    assert.equal(pending.length, 0);
    await hook.edit("first.example");
    await tick(t, 299);
    assert.equal(pending.length, 0);
    await hook.edit("second.example");
    await tick(t, 299);
    assert.equal(pending.length, 0);
    await tick(t, 1);
    assert.equal(pending.length, 1);
    const request = pending.shift();
    assert.equal(new URL(request.url).searchParams.get("url"), "https://second.example/");
    await reply(request, report("second.example"));
    assert.equal(hook.state.report.target, "second.example");
  } finally {
    await hook.close();
  }
});

test("replacement, empty input and unmount cancel requests and ignore late success/failure", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  honorAbort = false; // Deliberately simulate a transport that settles after cancellation.
  pending.length = 0;
  const hook = await harness("old.example");
  try {
    const old = pending.shift();
    await hook.edit("new.example");
    assert.equal(old.signal.aborted, true);
    assert.equal(hook.state.report, undefined);
    await tick(t, 300);
    const current = pending.shift();
    await reply(current, report("new.example"));
    await reply(old, report("old.example"));
    assert.equal(hook.state.report.target, "new.example");
    await hook.edit("failure.example");
    assert.equal(hook.state.report, undefined);
    await tick(t, 300);
    const failure = pending.shift();
    await hook.edit("");
    assert.equal(failure.signal.aborted, true);
    await act(async () => failure.fail(new Error("Late failure")));
    assert.equal(hook.state.error, undefined);
    assert.equal(hook.state.report, undefined);
    assert.equal(hook.state.isLoading, false);
    await tick(t, 300);
    assert.equal(pending.length, 0);
    await hook.edit("unmount.example");
    await tick(t, 300);
    const last = pending.shift();
    await hook.close();
    assert.equal(last.signal.aborted, true);
    await reply(last, report("unmount.example"));
  } finally {
    honorAbort = true;
  }
});

test("current HTTP, malformed JSON and network failures clear reports and recovery clears errors", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  pending.length = 0;
  const hook = await harness("missing.example");
  try {
    await reply(pending.shift(), { code: "report_not_found", detail: "No report", resolution: "Start a scan" }, 404);
    assert.equal(hook.state.error.code, "report_not_found");
    assert.equal(hook.state.error.resolution, "Start a scan");
    for (const [url, response, status, message] of [
      ["server.example", { detail: "Unavailable" }, 503, /Unavailable/],
      ["malformed.example", "not json", 200, /unexpected response/],
    ]) {
      await hook.edit(url);
      assert.equal(hook.state.error, undefined);
      await tick(t, 300);
      await reply(pending.shift(), response, status);
      assert.match(hook.state.error.message, message);
      assert.equal(hook.state.report, undefined);
    }
    await hook.edit("network.example");
    await tick(t, 300);
    await act(async () => pending.shift().fail(new Error("Network unavailable")));
    assert.match(hook.state.error.message, /Network unavailable/);
    await hook.edit("recovery.example");
    await tick(t, 300);
    await reply(pending.shift(), report("recovery.example"));
    assert.equal(hook.state.error, undefined);
    assert.equal(hook.state.report.target, "recovery.example");
    await hook.edit("cancel.example");
    await tick(t, 300);
    const cancelled = pending.shift();
    await hook.edit("");
    assert.equal(cancelled.signal.aborted, true);
    assert.equal(hook.state.error, undefined);
  } finally {
    await hook.close();
  }
});

test("HTTPS forwards cancellation (including pre-aborted signals) and tools can omit the signal", async () => {
  pending.length = 0;
  for (const preAbort of [false, true]) {
    const controller = new AbortController();
    if (preAbort) controller.abort();
    const result = getReport("https://abort.example/", controller.signal);
    const rejection = assert.rejects(result, { name: "AbortError" });
    assert.equal(pending.shift().signal, controller.signal);
    controller.abort();
    await rejection;
  }
  const result = getReport("https://tool.example/");
  const request = pending.shift();
  assert.equal(request.signal, undefined);
  request.reply(report("tool.example"));
  assert.equal((await result).target, "tool.example");
});

test("HTTPS timeout fails normally and cancellation clears its deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  pending.length = 0;
  const timedOut = getReport("https://timeout.example/");
  const rejection = assert.rejects(timedOut, /took too long/);
  t.mock.timers.tick(15_000);
  await rejection;
  const controller = new AbortController();
  const cancelled = getReport("https://cancel-timeout.example/", controller.signal);
  const abortRejection = assert.rejects(cancelled, { name: "AbortError" });
  controller.abort();
  await abortRejection;
  // A dangling deadline would destroy the completed request again.
  assert.doesNotThrow(() => t.mock.timers.tick(15_000));
});

test("optional launch argument executes immediately; only the current report enters history", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const manifest = require("../package.json");
  assert.equal(manifest.commands[0].arguments[0].required, false);
  assert.equal("optional" in manifest.commands[0].arguments[0], false);
  pending.length = 0;
  history.length = 0;
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Command, { arguments: { url: "launch.example" } }));
  });
  try {
    assert.equal(pending.length, 1);
    const old = pending.shift();
    assert.equal(new URL(old.url).searchParams.get("url"), "https://launch.example/");
    const list = renderer.root.findByProps({ searchBarPlaceholder: "Enter a website URL" });
    await act(async () => list.props.onSearchTextChange("replacement.example"));
    assert.equal(old.signal.aborted, true);
    await reply(old, report("launch.example"));
    assert.deepEqual(history, []);
    await tick(t, 300);
    await reply(pending.shift(), report("replacement.example"));
    assert.equal(history.length, 1);
    assert.equal(history[0].target, "replacement.example");
    await act(async () =>
      renderer.root.findByProps({ searchBarPlaceholder: "Enter a website URL" }).props.onSearchTextChange(""),
    );
    assert.equal(renderer.root.findByProps({ searchBarPlaceholder: "Enter a website URL" }).props.isLoading, false);
    assert.equal(history.length, 1);
  } finally {
    await act(async () => renderer.unmount());
  }
});
