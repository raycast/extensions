import assert from "node:assert/strict";
import { access, chmod, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
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
    cleanup(root, [{ ...first }], current, async () => {}),
    /Selection changed/,
  );
  await assert.rejects(
    cleanup(root, [first, first], current, async () => {}),
    /Selection changed/,
  );
  const moved: string[] = [];
  const results = await cleanup(root, [first, second], current, async (target) => {
    if (target === first.path) throw new Error("Trash permission denied");
    moved.push(target);
  });
  assert.equal(results[0].status, "failed");
  assert.equal(results[1].status, "success");
  assert.deepEqual(moved, [second.path]);
  await access(first.path);
});

test("cleanup moves the reviewed directory intact and leaves unselected directories in place", async (t) => {
  const { base, root, path } = await fixture(t);
  const item = await captureArtifact(root, record(path));
  const keep = join(root.path, "keep");
  await mkdir(keep);
  const unselected = await captureArtifact(root, record(keep));
  const current = new Map([
    [path, item],
    [keep, unselected],
  ]);
  const trashedPath = join(base, "trashed");
  const result = await cleanup(root, [item], current, async (target) => {
    await rename(target, trashedPath);
  });
  assert.equal(result[0].status, "success");
  await assert.rejects(access(path), { code: "ENOENT" });
  assert.equal(await readFile(join(trashedPath, "file"), "utf8"), "fixture only");
  await access(keep);
  await access(root.path);
});

test("missing candidates are removed as stale without invoking Trash", async (t) => {
  const { root, path } = await fixture(t);
  const item = await captureArtifact(root, record(path));
  await rm(path, { recursive: true });
  let called = false;
  const results = await cleanup(root, [item], new Map([[path, item]]), async () => {
    called = true;
  });
  assert.equal(results[0].status, "missing");
  assert.equal(called, false);
});

test("a Trash ENOENT failure preserves a source that still exists", async (t) => {
  const { root, path } = await fixture(t);
  const item = await captureArtifact(root, record(path));
  const results = await cleanup(root, [item], new Map([[path, item]]), async () => {
    throw Object.assign(new Error("Trash destination missing"), { code: "ENOENT" });
  });
  assert.equal(results[0].status, "failed");
  await access(path);
});

test("overlapping directories are rejected before invoking Trash", async (t) => {
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
