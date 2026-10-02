import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
const compiled = new Map();
const gif = {
  id: "one",
  title: "Test GIF",
  download_name: "test.gif",
  slug: "test",
  download_url: "https://example.test/one.gif",
  gif_url: "https://example.test/one.gif",
  url: "https://giphy.com/gifs/one",
  small_preview_gif_url: "https://example.test/one.gif",
};

// Execute the real resolver, cache, preferences, storage and action callbacks. Only their
// host boundaries are mocked; no Raycast runtime, disk writes or provider access is required.
function harness(shared = {}) {
  const files = shared.files ?? new Map();
  const storage = shared.storage ?? new Map();
  const prefs = { defaultAction: "pasteFile", hideFilename: false, ...shared.prefs };
  const events = [];
  const failures = [];
  const toasts = [];
  const state = { downloadError: false, pasteError: false, copyError: false, omitTempFile: false, temp: 0 };
  const modules = new Map();
  const missing = (file) => Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
  const fs = {
    constants: { R_OK: 4 },
    existsSync: (file) => files.has(file) || file === "/support/cached-gifs",
    mkdirSync() {},
    accessSync(file) {
      if (state.evictOnRead && file.startsWith("/support/cached-gifs/")) files.delete(file);
      if (!files.has(file)) throw missing(file);
    },
    statSync(file, options) {
      if (!files.has(file)) {
        if (options?.throwIfNoEntry === false) return undefined;
        throw missing(file);
      }
      return { isFile: () => true };
    },
    readdirSync(dir) {
      return [...files.keys()].filter((file) => path.dirname(file) === dir).map((file) => path.basename(file));
    },
    copyFileSync(from, to) {
      if (state.stageError && to.startsWith("/tmp/")) throw new Error("ENOSPC");
      if (!files.has(from)) throw missing(from);
      files.set(to, files.get(from));
    },
  };
  const clipboard = async (operation, { file }) => {
    events.push([operation, file]);
    assert.ok(path.isAbsolute(file), "clipboard path must be absolute");
    assert.ok(files.has(file), "clipboard file must exist");
    if (state[`${operation}Error`]) throw new Error(`${operation} rejected`);
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const api = {
    environment: { supportPath: "/support" },
    getPreferenceValues: () => ({ ...prefs }),
    Clipboard: { copy: (content) => clipboard("copy", content), paste: (content) => clipboard("paste", content) },
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => {
        events.push(["storage", key]);
        storage.set(key, value);
      },
    },
    closeMainWindow: async () => events.push(["close"]),
    showToast: async (toast) => toasts.push(toast),
    Toast: { Style: { Animated: "animated", Success: "success" } },
    Action: Object.assign(() => {}, {
      CopyToClipboard: "CopyToClipboard",
      Paste: "Paste",
      Push: "Push",
      OpenInBrowser: "OpenInBrowser",
    }),
    ActionPanel: Object.assign(() => {}, { Section: "Section" }),
    Icon: {},
    Keyboard: { Shortcut: { Common: { Copy: {} } } },
  };
  const mocks = {
    fs,
    "fs/promises": {
      rm: async (file) => files.delete(file),
      unlink: async (file) => files.delete(file),
      readFile: async (file) => files.get(file),
      writeFile: async (file, bytes) => files.set(file, bytes),
    },
    child_process: {
      execFile(command, args, callback) {
        assert.equal(command, "/usr/bin/swift");
        files.set(args[2], Buffer.from("GIF89a-square"));
        callback(null, "", "");
      },
    },
    "@raycast/api": api,
    "@raycast/utils": {
      useCachedPromise: () => ({ data: [], revalidate() {} }),
      showFailureToast: async (error) => failures.push(error),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {},
    tempy: {
      file: ({ name }) => `/tmp/${++state.temp}/${name}`,
      write: async (bytes, { name = "input.gif" }) => {
        const file = `/tmp/${++state.temp}/${name}`;
        if (!state.omitTempFile) files.set(file, bytes);
        return file;
      },
    },
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (modules.has(filename)) return modules.get(filename);
    if (!compiled.has(filename)) {
      compiled.set(
        filename,
        ts.transpileModule(readFileSync(filename, "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2023,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
          },
        }).outputText,
      );
    }
    const exports = {};
    modules.set(filename, exports);
    runInNewContext(
      compiled.get(filename),
      {
        exports,
        Buffer,
        Error,
        process: { platform: shared.platform ?? "darwin" },
        console: { error() {} },
        fetch: async () => {
          events.push(["download"]);
          if (state.downloadError) throw new Error("offline");
          return {
            status: state.httpStatus ?? 200,
            ok: !state.httpStatus,
            body: state.emptyBody ? null : {},
            arrayBuffer: async () => Buffer.from("GIF89a"),
          };
        },
        require(name) {
          if (Object.hasOwn(mocks, name)) return mocks[name];
          if (["path", "crypto", "util"].includes(name)) return nativeRequire(name);
          if (name.endsWith("GifDetails")) return { GifDetails() {} };
          if (/downloadFile|stripQParams/.test(name)) return () => {};
          assert.ok(name.startsWith("."), `Unexpected import: ${name}`);
          const absolute = path.resolve(path.dirname(filename), name);
          return load(absolute + (existsSync(absolute + ".ts") ? ".ts" : ".tsx"));
        },
      },
      { filename },
    );
    return exports;
  }
  const cache = load("lib/cachedGifs.ts");
  const resolve = (item = gif) => load("lib/resolveGifFile.ts").default(item, "giphy");
  const seed = () => files.set(`/support/cached-gifs/${cache.getCacheKey(gif, "giphy")}`, Buffer.from("GIF89a"));
  function actions(options = {}) {
    const panel = load("components/GifActions.tsx").GifActions({
      item: gif,
      showViewDetails: false,
      mutate: async () => {},
      ...options,
    });
    return panel.props.children.flatMap((section) => section.props.children).filter(Boolean);
  }
  const run = (key) =>
    actions()
      .find((action) => action.key === key)
      .props.onAction();
  return { files, storage, prefs, events, failures, toasts, state, load, resolve, seed, actions, run };
}

