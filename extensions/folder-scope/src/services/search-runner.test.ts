import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type {
  SearchCompletion,
  SearchEngine,
  SearchError,
  SearchOptions,
  SearchRequest,
  SearchResult,
} from "../types/search.ts";
import { MAX_PREVIEW_LENGTH, SearchRunner, type SearchState } from "./search-runner.ts";

const DEBOUNCE_MS = 20;

const OPTIONS: SearchOptions = {
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
  maxResults: 3,
  maxFileSizeBytes: 1024 * 1024,
  contextBefore: 0,
  contextAfter: 0,
};

const DIRECTORY = "/tmp/Arama Klasörü";

function result(line: number, lineText = "ara"): SearchResult {
  return {
    filePath: `${DIRECTORY}/a.txt`,
    relativePath: "a.txt",
    fileName: "a.txt",
    line,
    column: 1,
    lineText,
  };
}

function engine(run: (request: SearchRequest) => Promise<SearchCompletion>): SearchEngine {
  return { type: "node-fallback", search: run };
}

function track() {
  const states: SearchState[] = [];
  return { states, onState: (state: SearchState) => states.push(state), last: () => states[states.length - 1] };
}

/** Long enough for the debounce, the engine and the batch flush interval. */
function settle() {
  return delay(DEBOUNCE_MS + 200);
}

test("an empty query never starts a search", async () => {
  const { onState, last } = track();
  let calls = 0;
  const runner = new SearchRunner(
    [
      engine(() => {
        calls++;
        return Promise.resolve({ limitReached: false, cancelled: false });
      }),
    ],
    DEBOUNCE_MS,
    onState,
  );
  runner.search("   ", DIRECTORY, OPTIONS);
  runner.search("ara", null, OPTIONS);
  await settle();
  assert.equal(calls, 0);
  assert.equal(last().status, "idle");
  runner.dispose();
});

test("rapid consecutive queries debounce down to the last one", async () => {
  const queries: string[] = [];
  const { onState, last } = track();
  const runner = new SearchRunner(
    [
      engine((request) => {
        queries.push(request.query);
        request.onResults([result(1)]);
        return Promise.resolve({ limitReached: false, cancelled: false });
      }),
    ],
    DEBOUNCE_MS,
    onState,
  );
  runner.search("a", DIRECTORY, OPTIONS);
  runner.search("ar", DIRECTORY, OPTIONS);
  runner.search("ara", DIRECTORY, OPTIONS);
  await settle();
  assert.deepEqual(queries, ["ara"]);
  assert.equal(last().status, "done");
  assert.equal(last().results.length, 1);
  runner.dispose();
});

test("results and completion of a superseded search are ignored", async () => {
  const { onState, last } = track();
  const runner = new SearchRunner(
    [
      engine(async (request) => {
        if (request.query === "slow") {
          await delay(120);
          request.onResults([result(99)]); // late emission from the cancelled search
          return { limitReached: true, cancelled: false };
        }
        request.onResults([result(1)]);
        return { limitReached: false, cancelled: false };
      }),
    ],
    DEBOUNCE_MS,
    onState,
  );
  runner.search("slow", DIRECTORY, OPTIONS);
  await delay(DEBOUNCE_MS + 20); // let the slow search start
  runner.search("fast", DIRECTORY, OPTIONS);
  await settle();
  assert.deepEqual(
    last().results.map((item) => item.line),
    [1],
  );
  assert.equal(last().limitReached, false);
  assert.equal(last().status, "done");
  runner.dispose();
});

test("a new search aborts the running one", async () => {
  const signals: AbortSignal[] = [];
  const { onState } = track();
  const runner = new SearchRunner(
    [
      engine(async (request) => {
        signals.push(request.signal);
        await delay(200);
        return { limitReached: false, cancelled: true };
      }),
    ],
    DEBOUNCE_MS,
    onState,
  );
  runner.search("ara", DIRECTORY, OPTIONS);
  await delay(DEBOUNCE_MS + 20);
  runner.search("bul", DIRECTORY, OPTIONS);
  assert.equal(signals[0].aborted, true);
  await delay(DEBOUNCE_MS + 20);
  runner.dispose();
  assert.equal(signals[1].aborted, true, "dispose aborts the in-flight search too");
});

test("state stays bounded by maxResults and long previews are truncated", async () => {
  const { onState, last, states } = track();
  const long = "ı".repeat(MAX_PREVIEW_LENGTH + 50);
  const runner = new SearchRunner(
    [
      engine((request) => {
        request.onResults([result(1, long), result(2), result(3), result(4), result(5)]);
        return Promise.resolve({ limitReached: true, cancelled: false });
      }),
    ],
    DEBOUNCE_MS,
    onState,
  );
  runner.search("ara", DIRECTORY, OPTIONS);
  await settle();
  assert.equal(last().results.length, OPTIONS.maxResults);
  assert.equal(last().limitReached, true);
  assert.equal(last().results[0].lineText.length, MAX_PREVIEW_LENGTH + 1);
  assert.ok(states.length < 6, "results are batched, not pushed one rerender per result");
  runner.dispose();
});

test("engine failure surfaces as an error state and refresh reruns the query", async () => {
  const { onState, last } = track();
  let attempt = 0;
  const runner = new SearchRunner(
    [
      engine(() => {
        attempt++;
        return attempt === 1
          ? Promise.reject({ kind: "engine-startup-failed", message: "rg missing" } satisfies SearchError)
          : Promise.resolve({ limitReached: false, cancelled: false });
      }),
    ],
    DEBOUNCE_MS,
    onState,
  );
  runner.search("ara", DIRECTORY, OPTIONS);
  await settle();
  assert.equal(last().status, "error");
  assert.equal(last().error?.kind, "engine-startup-failed");

  runner.refresh();
  await settle();
  assert.equal(attempt, 2);
  assert.equal(last().status, "done");
  assert.equal(last().error, null);
  runner.dispose();
});
