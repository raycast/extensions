import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";
import { compileFunction } from "node:vm";
import OpenAI from "openai";
import ts from "typescript";

function compile(name) {
  const source = readFileSync(new URL(`../src/${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const load = compileFunction(outputText, ["exports", "require"]);
  return (imports) => {
    const exports = {};
    load(exports, (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
      return imports[name];
    });
    return exports;
  };
}

const emojiText = compile("emoji-text")({});
const loadAPI = compile("api");
const loadCommand = compile("append-emoji");

function harness({
  selections = ["Ready", "Ready"],
  apps = ["/Editor.app", "/Editor.app"],
  preferences = {},
  answer = "🎉",
  raycastAvailable = true,
  openAI = OpenAI,
} = {}) {
  const pasted = [];
  const copied = [];
  const prompts = [];
  const notices = [];
  const raycast = {
    AI: {
      ask: async (prompt) => {
        prompts.push(prompt);
        return answer;
      },
    },
    environment: { canAccess: () => raycastAvailable },
    getPreferenceValues: () => preferences,
    Clipboard: {
      paste: async (text) => pasted.push(text),
      copy: async (text) => copied.push(text),
    },
    closeMainWindow: async () => {},
    getFrontmostApplication: async () => {
      const path = apps.shift();
      if (!path) throw new Error("App unavailable");
      return { path };
    },
    getSelectedText: async () => {
      const text = selections.shift();
      if (text === undefined) throw new Error("Selection unavailable");
      return text;
    },
    showHUD: async (message) => notices.push(message),
  };
  const api = loadAPI({
    "@raycast/api": raycast,
    "@raycast/utils": {},
    openai: openAI,
    "./emoji-text": emojiText,
  });
  const { default: command } = loadCommand({ "@raycast/api": raycast, "./api": api, "./emoji-text": emojiText });
  return { command, api, pasted, copied, prompts, notices };
}

test("appends complete emoji and preserves the original text and trailing whitespace", () => {
  const text = "  发布完成\nLooks good 🇨🇳 \n\t";
  assert.equal(emojiText.appendEmojiText(text, "🇨🇳 👍🏽 👨‍👩‍👧‍👦"), "  发布完成\nLooks good 🇨🇳 👍🏽👨‍👩‍👧‍👦 \n\t");
  assert.equal(emojiText.appendEmojiText("Ready 🎉 👍", "🎉🎉"), "Ready 🎉 👍");
  assert.equal(emojiText.appendEmojiText("🎉 Ready", "🎉1️⃣"), "🎉 Ready 🎉1️⃣");
});

test("uses Raycast AI and pastes when the selected text and app still match", async () => {
  const run = harness({ preferences: { customPrompt: "Rewrite {text}" } });
  await run.command();
  assert.deepEqual(run.pasted, ["Ready 🎉"]);
  assert.deepEqual(run.copied, []);
  assert.match(run.prompts[0], /Return only emoji.*\n\nSelected text:\nReady$/s);
  await run.api.emojifyText("Ready");
  assert.match(run.prompts[1], /Rewrite \{text\}\nReady$/);
});

test("copies when the text or app changes or cannot be verified", async () => {
  for (const options of [
    { selections: ["Ready", "Changed"] },
    { selections: ["Ready"] },
    { apps: ["/Editor.app", "/Other.app"] },
    { apps: ["/Editor.app"] },
    { apps: [undefined, "/Editor.app"] },
  ]) {
    const run = harness(options);
    await run.command();
    assert.deepEqual(run.pasted, [], JSON.stringify(options));
    assert.deepEqual(run.copied, ["Ready 🎉"]);
  }
});

test("leaves the selection and clipboard alone when there is no valid new emoji", async () => {
  for (const options of [
    { answer: "Try this 🎉" },
    { answer: "👍🏽👍🏻🎉😮‍💨" },
    { answer: "" },
    { selections: ["Ready 🎉"], answer: "🎉" },
  ]) {
    const run = harness(options);
    await run.command();
    assert.deepEqual(run.pasted, []);
    assert.deepEqual(run.copied, []);
  }
});

test("makes no model request when a selection or AI access is missing", async () => {
  for (const options of [{ selections: [] }, { raycastAvailable: false }]) {
    const run = harness(options);
    await run.command();
    assert.deepEqual(run.prompts, []);
    assert.deepEqual(run.pasted, []);
    assert.deepEqual(run.copied, []);
  }
});

test("uses the default OpenAI endpoint and model when only an API key is configured", async () => {
  const { api } = harness({
    preferences: { apiKey: "test-only-key" },
    openAI: class {
      constructor(options) {
        assert.deepEqual(options, { apiKey: "test-only-key", baseURL: "https://api.openai.com/v1" });
      }
      chat = {
        completions: {
          create: async ({ model }) => {
            assert.equal(model, "gpt-4o-mini");
            return { choices: [{ message: { content: "🎉" } }] };
          },
        },
      };
    },
  });
  assert.equal(await api.getAppendEmojis("Ready"), "🎉");
});

test("reuses the custom provider and rejects redirects before writing to the clipboard", async () => {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push({
      url: request.url,
      authorization: request.headers.authorization,
      body: JSON.parse(Buffer.concat(chunks).toString()),
    });
    if (request.url === "/redirect/chat/completions") {
      response.writeHead(307, { location: "/v1/chat/completions" }).end();
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ choices: [{ message: { content: "🎉" } }] }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const selected = "Keep $& and {text} exactly\n";
    const preferences = { apiKey: "test-only-key", model: "test-model", customPrompt: "Rewrite {text}" };
    const custom = harness({
      selections: [selected, selected],
      preferences: { ...preferences, baseURL: `${origin}/v1` },
    });
    await custom.command();
    assert.deepEqual(custom.pasted, ["Keep $& and {text} exactly 🎉\n"]);
    assert.deepEqual(custom.prompts, []);
    assert.equal(requests[0].url, "/v1/chat/completions");
    assert.equal(requests[0].authorization, "Bearer test-only-key");
    assert.equal(requests[0].body.model, "test-model");
    assert.deepEqual(requests[0].body.messages[1], { role: "user", content: selected });

    const redirected = harness({ preferences: { ...preferences, baseURL: `${origin}/redirect` } });
    await redirected.command();
    assert.deepEqual(redirected.pasted, []);
    assert.deepEqual(redirected.copied, []);
    assert.deepEqual(
      requests.map(({ url }) => url),
      ["/v1/chat/completions", "/redirect/chat/completions"],
    );
    assert.doesNotMatch(redirected.notices.join(" "), /test-only-key/);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("blocks remote plain HTTP before calling the provider", async () => {
  for (const hostname of ["example.test", "127.example.test", "localhost.example.test"]) {
    const run = harness({
      preferences: { apiKey: "test-only-key", baseURL: `http://${hostname}/v1` },
      openAI: class {
        constructor() {
          assert.fail("The provider must not be called over remote HTTP");
        }
      },
    });
    await assert.rejects(run.api.getAppendEmojis("Ready"), /Use HTTPS/);
  }
});