for (const cached of [false, true]) {
  test(`${cached ? "cache hit" : "download"}: resolves an existing absolute path without clipboard effects`, async () => {
    const h = harness();
    if (cached) h.seed();
    const file = await h.resolve();
    assert.ok(path.isAbsolute(file));
    assert.ok(h.files.has(file));
    assert.equal(h.events.filter(([event]) => event === "download").length, cached ? 0 : 1);
    assert.equal(h.events.filter(([event]) => ["copy", "paste"].includes(event)).length, 0);
  });
  for (const operation of ["copy", "paste"]) {
    test(`${cached ? "cache hit #31144" : "fresh download #31004"}: ${operation} uses only its own clipboard operation`, async () => {
      const h = harness();
      if (cached) h.seed();
      await h.run(`${operation}File`);
      assert.equal(h.failures.length, 0);
      assert.deepEqual(
        h.events.filter(([event]) => ["copy", "paste"].includes(event)).map(([event]) => event),
        [operation],
      );
      const index = h.events.findIndex(([event]) => event === operation);
      assert.ok(h.events.findIndex(([event]) => event === "storage") > index);
      const close = h.events.findIndex(([event]) => event === "close");
      assert.ok(close === -1 || close > index, "clipboard operation must precede any explicit close");
    });
  }
}

