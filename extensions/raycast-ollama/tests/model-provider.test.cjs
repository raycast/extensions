const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Load the real provider and SDK with only Raycast's persisted server settings
// replaced. TypeScript is already a development dependency of the extension.
function loadProvider() {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const requireFromFile = createRequire(filename);
    const localRequire = (id) => {
      if (id === "./lib/settings/settings") {
        const server = { url: "http://ollama.test" };
        return {
          GetOllamaServers: async () => new Map([["Local", server]]),
          GetOllamaServerByName: async () => server,
        };
      }
      return id.startsWith(".") ? load(path.resolve(path.dirname(filename), `${id}.ts`)) : requireFromFile(id);
    };
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
    });
    vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename })(
      localRequire,
      module,
      module.exports,
    );
    return module.exports;
  }
  return load(path.resolve(__dirname, "../src/models.ts"));
}

const provider = loadProvider();
const model = { name: "llama:latest", size: 1000, details: { family: "llama", parameter_size: "8B" } };

for (const [parameters, maximum, expected] of [
  ["num_ctx 4096", 131072, 4096],
  ["temperature 0.7\nnum_ctx 8192", 131072, 8192],
  [undefined, 131072, 4096],
  ["num_ctx 0", 131072, 4096],
  [undefined, 2048, 2048],
]) {
  test(`registers usable context ${expected} for ${parameters ?? "default"} with maximum ${maximum}`, async (t) => {
    t.mock.method(globalThis, "fetch", async (url) => {
      if (String(url).endsWith("/api/tags")) return Response.json({ models: [model] });
      assert.equal(String(url), "http://ollama.test/api/show");
      return Response.json({
        capabilities: ["completion", "tools"],
        parameters,
        model_info: { "llama.context_length": maximum },
      });
    });
    const [registered] = await provider.getModels();
    assert.equal(registered.contextWindow, expected);
  });
}

for (const toolChoice of ["required", "auto", undefined]) {
  test(`forwards ${toolChoice ?? "default"} tool choice through the real SDK`, async (t) => {
    let body;
    t.mock.method(globalThis, "fetch", async (url, init) => {
      assert.equal(String(url), "http://ollama.test/v1/chat/completions");
      body = JSON.parse(init.body);
      const chunk = {
        id: "response-1",
        object: "chat.completion.chunk",
        created: 1,
        model: "llama:latest",
        choices: [
          {
            index: 0,
            delta:
              toolChoice === "required"
                ? {
                    tool_calls: [
                      { index: 0, id: "call-1", type: "function", function: { name: "weather", arguments: "{}" } },
                    ],
                  }
                : { content: "Hello" },
            finish_reason: toolChoice === "required" ? "tool_calls" : "stop",
          },
        ],
      };
      return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      });
    });
    const stream = await provider.streamCompletion(
      { id: "Local/llama%3Alatest", title: "Llama" },
      {
        messages: [{ role: "user", content: "Check the weather" }],
        tools: { weather: { description: "Weather", inputSchema: { type: "object", properties: {} } } },
        toolChoice,
      },
    );
    const parts = [];
    for await (const part of stream.fullStream) parts.push(part);
    assert.ok(parts.some((part) => part.type === (toolChoice === "required" ? "tool-call" : "text-delta")));
    assert.ok(parts.every((part) => part.type !== "error"));
    assert.equal(body.tool_choice, toolChoice ?? "auto");
    assert.equal(body.tools[0].function.name, "weather");
  });
}
