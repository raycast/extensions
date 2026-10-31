import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * Static regression guard: these commands must not start file-tree scans.
 * These tests cannot prove runtime behavior, so Mac UI acceptance remains
 * separate, but they catch accidental reintroduction of automatic refresh.
 */
async function source(file) {
  return readFile(new URL("../src/" + file, import.meta.url), "utf8");
}

test("Search Files and Index Status never invoke fd or rebuildIndex", async () => {
  for (const file of ["search-files.tsx", "index-status.tsx"]) {
    const code = await source(file);
    assert.doesNotMatch(code, /\brebuildIndex\s*\(/);
    assert.doesNotMatch(code, /\brefreshExpiredIndex\b/);
    assert.doesNotMatch(code, /\bfindBinary\s*\(\s*["']fd["']/);
    assert.doesNotMatch(code, /\bspawn\s*\(/);
  }
});

test("the core index store never schedules or launches an automatic rebuild", async () => {
  const code = await source("lib/index-store.ts");
  assert.doesNotMatch(code, /\brefreshExpiredIndex\b/);
  assert.doesNotMatch(code, /\bAUTO_REBUILD_DAYS\b/);
  assert.doesNotMatch(code, /\bsetInterval\s*\(/);
  assert.doesNotMatch(code, /\bsetTimeout\s*\(/);
});

test("rebuild paths are selected lazily so explicit choices skip corrupt index reads", async () => {
  const code = await source("lib/index-store.ts");
  assert.match(code, /selectRebuildRoots\(selectedRoots, async \(\) =>/);
  assert.doesNotMatch(code, /const previous = await readIndex\(\)/);
});

test("preferences use the Raycast-generated type", async () => {
  const store = await source("lib/index-store.ts");
  const trace = await source("lib/command-trace.ts");
  assert.match(store, /getPreferenceValues<Preferences>\(\)/);
  assert.match(trace, /getPreferenceValues<Preferences>\(\)/);
  assert.doesNotMatch(store, /export type Preferences =/);
  assert.doesNotMatch(trace, /type TracePreferences =/);
});

test("Rebuild Index starts only on explicit form submit or Action", async () => {
  const code = await source("rebuild-index.tsx");
  assert.match(code, /<Form\.FilePicker/);
  assert.match(code, /canChooseDirectories/);
  assert.match(code, /canChooseFiles=\{false\}/);
  assert.match(code, /<Action\.SubmitForm/);
  assert.match(code, /title="Change Indexed Folders"/);
  assert.match(code, /title="Rebuild Index Now"/);
  assert.match(code, /onAction=\{\(\) => void buildIndex\(roots\)\}/);
  const initialization = code.slice(0, code.indexOf("async function buildIndex("));
  assert.doesNotMatch(initialization, /\brebuildIndex\s*\(/);
});
