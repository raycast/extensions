import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, utimesSync, renameSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { configurationFromPreferences, SearchService } from "../src/backend.ts";
import { IndexingInProgress, indexFolders, runJob, prepareLocalRanking } from "../src/jobs.ts";

const assets = fileURLToPath(new URL("../assets", import.meta.url));
const fake = fileURLToPath(new URL("fixtures/job.mjs", import.meta.url));
const config = configurationFromPreferences({}, assets, "/tmp/digup-job-tests");

test("job errors and invalid JSON are reported", async () => {
  await assert.rejects(runJob({ ...config, binary: fake }, ["fail"], () => {}), /Test job failed/);
  await assert.rejects(runJob({ ...config, binary: fake }, ["invalid"], () => {}), /JSON/);
  await assert.rejects(runJob({ ...config, binary: "/does-not-exist/digup" }, [], () => {}), /ENOENT/);
});

test("background jobs can be cancelled", async () => {
  const abort = new AbortController();
  const job = runJob({ ...config, binary: fake }, ["wait"], () => {}, abort.signal);
  setTimeout(() => abort.abort(), 100);
  await assert.rejects(job, /abort/i);
});

test("indexing locks can follow the worker rather than Raycast's shared backend", async () => {
  let owner = 0;
  await runJob({ ...config, binary: fake }, [], () => {}, undefined, (pid) => { owner = pid; });
  assert.ok(owner > 0);
  assert.notEqual(owner, process.pid);
});

test("a work budget asks the engine to save and stop, then reports a normal pause", async () => {
  const events: Record<string, unknown>[] = [];
  await runJob({ ...config, binary: fake }, ["cooperate"], (event) => events.push(event), undefined, undefined, 150);
  assert.deepEqual(events, [{ event: "done", saved: true }, { event: "paused" }]);
});

test("no folders means no indexing job", async () => {
  await assert.rejects(indexFolders(config, () => {}), /Choose search folders/);
});

test("an active indexing lock prevents duplicate jobs", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "digup-lock-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const local = configurationFromPreferences({ roots: [root] }, assets, root);
  mkdirSync(local.index, { recursive: true });
  writeFileSync(join(local.index, "indexing.lock"), String(process.pid));
  await assert.rejects(indexFolders(local, () => {}), IndexingInProgress);
});

test("scheduled indexing skips an active job and recovers an abandoned empty lock", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "digup-lock-recovery-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const local = { ...configurationFromPreferences({ roots: [root] }, assets, root), binary: fake };
  mkdirSync(local.index, { recursive: true });
  const lock = join(local.index, "indexing.lock");
  writeFileSync(lock, "");
  await assert.rejects(indexFolders(local, () => {}), IndexingInProgress);
  utimesSync(lock, new Date(0), new Date(0));
  const first = indexFolders(local, () => {});
  await assert.rejects(indexFolders(local, () => {}), IndexingInProgress);
  await first;
  assert.equal(existsSync(lock), false);
});

