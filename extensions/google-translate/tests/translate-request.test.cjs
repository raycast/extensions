const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const { stringify } = require("node:querystring");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const vendorRoot = path.join(__dirname, "../vendor/@iamtraction-translate/src");

function loadTranslate({ fetch, undici }) {
  const cache = new Map();

  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const code = ts
      .transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
      })
      .outputText.replaceAll('import("undici")', 'require("undici")');
    const module = { exports: {} };
    cache.set(file, module);
    vm.runInNewContext(
      code,
      {
        exports: module.exports,
        module,
        console,
        fetch,
        URLSearchParams,
        require(name) {
          if (name === "querystring") return require("querystring");
          if (name === "undici") return undici;
          if (name.startsWith(".")) {
            const resolved = path.resolve(path.dirname(file), name);
            const candidate = existsSync(`${resolved}.ts`) ? `${resolved}.ts` : resolved;
            return load(candidate);
          }
          throw new Error(`Unexpected import: ${name}`);
        },
      },
      { filename: file },
    );
    return module.exports;
  }

  return load(path.join(vendorRoot, "index.ts")).translate;
}

function reply(text, from, pronunciation) {
  return [
    [
      [text, "source", null, null, 1],
      [null, null, pronunciation ?? null, pronunciation ? null : "həˈlō"],
    ],
    null,
    from,
    null,
    null,
    null,
    null,
    1,
    [],
    [[from], null, [1], [from]],
  ];
}

function response({ status = 200, body, onCancel, onDump }) {
  return {
    status,
    statusCode: status,
    async json() {
      return body;
    },
    body: {
      async json() {
        return body;
      },
      async cancel() {
        onCancel?.();
      },
      async dump() {
        onDump?.();
      },
    },
  };
}

test("parses the compact reply, detected language, and pronunciation", async () => {
  const calls = [];
  const translate = loadTranslate({
    fetch: async (url, init) => {
      calls.push({ url, init });
      return response({ body: reply("Hola", "en") });
    },
  });

  const result = await translate("hello", { from: "auto", to: "es", raw: true });

  assert.equal(result.text, "Hola");
  assert.equal(result.from.language.iso, "en");
  assert.equal(result.raw[0][1][3], "həˈlō");
  assert.equal(calls[0].init.method, "GET");
  assert.match(calls[0].url, /dt=t/);
  assert.match(calls[0].url, /dt=rm/);
  assert.doesNotMatch(calls[0].url, /dt=bd/);
  assert.equal(calls.length, 1);

  await translate("hello", { from: "auto", to: "es" });
  assert.equal(calls.length, 1);
});

test("one shared request serves callers that are already waiting", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const translate = loadTranslate({
    fetch: () => {
      calls += 1;
      return gate.then(() => response({ body: reply("Hola", "en") }));
    },
  });

  const pending = Promise.all([translate("hello", { to: "es" }), translate("hello", { to: "es" })]);
  assert.equal(calls, 1);
  release();
  const [first, second] = await pending;
  assert.equal(first.text, "Hola");
  assert.equal(second.text, first.text);
  assert.equal(calls, 1);
});

test("a failed request is discarded and the next attempt runs again", async () => {
  let calls = 0;
  let cancelled = 0;
  const translate = loadTranslate({
    fetch: async () => {
      calls += 1;
      if (calls === 1) return response({ status: 429, onCancel: () => (cancelled += 1) });
      return response({ body: reply("Hola", "es") });
    },
  });

  await assert.rejects(translate("hello", { to: "fr" }), (error) => error.name === "TooManyRequestsError");
  assert.equal(cancelled, 1);
  assert.equal((await translate("hello", { to: "fr" })).text, "Hola");
  assert.equal(calls, 2);
});

test("text that does not fit in a GET is posted in the body", async () => {
  let seen;
  const translate = loadTranslate({
    fetch: async (url, init) => {
      seen = { url, method: init.method, body: init.body };
      return response({ body: reply("ok", "en", "oh-kay") });
    },
  });
  let text = "a";
  const base = "https://translate.google.com/translate_a/single?";
  while (
    `${base}${stringify({ client: "dict-chrome-ex", sl: "en", tl: "es", dt: ["t", "rm"], ie: "UTF-8", oe: "UTF-8", q: text })}`
      .length <= 2048
  ) {
    text += "a";
  }

  const result = await translate(text, { from: "en", to: "es", raw: true });

  assert.equal(seen.method, "POST");
  assert.equal(seen.body, new URLSearchParams({ q: text }).toString());
  assert.equal(seen.url.includes("q="), false);
  assert.equal(result.text, "ok");
  assert.equal(result.raw[0][1][2], "oh-kay");
});

test("a proxy error is drained before it is thrown", async () => {
  let dumped = 0;
  const translate = loadTranslate({
    undici: {
      __esModule: true,
      default: {
        request: async () => response({ status: 500, onDump: () => (dumped += 1) }),
        ProxyAgent: function ProxyAgent() {},
      },
    },
  });

  await assert.rejects(
    translate("hello", { to: "de", proxy: "http://127.0.0.1:8080" }),
    (error) => error.name === "TranslateError",
  );
  assert.equal(dumped, 1);
});
