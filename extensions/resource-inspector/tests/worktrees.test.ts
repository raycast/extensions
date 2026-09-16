import test, { TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  gitAt,
  listRepositoryWorktrees,
  parseStatus,
  parseWorktreeList,
  providerHint,
  removeWorktree,
  reviewWorktree,
  scanWorktrees,
} from "../src/worktree-data";

async function fixture(t: TestContext) {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "inspector-worktree-test-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = join(root, "project");
  await mkdir(repo);
  await gitAt(repo, ["init", "-b", "main"]);
  await writeFile(join(repo, "tracked.txt"), "initial\n");
  await writeFile(join(repo, ".gitignore"), "ignored/\n");
  await gitAt(repo, ["add", "."]);
  await commit(repo, "initial");
  const common = join(repo, ".git");
  async function add(name: string, detached = false) {
    const path = join(root, name);
    await gitAt(repo, [
      "worktree",
      "add",
      ...(detached
        ? ["--detach"]
        : ["-b", name.replace(/[^a-zA-Z0-9-]/g, "-")]),
      path,
    ]);
    return (await listRepositoryWorktrees(common)).find(
      (tree) => tree.path === path,
    )!;
  }
  return { root, repo, common, add };
}
async function commit(repo: string, message: string) {
  return gitAt(repo, [
    "-c",
    "user.name=Resource Inspector Test",
    "-c",
    "user.email=inspector-test@localhost",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    message,
  ]);
}

test("NUL parsing preserves unusual paths, branch refs, lock reasons and detached state", () => {
  const rows = parseWorktreeList(
    "worktree /tmp/a space\nand newline\0HEAD abc\0branch refs/heads/topic/foo\0locked reason with spaces\0\0worktree /tmp/b\0HEAD def\0detached\0prunable gitdir missing\0\0",
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].path, "/tmp/a space\nand newline");
  assert.equal(rows[0].branch, "refs/heads/topic/foo");
  assert.equal(rows[0].locked, "reason with spaces");
  assert.equal(rows[1].detached, true);
  assert.equal(rows[1].prunable, "gitdir missing");
  assert.deepEqual(
    parseStatus("R  new\0old\0?? untracked/\0!! ignored/\0 M tracked\0"),
    {
      tracked: 2,
      untracked: 1,
      ignored: 1,
      changes: ["R  new", "?? untracked/", "!! ignored/", " M tracked"],
    },
  );
});

test("provider hints are based on paths, with provider-independent fallback", () => {
  assert.equal(
    providerHint("/Users/test/.codex/worktrees/a/project").provider,
    "Codex / ChatGPT",
  );
  assert.equal(
    providerHint("/Users/test/project/.claude/worktrees/topic").provider,
    "Claude",
  );
  assert.equal(
    providerHint("/Users/test/.pi/agent/worktrees/topic").provider,
    "Pi",
  );
  assert.equal(
    providerHint("/Users/test/.local/share/opencode/worktree/hash/topic")
      .provider,
    "OpenCode",
  );
  assert.equal(
    providerHint("/Users/test/project/claude-topic").provider,
    "Git / Other",
  );
});

test("discovery finds externally located worktrees through Git, deduplicates and labels estimated dates", async (t) => {
  const f = await fixture(t),
    tree = await f.add("unknown-provider-worktree");
  const scan = await scanWorktrees([f.repo, f.repo]);
  assert.equal(scan.repositories, 1);
  assert.equal(scan.trees.length, 2);
  const found = scan.trees.find((row) => row.key === tree.key)!;
  assert.equal(found.branch, "refs/heads/unknown-provider-worktree");
  assert.ok(found.createdAt! > Date.now() - 60000);
  assert.match(found.createdSource, /estimate/);
  assert.equal(found.provider, "Git / Other");
  assert.equal(scan.partial, false);
  assert.equal(scan.warnings.length, 0);
  const limited = await scanWorktrees([f.root], { maxDirectories: 1 });
  assert.equal(limited.partial, true);
  assert.equal(limited.scannedDirectories, 1);
  assert.match(
    (await scanWorktrees([join(f.root, "nonexistent")])).warnings[0],
    /missing or unavailable/,
  );
});

test("main and locked checkouts cannot be removed, even with explicit force", async (t) => {
  const f = await fixture(t),
    tree = await f.add("locked");
  const main = (await listRepositoryWorktrees(f.common)).find(
    (row) => row.main,
  )!;
  const mainReview = await reviewWorktree(main);
  assert.match(mainReview.blockedReason!, /main checkout/);
  await assert.rejects(removeWorktree(mainReview, true), /main checkout/);
  await gitAt(f.repo, [
    "worktree",
    "lock",
    "--reason",
    "active agent",
    tree.path,
  ]);
  const lockedReview = await reviewWorktree(tree);
  assert.match(lockedReview.blockedReason!, /active agent/);
  await assert.rejects(removeWorktree(lockedReview, true), /locked/);
  assert.equal(
    await readFile(join(tree.path, "tracked.txt"), "utf8"),
    "initial\n",
  );
});

test("clean removal selects one checkout and retains its branch and sibling", async (t) => {
  const f = await fixture(t),
    chosen = await f.add("chosen with space\nand newline"),
    sibling = await f.add("sibling");
  const review = await reviewWorktree(chosen);
  assert.equal(review.blockedReason, undefined);
  await removeWorktree(review, false);
  const remaining = await listRepositoryWorktrees(f.common);
  assert.ok(!remaining.some((row) => row.key === chosen.key));
  assert.ok(remaining.some((row) => row.key === sibling.key));
  assert.equal(
    (await gitAt(f.repo, ["rev-parse", chosen.branch!])).trim(),
    chosen.head,
  );
  await assert.rejects(reviewWorktree(chosen), /no longer registered/);
});

