import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

const require = createRequire(import.meta.url);
const article = `<html><head><title>Readable article</title></head><body><article><h1>Readable article</h1><p>${"This is useful readable article content about browsers and Markdown. ".repeat(40)}</p></article></body></html>`;

function harness({ fetchImpl = async () => new Response(article), timeoutMs, canAccess = true, tabs = [] } = {}) {
  const writes = [];
  const toasts = [];
  const effects = [];
  const stateUpdates = [];
  const api = {
    Clipboard: { copy: () => writes.push("clipboard"), readText: async () => "" },
    LocalStorage: { getItem: async () => undefined, setItem: () => writes.push("history") },
    Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
    showToast: async () => {
      const toast = {
        hide: async () => {
          toast.hidden = true;
        },
      };
      toasts.push(toast);
      return toast;
    },
    environment: { canAccess: () => canAccess },
    BrowserExtension: { getTabs: async () => (typeof tabs === "function" ? tabs() : tabs) },
    getSelectedText: async () => "",
    List: Object.assign(() => null, { Item: () => null, Section: () => null, EmptyView: () => null }),
    Action: Object.assign(() => null, { Push: () => null, OpenInBrowser: () => null, Style: {} }),
    ActionPanel: Object.assign(() => null, { Section: () => null }),
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Detail: () => null,
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    cache.set(file, module.exports);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        require: (name) => {
          if (name === "@raycast/api") return api;
          if (name === "react")
            return {
              useEffect: (fn) => effects.push(fn),
              useState: (initial) => [initial, (value) => stateUpdates.push(value)],
            };
          if (name === "defuddle/node") return { Defuddle };
          if (name === "linkedom") return { parseHTML };
          if (name.startsWith(".")) return load(path.resolve(path.dirname(file), `${name}.ts`));
          return require(name);
        },
        fetch: fetchImpl,
        URL,
        AbortController,
        AbortSignal,
        console,
        setTimeout: (fn, ms) => setTimeout(fn, timeoutMs ?? ms),
        clearTimeout,
      },
      { filename: file },
    );
    return module.exports;
  }
  return { load, writes, toasts, effects, stateUpdates, api };
}

