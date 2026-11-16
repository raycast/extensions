import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as core from "../src/core.ts";

const settings = {
  apiBaseUrl: "https://example.test/v1",
  apiKey: "test-only-key",
  model: "test-model",
  maxEmojis: "3",
};
const reply = (content) => ({ choices: [{ message: { content } }] });

test("API URL normalization accepts origins, version roots, proxy paths and full endpoints", () => {
  for (const [input, output] of [
    ["https://example.test", "https://example.test/v1/chat/completions"],
    ["https://example.test/v1/", "https://example.test/v1/chat/completions"],
    ["http://localhost:1234/v1", "http://localhost:1234/v1/chat/completions"],
    ["https://example.test/proxy/v2", "https://example.test/proxy/v2/chat/completions"],
    ["https://example.test/v1/chat/completions/?region=cn", "https://example.test/v1/chat/completions?region=cn"],
  ])
    assert.equal(core.prepareRequest("你好", { ...settings, apiBaseUrl: input }).url, output);
});

test("invalid settings and empty/oversized selections fail before the request", () => {
  for (const config of [
    { apiBaseUrl: "not-a-url" },
    { apiBaseUrl: "file:///tmp/key" },
    { apiBaseUrl: "https://user:password@example.test" },
    { apiBaseUrl: "https://example.test/#key" },
    { apiKey: "" },
    { apiKey: "key\r\nHeader: value" },
    { model: " " },
    { maxEmojis: "4" },
  ])
    assert.throws(() => core.prepareRequest("你好", { ...settings, ...config }), core.SettingsError);
  assert.throws(() => core.prepareRequest(" \n", settings));
  assert.throws(() => core.prepareRequest("a".repeat(12001), settings));
});

test("preserves text, whitespace and complete emoji sequences", () => {
  for (const emoji of [
    "🎉",
    "👍🏽",
    "👨‍👩‍👧‍👦",
    "🇨🇳",
    "1️⃣",
    "❤️",
    "🏳️‍🌈",
    "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  ]) {
    assert.equal(core.appendResponse("  修好了！\n\t", reply(emoji), 1), `  修好了！ ${emoji}\n\t`);
  }
  assert.equal(core.appendResponse("你好", reply("🎉 😮‍💨"), 3), "你好 🎉😮‍💨");
  assert.equal(core.appendResponse("完成 🎉", reply("🎉🎉"), 3), "完成 🎉");
  assert.equal(core.appendResponse("完成 🎉 \n", reply("🎉👍"), 3), "完成 🎉 👍 \n");
});

test("rejects explanations, malformed responses and excessive emojis without rewriting text", () => {
  for (const content of ["", "Here you go 🎉", "🎉!", '"🎉"', "🇨", "👍🏽👍🏻🎉😮‍💨"]) {
    assert.throws(() => core.appendResponse("原文", reply(content), 3));
  }
  for (const data of [null, {}, { choices: [] }, reply(null)])
    assert.throws(() => core.appendResponse("原文", data, 3));
  assert.match(core.httpError(401).message, /鉴权/);
  assert.match(core.httpError(429).message, /额度/);
});

function loadModule(relativePath, modules, globals = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
    },
  }).outputText;
  const exports = {};
  runInNewContext(js, {
    exports,
    Error,
    URL,
    AbortSignal,
    fetch,
    require: (name) => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    },
    ...globals,
  });
  return exports.default ?? exports;
}

function raycastHarness({
  selected = "修好了",
  current = selected,
  appChanged = false,
  apiSettings = settings,
  fetcher = async () => Response.json(reply("🎉")),
} = {}) {
  const pasted = [],
    copied = [],
    notices = [];
  let reads = 0,
    appReads = 0,
    requests = 0,
    preferencesOpened = 0;
  const api = {
    Clipboard: {
      paste: async (text) => pasted.push(text),
      copy: async (text) => copied.push(text),
    },
    closeMainWindow: async () => {},
    getFrontmostApplication: async () => ({
      path: appReads++ && appChanged ? "/Other.app" : "/Original.app",
    }),
    getPreferenceValues: () => apiSettings,
    getSelectedText: async () => {
      const value = reads++ ? current : selected;
      if (value === undefined) throw new Error("No selection");
      return value;
    },
    openExtensionPreferences: async () => {
      preferencesOpened++;
    },
    showHUD: async (text) => notices.push(text),
  };
  const command = loadModule(
    "../src/append-emoji.ts",
    { "@raycast/api": api, "./core": core },
    {
      fetch: async (...args) => {
        requests++;
        return fetcher(...args);
      },
    },
  );
  return {
    command,
    pasted,
    copied,
    notices,
    requests: () => requests,
    preferencesOpened: () => preferencesOpened,
  };
}

test("Raycast only pastes into an unchanged selection in the original app", async () => {
  const success = raycastHarness();
  await success.command();
  assert.deepEqual(success.pasted, ["修好了 🎉"]);
  for (const options of [{ current: "新内容" }, { current: "" }, { appChanged: true }]) {
    const changed = raycastHarness(options);
    await changed.command();
    assert.deepEqual(changed.pasted, []);
    assert.deepEqual(changed.copied, ["修好了 🎉"]);
  }
});

test("Raycast API failures never paste or expose response bodies/credentials", async () => {
  for (const fetcher of [
    async () => new Response("sensitive provider error", { status: 401 }),
    async () => new Response("not json"),
    async () => Response.json(reply("Please replace everything 🎉")),
    async () => {
      throw new Error("test-only-key network detail");
    },
  ]) {
    const harness = raycastHarness({ fetcher });
    await harness.command();
    assert.deepEqual(harness.pasted, []);
    assert.deepEqual(harness.copied, []);
    assert.doesNotMatch(harness.notices.join(" "), /test-only-key|sensitive provider error/);
  }
  const invalid = raycastHarness({ apiSettings: { ...settings, model: "" } });
  await invalid.command();
  assert.equal(invalid.requests(), 0);
  assert.equal(invalid.preferencesOpened(), 1);
});

test("Raycast sends the configured request to a real local HTTP mock", async () => {
  let captured;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    captured = {
      url: req.url,
      authorization: req.headers.authorization,
      body: JSON.parse(Buffer.concat(chunks).toString()),
    };
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(reply("🎉😮‍💨")));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const harness = raycastHarness({
      apiSettings: {
        ...settings,
        apiBaseUrl: `http://127.0.0.1:${server.address().port}/v1`,
      },
      fetcher: fetch,
    });
    await harness.command();
    assert.deepEqual(harness.pasted, ["修好了 🎉😮‍💨"]);
    assert.equal(captured.url, "/v1/chat/completions");
    assert.equal(captured.authorization, "Bearer test-only-key");
    assert.equal(captured.body.model, "test-model");
    assert.equal(captured.body.messages[1].content, "修好了");
    assert.equal(captured.body.stream, false);
  } finally {
    server.close();
    await once(server, "close");
  }
});
