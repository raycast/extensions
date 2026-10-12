const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Every module runs with synthetic Raycast APIs and a mocked fetch. These tests
// never load @raycast/api or read the real clipboard/selection/local storage.
function harness(options = {}) {
  const calls = {
    requests: [],
    copies: [],
    history: [],
    historyAttempts: 0,
    toasts: [],
    hud: [],
    confirmations: [],
    pops: 0,
  };
  const raycast = {
    Toast: { Style: { Failure: "failure", Success: "success", Animated: "animated" } },
    Clipboard: {
      readText: async () => {
        if (options.readError) throw options.readError;
        return options.content;
      },
      copy: async (url) => {
        if (options.copyError) throw new Error("Clipboard unavailable");
        calls.copies.push(url);
      },
    },
    getSelectedText: async () => {
      if (options.readError) throw options.readError;
      return options.content;
    },
    getPreferenceValues: () => ({ language: options.language }),
    confirmAlert: async (config) => {
      calls.confirmations.push(config);
      return options.confirmed !== false;
    },
    showToast: async (config) => {
      const toast = { ...config, hide: async () => {} };
      calls.toasts.push(toast);
      return toast;
    },
    showHUD: async (message) => calls.hud.push(message),
    popToRoot: async () => calls.pops++,
    Keyboard: { Shortcut: { Common: { Save: {} } } },
    Form: { TextArea: "TextArea", Dropdown: Object.assign("Dropdown", { Item: "DropdownItem" }) },
    Action: { SubmitForm: "SubmitForm" },
    ActionPanel: "ActionPanel",
  };
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(__dirname, "..", filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    });
    const context = {
      module,
      exports: module.exports,
      URL,
      Error,
      AbortSignal,
      fetch: async (url, init) => {
        calls.requests.push({ url: String(url), init });
        init.signal?.throwIfAborted();
        if (options.networkError) throw options.networkError;
        return {
          status: options.status ?? 201,
          ok: (options.status ?? 201) < 300,
          text: async () => options.body ?? "https://paste.rs/Fixture123\n",
        };
      },
      require: (specifier) => {
        if (specifier === "@raycast/api") return raycast;
        if (specifier === "@raycast/utils") {
          return {
            FormValidation: { Required: "required" },
            useForm: (config) => {
              calls.form = config;
              return { handleSubmit: config.onSubmit, itemProps: { content: {}, language: {} } };
            },
          };
        }
        if (specifier === "react/jsx-runtime")
          return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
        if (specifier === "./history" || specifier === "../history") {
          return {
            addToHistory: async (record) => {
              calls.historyAttempts++;
              if (options.historyError) throw new Error("Storage unavailable");
              calls.history.push(record);
            },
          };
        }
        if (!specifier.startsWith(".")) throw new Error(`Unexpected dependency: ${specifier}`);
        return load(path.join(path.dirname(filename), `${specifier}.ts`));
      },
    };
    vm.runInNewContext(outputText, context, { filename });
    return module.exports;
  }
  return { load, calls };
}

const manifest = JSON.parse(readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));

test("manifest and form offer only verified service extensions, with plain text default", () => {
  const h = harness();
  const { LANGUAGES } = h.load("src/languages.ts");
  const supported =
    "bash c cpp cs clj css diff erl go hs html java js json lua md ml pl php py r rb rs scala sh sql xml yaml".split(
      " ",
    );
  assert.equal(LANGUAGES[0].value, "");
  assert.deepEqual(Array.from(LANGUAGES.slice(1), (item) => item.value).sort(), supported.sort());
  assert.equal(new Set(LANGUAGES.map((item) => item.value)).size, LANGUAGES.length);
  assert.deepEqual(JSON.parse(JSON.stringify(LANGUAGES)), manifest.preferences[0].data);
  assert.equal(manifest.preferences[0].default, "");
  assert.equal(manifest.title, "paste.rs");
  assert.equal(manifest.commands.find((item) => item.name === "paste-selected-text").mode, "no-view");
});