test("missing cached file falls back to one download", async () => {
  const h = harness();
  h.seed();
  h.files.clear();
  await h.resolve();
  assert.equal(h.events.filter(([event]) => event === "download").length, 1);
});
test("favorite survives a command restart using persistent cache", async () => {
  const h = harness();
  h.storage.set("giphy-favs", '["one"]');
  await h.resolve();
  const restarted = harness(h);
  const file = await restarted.resolve();
  assert.ok(path.isAbsolute(file));
  assert.ok(restarted.files.has(file));
  assert.equal(restarted.events.filter(([event]) => event === "download").length, 0);
});
test("hide filename keeps a valid absolute file on download and cache hit", async () => {
  const h = harness({ prefs: { hideFilename: true } });
  h.storage.set("giphy-favs", '["one"]');
  for (let i = 0; i < 2; i++) {
    const file = await h.resolve();
    assert.equal(path.basename(file), "gif.gif");
    assert.ok(path.isAbsolute(file));
    assert.ok(h.files.has(file));
  }
});
for (const operation of ["copy", "paste"]) {
  test(`failed ${operation} never records usage or success`, async () => {
    const h = harness();
    h.state[`${operation}Error`] = true;
    await h.run(`${operation}File`);
    assert.equal(h.failures.length, 1);
    assert.equal(h.storage.has("giphy-recent"), false);
    assert.equal(
      h.toasts.some((toast) => toast.style === "success"),
      false,
    );
    assert.equal(
      h.events.some(([event]) => event === "close"),
      false,
    );
  });
  test(`failed download never calls clipboard for ${operation}`, async () => {
    const h = harness();
    h.state.downloadError = true;
    await h.run(`${operation}File`);
    assert.equal(h.failures.length, 1);
    assert.equal(
      h.events.some(([event]) => ["copy", "paste", "storage", "close"].includes(event)),
      false,
    );
  });
  test(`${operation} preference selects the primary Enter callback despite missing optional actions`, async () => {
    const h = harness({ prefs: { defaultAction: `${operation}File` } });
    const first = h.actions({ item: { ...gif, url: undefined } })[0];
    assert.equal(first.key, `${operation}File`);
    await first.props.onAction();
    assert.equal(h.events.filter(([event]) => ["copy", "paste"].includes(event)).at(-1)[0], operation);
  });
}
test("preference changes update the first action without reloading modules", () => {
  const h = harness({ prefs: { defaultAction: "copyFile" } });
  assert.equal(h.actions()[0].key, "copyFile");
  h.prefs.defaultAction = "pasteFile";
  assert.equal(h.actions()[0].key, "pasteFile");
});
test("repeated copy and paste keep one cache entry and one recent ID", async () => {
  const h = harness();
  h.storage.set("giphy-favs", '["one"]');
  for (let i = 0; i < 20; i++) await h.run(i % 2 ? "copyFile" : "pasteFile");
  assert.equal(h.files.size > 0, true);
  assert.equal([...h.files.keys()].filter((file) => file.startsWith("/support/cached-gifs/")).length, 1);
  assert.equal(h.events.filter(([event]) => event === "download").length, 1);
  assert.equal(h.storage.get("giphy-recent"), '["one"]');
  assert.equal(h.failures.length, 0);
});
test("resolver rejects a missing final file before clipboard operations", async () => {
  const h = harness();
  h.state.omitTempFile = true;
  await assert.rejects(h.resolve(), /file|GIF/i);
  assert.equal(
    h.events.some(([event]) => ["copy", "paste"].includes(event)),
    false,
  );
});

test("cache file disappearing between lookup and read downloads once", async () => {
  const h = harness();
  h.seed();
  h.state.evictOnRead = true;
  const file = await h.resolve();
  assert.ok(h.files.has(file));
  assert.equal(h.events.filter(([event]) => event === "download").length, 1);
});
test("staging failure is reported without another download", async () => {
  const h = harness();
  h.seed();
  h.state.stageError = true;
  await h.run("pasteFile");
  assert.match(h.failures[0].message, /ENOSPC/);
  assert.equal(
    h.events.some(([event]) => ["download", "copy", "paste"].includes(event)),
    false,
  );
});
for (const error of ["httpStatus", "emptyBody"]) {
  test(`${error}: no clipboard operation or successful usage`, async () => {
    const h = harness();
    h.state[error] = error === "httpStatus" ? 503 : true;
    await h.run("pasteFile");
    assert.equal(h.failures.length, 1);
    assert.equal(
      h.events.some(([event]) => ["copy", "paste", "storage"].includes(event)),
      false,
    );
  });
}
for (const operation of ["copy", "paste"]) {
  test(`square ${operation} does not call the other clipboard method`, async () => {
    const h = harness();
    await h.run(`${operation}SquareGif`);
    assert.equal(h.failures.length, 0);
    assert.deepEqual(
      h.events.filter(([event]) => ["copy", "paste"].includes(event)).map(([event]) => event),
      [operation],
    );
    assert.equal([...h.files.keys()].filter((file) => file.endsWith("/undefined")).length, 0);
  });
  test(`Windows ${operation} default works without optional square actions`, async () => {
    const h = harness({ platform: "win32", prefs: { defaultAction: `${operation}File` } });
    assert.equal(h.actions()[0].key, `${operation}File`);
    assert.equal(
      h.actions().some((action) => action.key === "pasteSquareGif"),
      false,
    );
  });
}
