import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type {
  SearchCompletion,
  SearchEngine,
  SearchEngineType,
  SearchError,
  SearchOptions,
  SearchRequest,
  SearchResult,
} from "../types/search.ts";
import { FallbackEngine } from "./fallback-engine.ts";
import { engineChain, searchWithFallback } from "./search-engine-resolver.ts";

const BASE_OPTIONS: SearchOptions = {
  caseMode: "smart",
  searchMode: "text",
  wholeWord: false,
  multiline: false,
  invertMatch: false,
  maxDepth: null,
  includeHidden: false,
  followSymlinks: false,
  respectIgnoreFiles: true,
  includeBinary: false,
  searchFileNames: false,
  includedExtensions: [],
  excludedExtensions: [],
  excludedDirectories: [],
  includeGlobs: [],
  excludeGlobs: [],
  maxResults: 250,
  maxFileSizeBytes: 1024 * 1024,
  contextBefore: 0,
  contextAfter: 0,
};

function makeRequest(
  onResults: (batch: SearchResult[]) => void,
  signal: AbortSignal = new AbortController().signal,
): SearchRequest {
  return { query: "ara", directory: "/tmp/Arama Klasörü", options: BASE_OPTIONS, signal, onResults };
}

function fakeEngine(type: SearchEngineType, run: (request: SearchRequest) => Promise<SearchCompletion>): SearchEngine {
  return { type, search: run };
}

function failing(type: SearchEngineType, kind: SearchError["kind"]): SearchEngine {
  return fakeEngine(type, () => Promise.reject({ kind, message: `${type} ${kind}` } satisfies SearchError));
}

function result(line: number): SearchResult {
  return {
    filePath: "/tmp/Arama Klasörü/a.txt",
    relativePath: "a.txt",
    fileName: "a.txt",
    line,
    column: 1,
    lineText: "ara",
  };
}

function succeeding(type: SearchEngineType, results: SearchResult[] = []): SearchEngine {
  return fakeEngine(type, (request) => {
    if (results.length > 0) request.onResults(results);
    return Promise.resolve({ limitReached: false, cancelled: false });
  });
}

test("engine chain follows the documented order per preference", () => {
  assert.deepEqual(engineChain("automatic"), ["bundled-ripgrep", "system-ripgrep", "node-fallback"]);
  assert.deepEqual(engineChain("bundled"), ["bundled-ripgrep", "system-ripgrep", "node-fallback"]);
  assert.deepEqual(engineChain("system"), ["system-ripgrep", "node-fallback"]);
  assert.deepEqual(engineChain("node"), ["node-fallback"]);
});

test("falls back on unavailable and startup-failed engines and reports failures", async () => {
  const emitted: SearchResult[] = [];
  const completion = await searchWithFallback(
    makeRequest((batch) => emitted.push(...batch)),
    [
      failing("bundled-ripgrep", "engine-unavailable"),
      failing("system-ripgrep", "engine-startup-failed"),
      succeeding("node-fallback", [result(1)]),
    ],
  );
  assert.equal(completion.engine, "node-fallback");
  assert.deepEqual(
    completion.failures.map((failure) => failure.engine),
    ["bundled-ripgrep", "system-ripgrep"],
  );
  assert.equal(emitted.length, 1);
});

test("falls back on a crash only when nothing was emitted", async () => {
  const emitted: SearchResult[] = [];
  const completion = await searchWithFallback(
    makeRequest((batch) => emitted.push(...batch)),
    [failing("bundled-ripgrep", "engine-crashed"), succeeding("system-ripgrep", [result(1)])],
  );
  assert.equal(completion.engine, "system-ripgrep");
  assert.equal(emitted.length, 1);
});

test("propagates a mid-search crash after results were emitted without trying the next engine", async () => {
  const emitted: SearchResult[] = [];
  let nextEngineCalled = false;
  const crashing = fakeEngine("bundled-ripgrep", (request) => {
    request.onResults([result(1)]);
    return Promise.reject({ kind: "engine-crashed", message: "died mid-search" } satisfies SearchError);
  });
  const next = fakeEngine("system-ripgrep", () => {
    nextEngineCalled = true;
    return Promise.resolve({ limitReached: false, cancelled: false });
  });
  await assert.rejects(
    () =>
      searchWithFallback(
        makeRequest((batch) => emitted.push(...batch)),
        [crashing, next],
      ),
    (error: unknown) => (error as SearchError).kind === "engine-crashed",
  );
  assert.equal(nextEngineCalled, false);
  assert.equal(emitted.length, 1, "partial output before the crash stays valid");
});