for (const language of ["", "rs", "md", "cpp", "py"]) {
  test(`create returns the exact URL for ${language || "plain text"} and preserves content`, async () => {
    const h = harness();
    const content = "  fn main() {}\n";
    const result = await h.load("src/api.ts").createPaste(content, language);
    assert.equal(result.url, `https://paste.rs/Fixture123${language ? `.${language}` : ""}`);
    assert.equal(result.partial, false);
    assert.equal(h.calls.requests[0].url, "https://paste.rs/");
    assert.equal(h.calls.requests[0].init.body, content);
    assert.equal(h.calls.requests[0].init.redirect, "error");
    assert.ok(h.calls.requests[0].init.signal);
  });
}

for (const content of ["", " \n\t"]) {
  test("empty content is rejected before upload", async () => {
    const h = harness();
    await assert.rejects(h.load("src/api.ts").createPaste(content), /empty/);
    assert.equal(h.calls.requests.length, 0);
  });
}
for (const language of ["ts", "swift", "../rs", "rs?x=1", "rs#fragment", "https://example.com", "__proto__"]) {
  test(`unsupported language ${language} is rejected before upload`, async () => {
    const h = harness();
    await assert.rejects(h.load("src/api.ts").createPaste("synthetic", language), /Unsupported/);
    assert.equal(h.calls.requests.length, 0);
  });
}
for (const body of [
  "",
  "Fixture123",
  "https://example.com/AbC",
  "http://paste.rs/AbC",
  "https://user@paste.rs/AbC",
  "https://paste.rs/AbC?secret=1",
  "https://paste.rs/AbC#fragment",
  "https://paste.rs/a/b",
  "https://paste.rs/%2e%2e/AbC",
  "https://paste.rs/AbC.rs",
  "https://paste.rs/",
]) {
  test(`malformed service URL is never copied: ${body}`, async () => {
    const h = harness({ content: "synthetic", body, language: "rs" });
    await h.load("src/paste-selected-text.ts").default();
    assert.equal(h.calls.copies.length, 0);
    assert.equal(h.calls.history.length, 0);
    assert.match(h.calls.toasts.at(-1).message, /invalid paste URL/);
  });
}

for (const status of [200, 400, 429, 500]) {
  test(`HTTP ${status} preserves clipboard and history`, async () => {
    const h = harness({ content: "synthetic", status, body: "Synthetic service error" });
    await h.load("src/paste-selected-text.ts").default();
    assert.equal(h.calls.copies.length, 0);
    assert.equal(h.calls.history.length, 0);
    assert.equal(h.calls.toasts.at(-1).message, "Synthetic service error");
  });
}

test("network and abort errors propagate without inventing a URL", async () => {
  const h = harness({ networkError: new Error("Synthetic offline") });
  await assert.rejects(h.load("src/api.ts").createPaste("synthetic", "rs"), /offline/);
  await assert.rejects(harness().load("src/api.ts").createPaste("synthetic", "rs", AbortSignal.abort()), /abort/i);
});

for (const command of ["paste-selected-text", "paste-clipboard"]) {
  for (const content of [undefined, "", " \n"]) {
    test(`${command} handles empty text without uploading`, async () => {
      const h = harness({ content });
      await h.load(`src/${command}.ts`).default();
      assert.equal(h.calls.requests.length, 0);
      assert.equal(h.calls.confirmations.length, 0);
      assert.equal(h.calls.toasts[0].style, "failure");
    });
  }
  test(`${command} handles unavailable text without uploading`, async () => {
    const h = harness({ readError: new Error("Synthetic selection unavailable") });
    await h.load(`src/${command}.ts`).default();
    assert.equal(h.calls.requests.length, 0);
    assert.match(h.calls.toasts[0].message, /unavailable/);
  });
  test(`${command} copies and saves the same highlighted URL`, async () => {
    const h = harness({ content: "  synthetic\n", language: "rs" });
    await h.load(`src/${command}.ts`).default();
    assert.deepEqual(h.calls.copies, ["https://paste.rs/Fixture123.rs"]);
    assert.equal(h.calls.history[0].url, h.calls.copies[0]);
    assert.equal(h.calls.history[0].content, "  synthetic\n");
    assert.deepEqual(h.calls.hud, ["Paste URL copied"]);
  });
}

