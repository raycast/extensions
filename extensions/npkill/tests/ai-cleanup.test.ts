import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test, { TestContext } from "node:test";
import { reviewCleanup, saveSnapshot, trashArtifacts } from "../src/services/ai-cleanup";
import { captureArtifact, validateRoot } from "../src/services/path-validation";
import { searchArtifacts } from "../src/services/ai-search";

async function fixture(t: TestContext) {
  const base = await realpath(await mkdtemp(join(tmpdir(), "npkill-ai-cleanup-")));
  t.after(() => rm(base, { recursive: true, force: true }));
  const storage = join(base, "snapshots");
  const project = join(base, "projects", "app");
  const path = join(project, "node_modules");
  await mkdir(path, { recursive: true });
  await writeFile(join(project, "package.json"), "{}");
  await writeFile(join(path, "fixture.txt"), "fixture");
  const root = await validateRoot(join(base, "projects"));
  const artifact = await captureArtifact(root, { path, size: 100, activity: null, risk: "review" });
  const scanId = await saveSnapshot(storage, root, [artifact]);
  return { base, storage, root, artifact, input: { scanId, paths: [path] } };
}

test("real AI search returns a usable scan ID; confirmed cleanup returns cloneable per-path outcomes", async (t) => {
  const { base, storage, root, artifact } = await fixture(t);
  const report = await searchArtifacts(
    { directory: root.path },
    {
      root: root.path,
      executable: resolve("node_modules/.bin/npkill"),
      profiles: "node",
      config: "",
      exclusions: "",
      includeSensitive: false,
    },
    { saveSnapshot: (root, items) => saveSnapshot(storage, root, items) },
  );
  assert.equal(report.scanComplete, true);
  assert.ok(report.scanId);
  const input = { scanId: report.scanId, paths: report.results.map((item) => item.path) };
  const confirmation = await reviewCleanup(storage, input);
  assert.equal(confirmation.info[0].name, artifact.path);
  assert.match(confirmation.info[0].value, /review/);
  assert.equal(await readFile(join(artifact.path, "fixture.txt"), "utf8"), "fixture");
  const result = await trashArtifacts(storage, input, (path) => rename(path, join(base, "test-trash")));
  assert.equal(result.trashedCount, 1);
  assert.equal(result.results[0].status, "trashed");
  assert.deepEqual(structuredClone(result), result);
  assert.equal(await readFile(join(base, "test-trash", "fixture.txt"), "utf8"), "fixture");
  // A recreated directory must never be moved by retrying an already-used scan.
  await mkdir(artifact.path);
  await assert.rejects(
    trashArtifacts(storage, input, async () => assert.fail("must not repeat")),
    /already used/,
  );
});

test("cleanup rejects invented paths, invalid scan IDs, duplicate and overlapping selections", async (t) => {
  const { storage, root, artifact, input } = await fixture(t);
  for (const changed of [
    { ...input, paths: [root.path] },
    { ...input, paths: [artifact.path + "/unreturned"] },
    { ...input, paths: [artifact.path, artifact.path] },
    { ...input, paths: [] },
    { ...input, scanId: "../../outside" },
  ]) {
    await assert.rejects(trashArtifacts(storage, changed, async () => assert.fail("must not move")));
  }
  const nested = join(artifact.path, "nested");
  await mkdir(nested);
  const child = await captureArtifact(root, { path: nested, size: 1, activity: null, risk: "unknown" });
  const scanId = await saveSnapshot(storage, root, [artifact, child]);
  await assert.rejects(reviewCleanup(storage, { scanId, paths: [artifact.path, nested] }), /overlapping/);
});

test("changed identities and symlinks between confirmation and execution are never moved", async (t) => {
  const { storage, artifact, input } = await fixture(t);
  await reviewCleanup(storage, input);
  await rename(artifact.path, artifact.path + "-original");
  await mkdir(artifact.path);
  const changed = await trashArtifacts(storage, input, async () => assert.fail("must not move replacement"));
  assert.equal(changed.failedCount, 1);
  assert.match(changed.results[0].error!, /identity changed/);

  const f = await fixture(t);
  await rename(f.artifact.path, f.artifact.path + "-original");
  await symlink(f.artifact.path + "-original", f.artifact.path);
  await assert.rejects(reviewCleanup(f.storage, f.input), /ordinary directory/);
  const linked = await trashArtifacts(f.storage, f.input, async () => assert.fail("must not follow link"));
  assert.equal(linked.failedCount, 1);
});

test("expired snapshots fail before confirmation or mutation", async (t) => {
  const { storage, input } = await fixture(t);
  const file = join(storage, `${input.scanId}.json`);
  const snapshot = JSON.parse(await readFile(file, "utf8"));
  snapshot.createdAt = Date.now() - 31 * 60 * 1000;
  await writeFile(file, JSON.stringify(snapshot));
  await assert.rejects(reviewCleanup(storage, input), /expired/);
  await assert.rejects(
    trashArtifacts(storage, input, async () => assert.fail("must not move")),
    /expired/,
  );
});

test("concurrent cleanup claims a snapshot only once", async (t) => {
  const { storage, input } = await fixture(t);
  let calls = 0;
  const move = async () => {
    calls++;
  };
  const results = await Promise.allSettled([
    trashArtifacts(storage, input, move),
    trashArtifacts(storage, input, move),
  ]);
  assert.equal(calls, 1);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
});

test("missing sources and Trash failures have distinct outcomes", async (t) => {
  const { storage, input, artifact } = await fixture(t);
  await rm(artifact.path, { recursive: true });
  const missing = await trashArtifacts(storage, input, async () => assert.fail("source missing"));
  assert.equal(missing.missingCount, 1);
  const f = await fixture(t);
  const failed = await trashArtifacts(f.storage, f.input, async () => {
    throw Object.assign(new Error("Trash unavailable"), { code: "ENOENT" });
  });
  assert.equal(failed.failedCount, 1);
  assert.equal(failed.missingCount, 0);
  assert.equal(failed.results[0].error, "Trash unavailable");
});
