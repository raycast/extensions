import assert from "node:assert/strict";
import { access, chmod, mkdir, mkdtemp, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import test, { TestContext } from "node:test";
import { captureArtifact, isWithin, revalidateArtifact, validateRoot } from "../src/services/path-validation";
import { cleanup } from "../src/services/cleanup";
import { ScanRecord } from "../src/types";

const record = (path: string): ScanRecord => ({ path, size: 10, activity: null, risk: "review" });
async function fixture(t: TestContext) {
  const base = await realpath(await mkdtemp(join(tmpdir(), "npkill-safety-")));
  t.after(() => rm(base, { recursive: true, force: true }));
  const rootPath = join(base, "projects");
  await mkdir(rootPath);
  const path = join(rootPath, "雪 project", "node_modules");
  await mkdir(path, { recursive: true });
  await writeFile(join(path, "file"), "fixture only");
  return { base, rootPath, path, root: await validateRoot(rootPath) };
}

test("strict boundaries reject roots, siblings, traversal, and the user's home itself", async (t) => {
  const { root, path } = await fixture(t);
  assert.ok(isWithin(root.path, path));
  assert.ok(!isWithin(root.path, root.path));
  assert.ok(!isWithin(root.path, root.path + "-other/node_modules"));
  await assert.rejects(validateRoot("/"));
  await assert.rejects(validateRoot("relative"));
  await assert.rejects(captureArtifact(root, record(root.path)));
  await assert.rejects(captureArtifact(root, record(join(root.path, "../outside"))));
  await assert.rejects(captureArtifact(root, record(root.path + "/a/../node_modules")));
  const home = await realpath(homedir());
  await assert.rejects(captureArtifact({ path: "/", identity: [] }, record(home)), /protected/);
});

test("symlink candidates and intermediate symlinks are rejected", async (t) => {
  const { base, root, path } = await fixture(t);
  const outside = join(base, "outside");
  await mkdir(outside);
  const link = join(root.path, "node_modules");
  await symlink(outside, link);
  await assert.rejects(captureArtifact(root, record(link)), /ordinary directory/);
  const parentLink = join(root.path, "linked-project");
  await symlink(join(path, ".."), parentLink);
  await assert.rejects(captureArtifact(root, record(join(parentLink, "node_modules"))), /ordinary directory/);
});

test("candidate replacement, symlink swap, ancestor replacement, and scan-root replacement invalidate identity", async (t) => {
  const { root, path } = await fixture(t);
  const artifact = await captureArtifact(root, record(path));
  await rename(path, path + "-old");
  await mkdir(path);
  await assert.rejects(revalidateArtifact(root, artifact), /identity changed/);
  await rm(path, { recursive: true });
  await symlink(path + "-old", path);
  await assert.rejects(revalidateArtifact(root, artifact), /ordinary directory/);
  await rm(path);
  await rename(path + "-old", path);
  const parent = join(path, "..");
  await rename(parent, parent + "-old");
  await mkdir(parent);
  await rename(join(parent + "-old", "node_modules"), path);
  await assert.rejects(revalidateArtifact(root, artifact), /identity changed/);
  await rename(root.path, root.path + "-old");
  await mkdir(root.path);
  await rename(parent, join(root.path, "replacement")).catch(() => {});
  await assert.rejects(revalidateArtifact(root, artifact));
});

test("cleanup only processes the confirmed allowlist and reports individual failures", async (t) => {
  const { root, path } = await fixture(t);
  const first = await captureArtifact(root, record(path));
  const secondPath = join(root.path, "other", "node_modules");
  await mkdir(secondPath, { recursive: true });
  const second = await captureArtifact(root, record(secondPath));
  const current = new Map([
    [first.path, first],
    [second.path, second],
  ]);
  await assert.rejects(
    cleanup(root, [{ ...first }], current, "permanent", async () => {}),
    /Selection changed/,
  );
  await assert.rejects(
    cleanup(root, [first, first], current, "permanent", async () => {}),
    /Selection changed/,
  );
  const moved: string[] = [];
  const results = await cleanup(root, [first, second], current, "trash", async (target) => {
    if (target === first.path) throw new Error("Trash permission denied");
    moved.push(target);
  });
  assert.equal(results[0].status, "failed");
  assert.equal(results[1].status, "success");
  assert.deepEqual(moved, [second.path]);
  await access(first.path);
});

test("permanent cleanup deletes disposable fixtures only and preserves unselected directories", async (t) => {
  const { root, path } = await fixture(t);
  const item = await captureArtifact(root, record(path));
  const keep = join(root.path, "keep");
  await mkdir(keep);
  const result = await cleanup(root, [item], new Map([[path, item]]), "permanent", async () => {
    throw new Error("Must not trash");
  });
  assert.equal(result[0].status, "success");
  await assert.rejects(access(path));
  await access(keep);
  await access(root.path);
});

test("permanent cleanup never follows symlinks inside the selected directory", async (t) => {
  const { base, root, path } = await fixture(t);
  const outside = join(base, "outside");
  await mkdir(outside);
  const keep = join(outside, "keep.txt");
  await writeFile(keep, "keep");
  await symlink(outside, join(path, "linked-content"));
  const item = await captureArtifact(root, record(path));
  const result = await cleanup(root, [item], new Map([[path, item]]), "permanent", async () => {});
  assert.equal(result[0].status, "success");
  await access(keep);
});

test("missing candidates are removed as stale without invoking a deletion operation", async (t) => {
  const { root, path } = await fixture(t);
  const item = await captureArtifact(root, record(path));
  await rm(path, { recursive: true });
  let called = false;
  const results = await cleanup(root, [item], new Map([[path, item]]), "trash", async () => {
    called = true;
  });
  assert.equal(results[0].status, "missing");
  assert.equal(called, false);
});

test("a Trash ENOENT failure preserves a source that still exists", async (t) => {
  const { root, path } = await fixture(t);
  const item = await captureArtifact(root, record(path));
  const results = await cleanup(root, [item], new Map([[path, item]]), "trash", async () => {
    throw Object.assign(new Error("Trash destination missing"), { code: "ENOENT" });
  });
  assert.equal(results[0].status, "failed");
  await access(path);
});

test("overlapping directories are rejected before any deletion", async (t) => {
  const { root, path } = await fixture(t);
  const parent = await captureArtifact(root, record(join(path, "..")));
  const child = await captureArtifact(root, record(path));
  await assert.rejects(
    cleanup(
      root,
      [parent, child],
      new Map([
        [parent.path, parent],
        [child.path, child],
      ]),
      "permanent",
      async () => {},
    ),
    /overlapping/,
  );
  await access(path);
});

test("unreadable scan roots surface a permission error", async (t) => {
  if (process.getuid?.() === 0) return t.skip("root bypasses POSIX directory permissions");
  const { rootPath } = await fixture(t);
  await chmod(rootPath, 0);
  try {
    await assert.rejects(validateRoot(rootPath), { code: "EACCES" });
  } finally {
    await chmod(rootPath, 0o700);
  }
});