function stalledFetch(_url, { signal }) {
  return new Promise((_resolve, reject) => {
    signal.throwIfAborted();
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

const url = "https://example.com/article";
test("tool returns actual extracted Markdown and metadata without side effects on repeated calls", async () => {
  let calls = 0;
  const h = harness({
    fetchImpl: async () => {
      calls++;
      return new Response(article);
    },
  });
  const tool = h.load("src/tools/extract-markdown.ts").default;
  for (let i = 0; i < 2; i++) {
    const result = await tool({ url });
    assert.equal(result.url, url);
    assert.equal(result.title, "Readable article");
    assert.match(result.markdown, /useful readable article content/);
  }
  assert.equal(calls, 2);
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.toasts, []);
});

test("invalid URLs fail before any network request or toast", async () => {
  const h = harness({ fetchImpl: () => assert.fail("unexpected fetch") });
  const tool = h.load("src/tools/extract-markdown.ts").default;
  for (const invalid of [
    "",
    "not a URL",
    "ftp://example.com",
    "javascript:alert(1)",
    "https://",
    "https://example.com bad",
    "https://user:password@example.com",
    "https:example.com",
    "https://example.com\\@evil.com",
  ]) {
    await assert.rejects(tool({ url: invalid }), /valid HTTP or HTTPS URL/);
  }
  assert.equal(h.toasts.length, 0);
});

test("deadline aborts a stalled page request and supports retry", async () => {
  let calls = 0;
  const h = harness({
    timeoutMs: 15,
    fetchImpl: (...args) => (++calls === 1 ? stalledFetch(...args) : Promise.resolve(new Response(article))),
  });
  const extract = h.load("src/lib/defuddle.ts").extractMarkdown;
  await assert.rejects(extract(url), /timed out after 30 seconds/);
  assert.equal(h.toasts[0].style, "failure");
  assert.equal((await extract(url)).title, "Readable article");
});

test("deadline covers stalled response body", async () => {
  const h = harness({
    timeoutMs: 15,
    fetchImpl: async (_url, { signal }) => ({ ok: true, text: () => stalledFetch(url, { signal }) }),
  });
  await assert.rejects(h.load("src/lib/defuddle.ts").extractMarkdown(url), /timed out/);
});

test("external cancellation aborts network and hides progress", async () => {
  const h = harness({ fetchImpl: stalledFetch });
  const controller = new AbortController();
  const pending = h.load("src/lib/defuddle.ts").extractMarkdown(url, { signal: controller.signal });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(h.toasts[0].hidden, true);
  assert.deepEqual(h.writes, []);
});

test("pre-cancelled requests have no effects", async () => {
  const h = harness({ fetchImpl: () => assert.fail("unexpected fetch") });
  await assert.rejects(h.load("src/lib/defuddle.ts").extractMarkdown(url, { signal: AbortSignal.abort() }), {
    name: "AbortError",
  });
  assert.equal(h.toasts.length, 0);
});

test("HTTP failures are reported and do not write history", async () => {
  const h = harness({ fetchImpl: async () => new Response("missing", { status: 404 }) });
  await assert.rejects(h.load("src/lib/defuddle.ts").extractMarkdown(url), /404/);
  assert.deepEqual(h.writes, []);
});

test("browser input tolerates unavailable integration, no active tab, and API failures", async () => {
  for (const options of [
    { canAccess: false, tabs: () => assert.fail("unexpected browser access") },
    { tabs: [] },
    { tabs: [{ active: false, url }] },
    {
      tabs: () => {
        throw new Error("No browser");
      },
    },
  ]) {
    const h = harness(options);
    assert.equal((await h.load("src/lib/browser.ts").getActiveBrowserUrls()).length, 0);
  }
});

test("browser input lists all active HTTP tabs, filtering invalid and duplicate URLs", async () => {
  const h = harness({
    tabs: [
      { active: true, url },
      { active: true, url },
      { active: true, url: "https://example.org/" },
      { active: true, url: "chrome://newtab/" },
      { active: true, url: "https://" },
    ],
  });
  assert.deepEqual(Array.from(await h.load("src/lib/browser.ts").getActiveBrowserUrls()), [
    url,
    "https://example.org/",
  ]);
});

function findTarget(element, actionPush) {
  if (!element || typeof element !== "object") return;
  if (element.type === actionPush) return element.props.target;
  if (element.type?.name === "ExtractUrlItem") return findTarget(element.type(element.props), actionPush);
  for (const value of Object.values(element.props ?? {})) {
    for (const child of Array.isArray(value) ? value : [value]) {
      const found = findTarget(child, actionPush);
      if (found) return found;
    }
  }
}

test("leaving detail cancels extraction before history save; reopening starts a fresh request", async () => {
  let calls = 0;
  const h = harness({
    fetchImpl: (...args) => {
      calls++;
      return stalledFetch(...args);
    },
  });
  const command = h.load("src/get-markdown.tsx").default;
  const tree = command({ arguments: { url } });
  const target = findTarget(tree, h.api.Action.Push);
  assert.ok(target);
  h.effects.length = 0;
  target.type(target.props);
  const cleanup = h.effects.pop()();
  await new Promise((resolve) => setImmediate(resolve));
  cleanup();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(h.writes, []);
  target.type(target.props);
  const secondCleanup = h.effects.pop()();
  await new Promise((resolve) => setImmediate(resolve));
  secondCleanup();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.deepEqual(h.writes, []);
});

test("cancellation during history read prevents a history write", async () => {
  const h = harness();
  let resolveHistory;
  h.api.LocalStorage.getItem = () =>
    new Promise((resolve) => {
      resolveHistory = resolve;
    });
  const controller = new AbortController();
  const pending = h
    .load("src/lib/defuddle.ts")
    .saveToHistory({ url, title: "Article", markdown: "Content" }, controller.signal);
  controller.abort();
  resolveHistory(undefined);
  await assert.rejects(pending, { name: "AbortError" });
  assert.deepEqual(h.writes, []);
});

test("typed explicit URLs do not silently reinterpret malformed URLs or credentials", () => {
  const normalize = harness().load("src/lib/defuddle.ts").normalizeUrl;
  for (const invalid of ["ftp://example.com", "https://user:pass@example.com", "https://example.com bad"])
    assert.equal(normalize(invalid), undefined);
  assert.equal(normalize("example.com/article"), url);
});

test("cancellation propagates to image validation requests", async () => {
  const controller = new AbortController();
  let imageStarted;
  const started = new Promise((resolve) => {
    imageStarted = resolve;
  });
  const h = harness({
    fetchImpl: async (requestUrl, options) => {
      if (requestUrl === url)
        return new Response(
          article.replace(
            "</article>",
            '<img src="https://example.com/photo.jpg" alt="Photo" width="800" height="600" /></article>',
          ),
        );
      imageStarted();
      return stalledFetch(requestUrl, options);
    },
  });
  const pending = h.load("src/lib/defuddle.ts").extractMarkdown(url, { signal: controller.signal });
  await started;
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("bare hostnames with numeric ports remain valid while unsupported schemes and invalid ports fail", () => {
  const normalize = harness().load("src/lib/defuddle.ts").normalizeUrl;
  for (const input of [
    "example.com:8080/article",
    "www.example.com:8080/article",
    "sub.example.com:8443/article?x=1#section",
  ]) {
    assert.equal(normalize(input), `https://${input}`);
  }
  for (const input of [
    "example.com:99999/article",
    "example.com:abc/article",
    "ftp://example.com:8080/article",
    "javascript:alert(1)",
  ]) {
    assert.equal(normalize(input), undefined);
  }
});

for (const source of ["Selected Text", "Clipboard"]) {
  test(`${source} suggestions render before a slow browser reply and remain intact afterward`, async () => {
    let resolveTabs;
    const tabs = new Promise((resolve) => {
      resolveTabs = resolve;
    });
    const h = harness({ tabs: () => tabs });
    if (source === "Selected Text") h.api.getSelectedText = async () => url;
    else h.api.Clipboard.readText = async () => url;
    h.load("src/get-markdown.tsx").default({ arguments: {} });
    const cleanup = h.effects.pop()();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.stateUpdates.length, 1);
    assert.equal(h.stateUpdates[0][0].source, source);
    assert.equal(h.stateUpdates[0][0].url, url);
    resolveTabs([
      { active: true, url },
      { active: true, url: "https://example.org/" },
    ]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.stateUpdates[0].length, 1, "the published snapshot must not be mutated");
    assert.equal(h.stateUpdates[1].length, 2);
    assert.equal(h.stateUpdates[1][1].source, "Active Browser Tab");
    cleanup();
  });
}

test("a late browser reply cannot update suggestions after leaving the command", async () => {
  let resolveTabs;
  const tabs = new Promise((resolve) => {
    resolveTabs = resolve;
  });
  const h = harness({ tabs: () => tabs });
  h.api.Clipboard.readText = async () => url;
  h.load("src/get-markdown.tsx").default({ arguments: {} });
  const cleanup = h.effects.pop()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.stateUpdates.length, 1);
  cleanup();
  resolveTabs([{ active: true, url: "https://example.org/" }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.stateUpdates.length, 1);
});

test("labeled text still yields its embedded HTTP URL", () => {
  const normalize = harness().load("src/lib/defuddle.ts").normalizeUrl;
  for (const input of [
    "Source: https://example.com/article",
    "Link:https://example.com/article",
    "URL: https://example.com/article",
    "Source: read https://example.com/article",
    "Link: (https://example.com/article)",
    "Source: example.com/article",
    "Read https://example.com/article for more information",
  ]) {
    assert.equal(normalize(input), url, input);
  }
  assert.equal(normalize("Link:http://example.com:8080/article"), "http://example.com:8080/article");
});

test("leading unsupported or dangerous schemes remain rejected even with embedded HTTP URLs", () => {
  const normalize = harness().load("src/lib/defuddle.ts").normalizeUrl;
  for (const input of [
    "ftp://example.com/article",
    "custom://example.com/article",
    "ftp:example.com/article",
    "https:example.com/article",
    "javascript:https://example.com/article",
    "javascript:alert('https://example.com/article')",
    "data:text/plain,https://example.com/article",
    "vbscript: https://example.com/article",
    "file: https://example.com/article",
    "mailto:user@example.com",
    "blob:https://example.com/article",
  ]) {
    assert.equal(normalize(input), undefined, input);
  }
});
