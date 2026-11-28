const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const defaults = { theme: "candy", padding: "64", darkMode: true, background: true };

// Raycast's native API is unavailable in Node; load the real tool source with mocked host APIs.
function loadTool(name, { open = async () => {}, fetch = async () => {} } = {}) {
  function load(file) {
    const exports = {};
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(source, {
      exports,
      Buffer,
      URLSearchParams,
      fetch,
      require: (id) =>
        id === "@raycast/api"
          ? { getPreferenceValues: () => ({ ...defaults }), open }
          : load(path.resolve(path.dirname(file), `${id}.ts`)),
    });
    return exports;
  }
  return load(path.resolve(__dirname, `../src/tools/${name}.ts`)).default;
}

test("creation uses saved defaults and opens the exact returned URL", async () => {
  const opened = [];
  const tool = loadTool("create-code-image", { open: async (url) => opened.push(url) });
  const code = "  const greeting = 'Hello 👋 世界';\n";
  const result = await tool({ code });
  const params = new URLSearchParams(new URL(result.url).hash.slice(1));
  for (const [key, value] of Object.entries(defaults)) assert.equal(params.get(key), String(value));
  assert.equal(Buffer.from(params.get("code"), "base64url").toString("utf8"), code);
  assert.equal(params.get("language"), "auto");
  assert.deepEqual(opened, [result.url]);
  assert.equal(result.openedInBrowser, true);
  assert.equal(result.imageExported, false);
  assert.doesNotThrow(() => structuredClone(result));
});

test("explicit false overrides and special-character titles survive link-only creation", async () => {
  const tool = loadTool("create-code-image", { open: async () => assert.fail("Must not open browser") });
  const title = "Hello & world #1 + 100% 日本";
  const result = await tool({
    code: "print('Hello')",
    title,
    theme: "noir",
    padding: 32,
    darkMode: false,
    background: false,
    language: "python",
    openInBrowser: false,
  });
  const params = new URLSearchParams(new URL(result.url).hash.slice(1));
  for (const [key, value] of Object.entries({
    title,
    theme: "noir",
    padding: "32",
    darkMode: "false",
    background: "false",
    language: "python",
  })) {
    assert.equal(params.get(key), value);
  }
  assert.equal(result.openedInBrowser, false);
});

test("invalid input is rejected before opening, and browser failures propagate", async () => {
  const tool = loadTool("create-code-image", {
    open: async () => {
      throw new Error("Browser unavailable");
    },
  });
  await assert.rejects(tool({ code: " \n " }), /Provide the code/);
  await assert.rejects(tool({ code: "hello", padding: 0 }), /Padding must be/);
  await assert.rejects(tool({ code: "hello" }), /Browser unavailable/);
});

test("options include saved defaults and normalized live catalog entries", async () => {
  const tool = loadTool("get-image-options", {
    fetch: async (url) => {
      assert.equal(url, "https://ray.so/api/config");
      return {
        ok: true,
        json: async () => ({
          themes: [{ id: "candy", name: "Candy", partner: false }],
          languages: [{ id: "python", name: "Python" }],
          padding: [16, 32, 64, 128],
        }),
      };
    },
  });
  const result = structuredClone(await tool());
  assert.deepEqual(result.defaults, { ...defaults, padding: 64, language: "auto" });
  assert.deepEqual(result.themes, [{ id: "candy", name: "Candy" }]);
  assert.deepEqual(result.languages, [
    { id: "auto", name: "Auto-Detect" },
    { id: "python", name: "Python" },
  ]);
  assert.deepEqual(result.padding, [16, 32, 64, 128]);
});

test("options surface HTTP failures", async () => {
  const tool = loadTool("get-image-options", { fetch: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(tool(), /Could not load ray.so image options \(503\)/);
});
