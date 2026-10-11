import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../src/", import.meta.url));

// Load the real tools and socket client, replacing only Raycast and the daemon connection.
function harness(response) {
  const requests = [];
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
    }).outputText;
    function localRequire(id) {
      if (id === "@raycast/api") return { getPreferenceValues: () => ({}) };
      if (id === "node:net") {
        return {
          connect() {
            const socket = new EventEmitter();
            socket.setEncoding = () => {};
            socket.destroy = () => {};
            socket.write = (data) => {
              requests.push(JSON.parse(data));
              queueMicrotask(() => socket.emit("data", JSON.stringify(response) + "\n"));
            };
            queueMicrotask(() => socket.emit("connect"));
            return socket;
          },
        };
      }
      return id.startsWith(".") ? load(resolve(dirname(path), id + ".ts")) : require(id);
    }
    new Function("require", "module", "exports", source)(localRequire, module, module.exports);
    return module.exports;
  }
  return {
    requests,
    searchFiles: load(resolve(root, "tools/search-files.ts")).default,
    searchContents: load(resolve(root, "tools/search-file-contents.ts")).default,
    client: load(resolve(root, "lib/fsearch.ts")),
  };
}

test("filename filters retain paths with spaces and return cloneable metadata", async () => {
  const h = harness({
    ok: true,
    hits: [{ path: "/Users/example/My Documents/invoice.pdf", kind: "file", size: 42, mtime: 1, score: 100 }],
    took_us: 10,
  });
  const result = await h.searchFiles({
    query: " invoice ",
    folder: "~/My Documents",
    kind: "file",
    extension: "pdf",
    size: ">5mb",
    modified: "<7d",
    limit: 7,
  });
  assert.deepEqual(h.requests, [
    { q: "invoice", kind: "file", in: "~/My Documents", ext: "pdf", size: ">5mb", mtime: "<7d", limit: 7 },
  ]);
  assert.deepEqual(structuredClone(result), {
    results: [
      {
        path: "/Users/example/My Documents/invoice.pdf",
        kind: "file",
        sizeBytes: 42,
        modified: "1970-01-01T00:00:01.000Z",
      },
    ],
    limit: 7,
  });
});

test("folder and application searches retain the command's kind mappings", async () => {
  const h = harness({ ok: true, hits: [], took_us: 0 });
  await h.searchFiles({ kind: "folder" });
  await h.searchFiles({ query: "Safari", kind: "app" });
  assert.deepEqual(h.requests, [
    { q: "", kind: "dir", limit: 30 },
    { q: "Safari", ext: "app", limit: 30 },
  ]);
});

test("literal content is kept separate from filename filters, with partial results preserved", async () => {
  const files = [{ path: "/Users/example/My Project/main.ts", matches: [{ line: 12, text: "ext:pdf  in:docs" }] }];
  const h = harness({ ok: true, files, complete: false, indexing: 4, took_us: 250000 });
  const result = await h.searchContents({
    pattern: "ext:pdf  in:docs",
    folder: "~/My Project",
    extension: "ts,tsx",
    fileQuery: "main mtime:<7d",
  });
  assert.deepEqual(h.requests, [
    {
      op: "grep",
      pattern: "ext:pdf  in:docs",
      q: "main mtime:<7d",
      mode: "literal",
      in: "~/My Project",
      ext: "ts,tsx",
      limit: 20,
      per_file: 5,
    },
  ]);
  assert.deepEqual(structuredClone(result), { files, complete: false, indexing: true, limit: 20, matchesPerFile: 5 });
});

test("regex and symbol modes reach the daemon unchanged", async () => {
  const h = harness({ ok: true, files: [], complete: true, indexing: 0, took_us: 0 });
  await h.searchContents({ pattern: "TODO|FIXME", mode: "regex", limit: 3 });
  await h.searchContents({ pattern: "parseResponse", mode: "symbol" });
  assert.equal(h.requests[0].mode, "regex");
  assert.equal(h.requests[0].pattern, "TODO|FIXME");
  assert.equal(h.requests[0].limit, 3);
  assert.equal(h.requests[1].mode, "symbol");
  assert.equal(h.requests[1].pattern, "parseResponse");
});

test("invalid limits and blank content patterns fail before a daemon request", async () => {
  const h = harness({ ok: true });
  for (const limit of [0, -1, 101, 1.5, NaN, Infinity]) {
    await assert.rejects(h.searchFiles({ query: "a", limit }), /integer from 1 to 100/);
    await assert.rejects(h.searchContents({ pattern: "a", limit }), /integer from 1 to 100/);
  }
  await assert.rejects(h.searchContents({ pattern: "  " }), /non-empty/);
  assert.equal(h.requests.length, 0);
});

test("the existing content command keeps its request defaults", async () => {
  const h = harness({ ok: true, files: [], complete: true, took_us: 5 });
  const result = await h.client.grep("hello", "ext:md", "literal");
  assert.deepEqual(h.requests, [
    { op: "grep", pattern: "hello", q: "ext:md", mode: "literal", limit: 100, per_file: 10 },
  ]);
  assert.equal(result.indexing, false);
  assert.equal(result.tookMicros, 5);
});

test("a complete scan can still report a building content index", async () => {
  const h = harness({ ok: true, files: [], complete: true, indexing: true, took_us: 0 });
  const result = await h.searchContents({ pattern: "TODO" });
  assert.equal(result.complete, true);
  assert.equal(result.indexing, true);
});

test("daemon errors are propagated instead of becoming empty results", async () => {
  for (const message of ["indexing files", "invalid regular expression"]) {
    const h = harness({ ok: false, error: message });
    await assert.rejects(h.searchContents({ pattern: "[", mode: "regex" }), { message });
  }
});