test("selected-text cancellation leaves clipboard/history untouched and does not upload", async () => {
  const h = harness({ content: "synthetic", confirmed: false });
  await h.load("src/paste-selected-text.ts").default();
  assert.equal(h.calls.requests.length, 0);
  assert.equal(h.calls.copies.length, 0);
  assert.equal(h.calls.history.length, 0);
  assert.equal(h.calls.toasts.length, 0);
  assert.match(h.calls.confirmations[0].message, /public paste/);
});

test("partial uploads copy the highlighted URL and warn", async () => {
  const h = harness({ content: "synthetic", language: "rs", status: 206 });
  await h.load("src/paste-selected-text.ts").default();
  assert.equal(h.calls.history[0].partial, true);
  assert.equal(h.calls.history[0].url, "https://paste.rs/Fixture123.rs");
  assert.deepEqual(h.calls.hud, ["Paste partially uploaded, URL copied"]);
});

test("clipboard copy failure preserves upload history and surfaces the URL without claiming it was copied", async () => {
  const h = harness({ content: "synthetic", language: "rs", copyError: true });
  await h.load("src/paste-selected-text.ts").default();
  assert.equal(h.calls.history.length, 1);
  assert.equal(h.calls.history[0].url, "https://paste.rs/Fixture123.rs");
  assert.equal(h.calls.history[0].content, "synthetic");
  assert.equal(h.calls.copies.length, 0);
  assert.equal(h.calls.hud.length, 0);
  assert.match(h.calls.toasts.at(-1).message, /could not be copied: https:\/\/paste.rs\/Fixture123.rs/);
});

test("history failure reports that the URL was copied", async () => {
  const h = harness({ content: "synthetic", language: "rs", historyError: true });
  await h.load("src/paste-selected-text.ts").default();
  assert.equal(h.calls.copies[0], "https://paste.rs/Fixture123.rs");
  assert.match(h.calls.toasts.at(-1).title, /URL copied; history unavailable/);
  assert.equal(h.calls.toasts.at(-1).message, h.calls.copies[0]);
});

test("form starts from default language and honors explicit plain-text override", async () => {
  const h = harness({ language: "rs" });
  h.load("src/create-paste.tsx").default();
  assert.equal(h.calls.form.initialValues.language, "rs");
  await h.calls.form.onSubmit({ content: "synthetic", language: "" });
  assert.equal(h.calls.copies[0], "https://paste.rs/Fixture123");
  assert.equal(h.calls.pops, 1);
});

test("form preserves a partial upload for review and copies its highlighted URL", async () => {
  const h = harness({ status: 206 });
  h.load("src/create-paste.tsx").default();
  await h.calls.form.onSubmit({ content: "synthetic", language: "rs" });
  assert.equal(h.calls.copies[0], "https://paste.rs/Fixture123.rs");
  assert.equal(h.calls.pops, 0);
  assert.match(h.calls.toasts[0].message, /Partial URL copied/);
});

test("AI tool returns, copies, and saves the default-language URL", async () => {
  const h = harness({ language: "rs" });
  const result = await h.load("src/tools/create-paste.ts").default({ content: "synthetic" });
  assert.equal(result.url, "https://paste.rs/Fixture123.rs");
  assert.equal(result.url, h.calls.copies[0]);
  assert.equal(result.url, h.calls.history[0].url);
});

