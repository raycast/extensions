import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "../../src/git/exec";
import { readRepositoryGitInfo } from "../../src/git/info";
import { makeTempTree, type TempTree } from "../helpers/tmp";

/**
 * End-to-end tests that drive the REAL `git` CLI against a freshly created
 * repository. They verify the exec wrapper and the info reader behave correctly
 * against actual Git output, not just mocked runners.
 */

let tree: TempTree;
let gitAvailable = true;

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, {
    cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  });
}

beforeEach(() => {
  tree = makeTempTree();
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    gitAvailable = false;
  }
});

afterEach(() => {
  tree.cleanup();
});

describe("git integration", () => {
  it("reads branch, status, remote, and last commit from a real repo", async () => {
    if (!gitAvailable) {
      return;
    }
    const repo = tree.dir("real");
    git(repo, "init", "-b", "main");
    git(repo, "remote", "add", "origin", "git@github.com:owner/repo.git");
    writeFileSync(join(repo, "file.txt"), "hello");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "initial");

    const info = await readRepositoryGitInfo(repo, "normal");
    expect(info.branch).toBe("main");
    expect(info.status).toBe("clean");
    expect(info.remoteUrl).toBe("git@github.com:owner/repo.git");
    expect(info.remoteWebUrl).toBe("https://github.com/owner/repo");
    expect(info.lastCommitAt).toBeGreaterThan(0);
  });

  it("detects a dirty working tree", async () => {
    if (!gitAvailable) {
      return;
    }
    const repo = tree.dir("dirty");
    git(repo, "init", "-b", "main");
    writeFileSync(join(repo, "committed.txt"), "v1");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "initial");
    writeFileSync(join(repo, "untracked.txt"), "new");

    const info = await readRepositoryGitInfo(repo, "normal");
    expect(info.status).toBe("dirty");
  });

  it("returns an error branch when running git in a non-repository", async () => {
    if (!gitAvailable) {
      return;
    }
    const notRepo = tree.dir("plain");
    const result = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: notRepo });
    expect(result.ok).toBe(false);
  });
});