test("standalone engine downloads from cache, indexes, and recovers search without the app", { skip: !process.env.DIGUP_TEST_INDEX }, async (t) => {
  assert.equal(existsSync("/Applications/DigUp.app"), false, "the app must be absent for this acceptance test");
  const root = mkdtempSync(join(tmpdir(), "digup-standalone-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const docs = join(root, "docs"); const code = join(root, "code");
  mkdirSync(docs); mkdirSync(code);
  writeFileSync(join(docs, "Glass notes.md"), "A translucent glass surface refracts the background and creates soft reflections around its rounded edge.");
  writeFileSync(join(code, "retry.py"), 'def retry(operation):\n    """Retry a failed operation with exponential backoff."""\n    for attempt in range(3):\n        try:\n            return operation()\n        except Exception:\n            sleep(2 ** attempt)\n');
  const local = configurationFromPreferences({ roots: [docs], codeRoots: [code] }, assets, root);
  const search = new SearchService(local);
  t.after(() => search.close());
  assert.equal((await search.request({ op: "prewarm" })).encoder, "unavailable");
  const events: Record<string, unknown>[] = [];
  await indexFolders(local, (event) => events.push(event));
  assert.ok(events.some((event) => event.event === "done") && events.some((event) => event.event === "summary"));
  assert.equal(existsSync(join(local.index, "indexing.lock")), false);
  const result = await search.search("soft reflections on a translucent surface", "documents");
  assert.equal(result.meaning, true);
  assert.ok(result.hits.some((hit) => hit.path.endsWith("Glass notes.md")), JSON.stringify({ result, events }));
  const foundCode = await search.search("code: retry failed operation", "code");
  assert.ok(foundCode.hits.some((hit) => hit.path.endsWith("retry.py")));

  renameSync(join(docs, "Glass notes.md"), join(docs, "Glass renamed.md"));
  writeFileSync(join(docs, "Ocean notes.md"), "Ocean tides rise and fall with the moon. Salt water waves break on the sandy shore.");
  writeFileSync(join(code, "retry.py"), 'def commit_transaction(database):\n    """Save database changes atomically."""\n    return database.commit()\n');
  await indexFolders(local, () => {});
  const ocean = await search.search("ocean tides and waves", "documents");
  assert.ok(ocean.hits.some((hit) => hit.path.endsWith("Ocean notes.md")));
  assert.ok(ocean.hits.every((hit) => !hit.path.endsWith("Glass notes.md")));
  assert.ok((await search.search("soft translucent glass reflections", "documents")).hits.some((hit) => hit.path.endsWith("Glass renamed.md")));
  const changedCode = (await search.search("code: commit_transaction database", "code")).hits.find((hit) => hit.path.endsWith("retry.py"));
  assert.ok(changedCode);
  assert.match(String((await search.request({ op: "text", segment: changedCode.segment_id, code: true })).text), /commit_transaction/);
  unlinkSync(join(docs, "Ocean notes.md")); unlinkSync(join(code, "retry.py"));
  await indexFolders(local, () => {});
  assert.ok((await search.search("ocean tides and waves", "documents")).hits.every((hit) => !hit.path.endsWith("Ocean notes.md")));
  assert.deepEqual((await search.search("code: commit_transaction database", "code")).hits, []);
});
test("local scope analysis keeps a helper PID as lock owner, so a command reload cannot strand the shared Raycast PID", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lens-scope-owner-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const local = { ...configurationFromPreferences({ codeRoots: [root] }, assets, root), binary: fake };
  let owner = 0;
  await indexFolders(local, (event) => {
    if (event.event === "scope") {
      owner = Number(readFileSync(join(local.index, "indexing.lock"), "utf8"));
      assert.notEqual(owner, process.pid);
    }
  });
  assert.ok(owner > 0);
  assert.equal(existsSync(join(local.index, "indexing.lock")), false);
});

test("background scope comparison stays in a helper instead of importing a catalog into Raycast", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lens-native-scope-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const binary = join(root, "engine.mjs");
  writeFileSync(binary, '#!/usr/bin/env node\nif(process.argv[2]==="search-service"){console.log(JSON.stringify({event:"error",message:"catalog must stay native"}));process.exitCode=1;}else{console.log(JSON.stringify({event:process.argv[2]==="scope-service"?"scope":"done"}));}\n', { mode: 0o755 });
  const local = { ...configurationFromPreferences({ codeRoots: [root] }, assets, root), binary };
  const events: string[] = [];
  await indexFolders(local, (event) => events.push(String(event.event)));
  assert.ok(events.includes("scope"));
  assert.equal(existsSync(join(local.index, "indexing.lock")), false);
});


test("fresh local-ranking setup enables only after completion and preserves failures for retry", async t => {
  const root = mkdtempSync(join(tmpdir(), "lens-ranking-setup-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const mode of ["success", "failure", "incomplete", "cancel"]) {
    const binary = join(root, `${mode}.mjs`);
    writeFileSync(binary, `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] !== "download-model" || args[1] !== "--reranker" || args[2] !== "--to") process.exit(99);
mkdirSync(args[3], { recursive: true });
writeFileSync(args[3]+"/request.json",JSON.stringify(args));
console.log(JSON.stringify({event:"progress",all_bytes:1,all_total:2}));
${mode === "success" ? 'console.log(JSON.stringify({event:"done"}));' : mode === "failure" ? 'console.log(JSON.stringify({event:"error",message:"Download failed"}));process.exitCode=1;' : mode === "cancel" ? 'setTimeout(()=>console.log(JSON.stringify({event:"done"})),10000);' : ''}
`, { mode: 0o755 });
    const local = { ...config, binary, models: join(root, mode) };
    const marker = join(local.models, "reranker", "enabled.json");
    const abort = new AbortController();
    let progress = false;
    const setup = prepareLocalRanking(local, event => {
      assert.equal(existsSync(marker), false, "never enable before the subprocess succeeds");
      if (event.event === "progress") {
        progress = true;
        if (mode === "cancel") abort.abort();
      }
    }, abort.signal);
    if (mode === "success") {
      await setup;
      assert.equal(JSON.parse(readFileSync(marker, "utf8")).version, 1);
    } else {
      await assert.rejects(setup, /failed|did not finish|abort/i);
      assert.equal(existsSync(marker), false);
    }
    assert.equal(progress, true);
    assert.equal(JSON.parse(readFileSync(join(local.models,"reranker","request.json"),"utf8"))[3], join(local.models,"reranker"));
  }
});