test("plain and highlighted IDs identify the same paste for deletion", async () => {
  const h = harness();
  const api = h.load("src/api.ts");
  for (const input of [
    "Fixture123",
    "Fixture123.rs",
    "https://paste.rs/Fixture123",
    "https://paste.rs/Fixture123.rs",
  ]) {
    assert.equal(api.getPasteId(input), "Fixture123");
    await api.deletePaste(input);
    assert.equal(h.calls.requests.at(-1).url, "https://paste.rs/Fixture123");
    assert.equal(h.calls.requests.at(-1).init.method, "DELETE");
  }
});
for (const input of [
  "",
  "../AbC",
  "https://example.com/AbC",
  "http://paste.rs/AbC",
  "https://paste.rs/../AbC",
  "https://paste.rs/AbC?x=1",
  "https://user@paste.rs/AbC",
  "https://paste.rs/AbC%2Frs",
  "AbC?x=1",
  "AbC#fragment",
]) {
  test(`unsafe delete input never sends a request: ${input}`, async () => {
    const h = harness();
    await assert.rejects(h.load("src/api.ts").deletePaste(input));
    assert.equal(h.calls.requests.length, 0);
  });
}

for (const status of [404, 410]) {
  test(`missing paste (${status}) is already deleted`, async () => {
    const h = harness({ status });
    await h.load("src/api.ts").deletePaste("Fixture123.rs");
    assert.equal(h.calls.requests[0].url, "https://paste.rs/Fixture123");
  });
}

test("form and AI tool surface local history failure after copying", async () => {
  const h = harness({ historyError: true, language: "rs" });
  h.load("src/create-paste.tsx").default();
  await h.calls.form.onSubmit({ content: "synthetic", language: "rs" });
  assert.match(h.calls.toasts[0].message, /Local history could not be saved/);
  assert.equal(h.calls.pops, 0);
  const result = await h.load("src/tools/create-paste.ts").default({ content: "synthetic" });
  assert.equal(result.url, h.calls.copies[1]);
  assert.match(result.message, /Local history could not be saved/);
});

for (const status of [201, 206]) {
  test(`AI copy failure preserves the uploaded URL and partial status (${status})`, async () => {
    const h = harness({ language: "rs", copyError: true, status });
    await assert.rejects(
      h.load("src/tools/create-paste.ts").default({ content: "  synthetic AI fixture\n" }),
      /could not be copied: https:\/\/paste.rs\/Fixture123.rs/,
    );
    assert.equal(h.calls.requests.length, 1);
    assert.equal(h.calls.copies.length, 0);
    assert.equal(h.calls.historyAttempts, 1);
    assert.equal(h.calls.history[0].url, "https://paste.rs/Fixture123.rs");
    assert.equal(h.calls.history[0].content, "  synthetic AI fixture\n");
    assert.equal(h.calls.history[0].partial, status === 206);
  });
}

test("AI simultaneous copy and history failures report the URL and both failures", async () => {
  const h = harness({ language: "rs", copyError: true, historyError: true });
  await assert.rejects(
    h.load("src/tools/create-paste.ts").default({ content: "synthetic" }),
    /could not be copied: https:\/\/paste.rs\/Fixture123.rs Local history could not be saved/,
  );
  assert.equal(h.calls.historyAttempts, 1);
  assert.equal(h.calls.history.length, 0);
  assert.equal(h.calls.requests.length, 1);
  assert.equal(h.calls.copies.length, 0);
});

test("form copy failure preserves history and leaves the form open", async () => {
  const h = harness({ copyError: true });
  h.load("src/create-paste.tsx").default();
  await h.calls.form.onSubmit({ content: "synthetic", language: "rs" });
  assert.equal(h.calls.history[0].url, "https://paste.rs/Fixture123.rs");
  assert.equal(h.calls.pops, 0);
  assert.equal(h.calls.toasts[0].style, "failure");
  assert.match(h.calls.toasts[0].message, /could not be copied/);
});
