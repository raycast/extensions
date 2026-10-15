import assert from "node:assert/strict";
import { test } from "node:test";
import type { Status } from "../engine/api";
import { searchRevision } from "../src/lib/search-refresh";
import { setupActionTitle } from "../src/lib/copy";

const base = {
  apiVersion: 1,
  pid: 1,
  activity: { state: "idle" },
  held: null,
  lastError: null,
  setup: { state: "ready" },
  encoder: "ready",
  folders: ["/photos"],
  codeFolders: [],
  main: {
    byKind: {},
    unfinished: { files: 0, units: 0 },
    total: { files: 2, done: 0, partial: 0, pending: 2, skipped: 0, failed: 0 },
    vectors: 0,
    segments: 0,
  },
  code: null,
} satisfies Status;
test("active query notices first image embedding and setup becoming ready", () => {
  assert.notEqual(
    searchRevision(base, false),
    searchRevision({ ...base, main: { ...base.main, vectors: 1, segments: 1 } }, false),
  );
  assert.notEqual(searchRevision(base, false), searchRevision({ ...base, encoder: "starting" }, false));
  assert.notEqual(searchRevision(base, false), searchRevision(null, false));
  assert.equal(searchRevision(base, false), searchRevision({ ...base, held: "paused" }, false));
  assert.notEqual(searchRevision(base, false), searchRevision({ ...base, folders: ["/documents"] }, false));
});
test("setup actions name only what is missing and offer retry", () => {
  assert.equal(setupActionTitle({ state: "missing", missing: ["llama"] }), "Download Search Engine");
  assert.equal(setupActionTitle({ state: "missing", missing: ["model-media"] }), "Download Search Model");
  assert.equal(setupActionTitle({ state: "failed", error: "offline" }), "Retry Setup");
});