test("dirty removal requires explicit discard and stale review cannot delete new paths", async (t) => {
  const f = await fixture(t),
    tree = await f.add("dirty");
  const clean = await reviewWorktree(tree);
  await writeFile(join(tree.path, "tracked.txt"), "unsaved changes\n");
  await writeFile(join(tree.path, "new file.txt"), "new work");
  await mkdir(join(tree.path, "ignored"));
  await writeFile(
    join(tree.path, "ignored/private.txt"),
    "test-only ignored file",
  );
  await assert.rejects(removeWorktree(clean, false), /changed since review/);
  const dirty = await reviewWorktree(tree);
  assert.equal(dirty.tracked, 1);
  assert.equal(dirty.untracked, 1);
  assert.equal(dirty.ignored, 1);
  await assert.rejects(removeWorktree(dirty, false), /separate/);
  await writeFile(join(tree.path, "another.txt"), "after review");
  await assert.rejects(removeWorktree(dirty, true), /changed since review/);
  await removeWorktree(await reviewWorktree(tree), true);
  assert.equal(
    (await gitAt(f.repo, ["rev-parse", tree.branch!])).trim(),
    tree.head,
  );
});

test("branch changes since review invalidate confirmation", async (t) => {
  const f = await fixture(t),
    tree = await f.add("branch-change");
  const review = await reviewWorktree(tree);
  await gitAt(tree.path, ["switch", "-c", "new-branch"]);
  await assert.rejects(removeWorktree(review, true), /changed since review/);
});

test("detached commits retain a recovery ref after selected checkout removal", async (t) => {
  const f = await fixture(t),
    tree = await f.add("detached", true);
  await writeFile(join(tree.path, "tracked.txt"), "detached committed work\n");
  await gitAt(tree.path, ["add", "."]);
  await commit(tree.path, "detached work");
  const tip = (await gitAt(tree.path, ["rev-parse", "HEAD"])).trim();
  const result = await removeWorktree(await reviewWorktree(tree), false);
  assert.ok(
    result.recoveryRef?.startsWith(
      "refs/resource-inspector/deleted-worktrees/",
    ),
  );
  assert.equal(
    (await gitAt(f.repo, ["rev-parse", result.recoveryRef!])).trim(),
    tip,
  );
});

test("missing registration cleanup affects only the selected registration", async (t) => {
  const f = await fixture(t),
    chosen = await f.add("missing-one"),
    other = await f.add("missing-two");
  await rm(chosen.path, { recursive: true });
  await rm(other.path, { recursive: true });
  const review = await reviewWorktree(chosen);
  assert.equal(review.tree.exists, false);
  assert.equal(review.blockedReason, undefined);
  await removeWorktree(review, false);
  const remaining = await listRepositoryWorktrees(f.common);
  assert.ok(!remaining.some((row) => row.key === chosen.key));
  assert.ok(remaining.some((row) => row.key === other.key));
  assert.equal(
    (await gitAt(f.repo, ["rev-parse", chosen.branch!])).trim(),
    chosen.head,
  );
});

test("replaced symlinks and replaced directories cannot reuse an old confirmation", async (t) => {
  const f = await fixture(t),
    tree = await f.add("replaced");
  const review = await reviewWorktree(tree);
  const moved = join(f.root, "moved");
  await rename(tree.path, moved);
  await symlink(moved, tree.path);
  await assert.rejects(removeWorktree(review, true), /Symbolic-link/);
  await rm(tree.path);
  await mkdir(tree.path);
  await writeFile(join(tree.path, ".git"), await readFile(join(moved, ".git")));
  await writeFile(join(tree.path, "tracked.txt"), "initial\n");
  await writeFile(join(tree.path, ".gitignore"), "ignored/\n");
  await assert.rejects(removeWorktree(review, true), /changed since review/);
});

test("a nested registered worktree protects its containing checkout", async (t) => {
  const f = await fixture(t),
    parent = await f.add("parent");
  await gitAt(f.repo, [
    "worktree",
    "add",
    "-b",
    "nested",
    join(parent.path, "nested"),
  ]);
  const review = await reviewWorktree(parent);
  assert.match(review.blockedReason!, /inside this folder/);
  await assert.rejects(removeWorktree(review, true), /inside this folder/);
});

test("bare repositories and relative worktree registrations remain discoverable", async (t) => {
  const f = await fixture(t),
    bare = join(f.root, "bare.git"),
    linked = join(f.root, "bare-linked");
  await gitAt(f.root, ["clone", "--bare", f.repo, bare]);
  await gitAt(bare, [
    "worktree",
    "add",
    "--relative-paths",
    "-b",
    "relative",
    linked,
  ]);
  const scan = await scanWorktrees([bare]);
  assert.equal(scan.repositories, 1);
  assert.equal(scan.trees.length, 2);
  const base = scan.trees.find((row) => row.main)!,
    tree = scan.trees.find((row) => !row.main)!;
  assert.equal(base.bare, true);
  assert.equal(tree.path, linked);
  assert.match((await reviewWorktree(base)).blockedReason!, /bare repository/);
  const review = await reviewWorktree(tree);
  assert.equal(review.blockedReason, undefined);
  await removeWorktree(review, false);
  assert.equal(
    (await gitAt(bare, ["rev-parse", tree.branch!])).trim(),
    tree.head,
  );
});