test("never falls back on invalid-query or directory-inaccessible", async () => {
  for (const kind of ["invalid-query", "directory-inaccessible"] as const) {
    let nextEngineCalled = false;
    const next = fakeEngine("node-fallback", () => {
      nextEngineCalled = true;
      return Promise.resolve({ limitReached: false, cancelled: false });
    });
    await assert.rejects(
      () =>
        searchWithFallback(
          makeRequest(() => {}),
          [failing("bundled-ripgrep", kind), next],
        ),
      (error: unknown) => (error as SearchError).kind === kind,
    );
    assert.equal(nextEngineCalled, false);
  }
});

test("suppresses late emissions from a failed engine", async () => {
  const emitted: SearchResult[] = [];
  let leakedEmit: ((batch: SearchResult[]) => void) | undefined;
  const leaky = fakeEngine("bundled-ripgrep", (request) => {
    leakedEmit = request.onResults;
    return Promise.reject({ kind: "engine-unavailable", message: "gone" } satisfies SearchError);
  });
  const completion = await searchWithFallback(
    makeRequest((batch) => emitted.push(...batch)),
    [leaky, succeeding("system-ripgrep", [result(1)])],
  );
  leakedEmit?.([result(99)]);
  assert.equal(completion.engine, "system-ripgrep");
  assert.deepEqual(
    emitted.map((item) => item.line),
    [1],
    "the failed engine's late batch must not reach the caller",
  );
});

test("throws the last error when every engine fails", async () => {
  await assert.rejects(
    () =>
      searchWithFallback(
        makeRequest(() => {}),
        [
          failing("bundled-ripgrep", "engine-unavailable"),
          failing("system-ripgrep", "engine-unavailable"),
          failing("node-fallback", "unexpected"),
        ],
      ),
    (error: unknown) => (error as SearchError).kind === "unexpected",
  );
});

test("returns cancelled without trying further engines when the signal aborts", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  const engine = fakeEngine("bundled-ripgrep", () => {
    called = true;
    return Promise.resolve({ limitReached: false, cancelled: false });
  });
  const completion = await searchWithFallback(
    makeRequest(() => {}, controller.signal),
    [engine],
  );
  assert.equal(completion.cancelled, true);
  assert.equal(called, false);
});

test("a cancelled completion is returned as-is and does not trigger fallback", async () => {
  let nextEngineCalled = false;
  const cancelled = fakeEngine("bundled-ripgrep", () => Promise.resolve({ limitReached: false, cancelled: true }));
  const next = fakeEngine("system-ripgrep", () => {
    nextEngineCalled = true;
    return Promise.resolve({ limitReached: false, cancelled: false });
  });
  const completion = await searchWithFallback(
    makeRequest(() => {}),
    [cancelled, next],
  );
  assert.equal(completion.cancelled, true);
  assert.equal(completion.engine, "bundled-ripgrep");
  assert.equal(nextEngineCalled, false);
});

test("end-to-end: unavailable ripgrep engines fall back to the real Node.js engine", async () => {
  const root = await mkdtemp(join(tmpdir(), "folder-scope-resolver-"));
  try {
    await writeFile(join(root, "ölçüm.txt"), "burada ara bul\n");
    const emitted: SearchResult[] = [];
    const request: SearchRequest = {
      query: "ara",
      directory: root,
      options: BASE_OPTIONS,
      signal: new AbortController().signal,
      onResults: (batch) => emitted.push(...batch),
    };
    const completion = await searchWithFallback(request, [
      failing("bundled-ripgrep", "engine-unavailable"),
      failing("system-ripgrep", "engine-unavailable"),
      new FallbackEngine(),
    ]);
    assert.equal(completion.engine, "node-fallback");
    assert.equal(completion.failures.length, 2);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].relativePath, "ölçüm.txt");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
