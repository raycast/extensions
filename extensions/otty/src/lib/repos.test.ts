import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countChanges,
  githubOwner,
  loadRepoInfo,
  parseOriginUrl,
  parseAheadBehind,
  readBranch,
  sortByRecent,
} from "./repos";

describe("parseAheadBehind", () => {
  it("reads `rev-list --left-right --count @{u}...HEAD` as behind, ahead", () => {
    expect(parseAheadBehind("3\t2\n")).toEqual({ behind: 3, ahead: 2 });
    expect(parseAheadBehind("garbage")).toBeUndefined();
  });
});

describe("readBranch", () => {
  const root = mkdtempSync(join(tmpdir(), "otty-branch-"));

  it("reads the branch from .git/HEAD without running git", async () => {
    const repo = join(root, "clone");
    mkdirSync(join(repo, ".git"), { recursive: true });
    writeFileSync(join(repo, ".git/HEAD"), "ref: refs/heads/feature/x\n");
    expect(await readBranch(repo)).toBe("feature/x");
  });

  it("shortens a detached HEAD to its commit", async () => {
    const repo = join(root, "detached");
    mkdirSync(join(repo, ".git"), { recursive: true });
    writeFileSync(join(repo, ".git/HEAD"), "0123456789abcdef0123\n");
    expect(await readBranch(repo)).toBe("0123456");
  });

  it("follows a worktree's .git file to its HEAD", async () => {
    const gitdir = join(root, "main/.git/worktrees/wt");
    mkdirSync(gitdir, { recursive: true });
    writeFileSync(join(gitdir, "HEAD"), "ref: refs/heads/wt-branch\n");
    const worktree = join(root, "wt");
    mkdirSync(worktree);
    writeFileSync(join(worktree, ".git"), `gitdir: ${gitdir}\n`);
    expect(await readBranch(worktree)).toBe("wt-branch");
  });
});

describe("loadRepoInfo", () => {
  it("reads branch and last commit from a real repository", async () => {
    const repo = mkdtempSync(join(tmpdir(), "otty-repo-"));
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", repo, ...args], {
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "t",
          GIT_AUTHOR_EMAIL: "t@example.com",
          GIT_COMMITTER_NAME: "t",
          GIT_COMMITTER_EMAIL: "t@example.com",
        },
      });
    git("init", "-q", "-b", "trunk");
    git("commit", "-q", "--allow-empty", "-m", "first");
    const before = Date.now();
    const info = await loadRepoInfo(repo);
    expect(info.branch).toBe("trunk");
    expect(info.lastCommit).toBeGreaterThan(before - 60_000);
    expect(info.lastCommit).toBeLessThanOrEqual(before + 1000);
    // No upstream, so nothing to compare against.
    expect(info.ahead).toBeUndefined();
  });
});

describe("sortByRecent", () => {
  it("puts the most recent commits first and unknown ones last", () => {
    expect(
      sortByRecent(["/a", "/b", "/c", "/d"], {
        "/a": { lastCommit: 1 },
        "/b": {},
        "/c": { lastCommit: 3 },
        "/d": { lastCommit: 2 },
      }),
    ).toEqual(["/c", "/d", "/a", "/b"]);
  });
});

describe("parseOriginUrl", () => {
  it("reads origin's url from a git config file", () => {
    const config = [
      "[core]",
      "\tbare = false",
      '[remote "upstream"]',
      "\turl = https://github.com/raycast/extensions.git",
      '[remote "origin"]',
      "\turl = git@github.com:chrismessina/raycast-otty.git",
      "\tfetch = +refs/heads/*:refs/remotes/origin/*",
    ].join("\n");
    expect(parseOriginUrl(config)).toBe("git@github.com:chrismessina/raycast-otty.git");
    expect(parseOriginUrl("[core]\n\tbare = false\n")).toBeUndefined();
  });
});

describe("githubOwner", () => {
  it("recognizes https, scp-style, and ssh GitHub remotes", () => {
    expect(githubOwner("https://github.com/majd/ipatool.git")).toBe("majd");
    expect(githubOwner("https://github.com/majd/ipatool")).toBe("majd");
    expect(githubOwner("git@github.com:0xjessel/threads-bart-bot.git")).toBe("0xjessel");
    expect(githubOwner("ssh://git@github.com/owner/repo.git")).toBe("owner");
  });

  it("ignores other hosts", () => {
    expect(githubOwner("https://gitlab.com/owner/repo.git")).toBeUndefined();
    expect(githubOwner("https://imageoptim.com/git/ImageOptim")).toBeUndefined();
    expect(githubOwner(undefined)).toBeUndefined();
  });
});

describe("countChanges", () => {
  it("counts porcelain status lines", () => {
    expect(countChanges(" M a.ts\n?? b.ts\nA  c.ts\n")).toBe(3);
    expect(countChanges("")).toBe(0);
  });
});

describe("loadRepoInfo with a remote and changes", () => {
  it("reports the GitHub owner and how many files changed", async () => {
    const repo = mkdtempSync(join(tmpdir(), "otty-remote-"));
    const run = (...args: string[]) =>
      execFileSync("git", ["-C", repo, ...args], {
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "t",
          GIT_AUTHOR_EMAIL: "t@example.com",
          GIT_COMMITTER_NAME: "t",
          GIT_COMMITTER_EMAIL: "t@example.com",
        },
      });
    run("init", "-q", "-b", "main");
    run("remote", "add", "origin", "git@github.com:someone/thing.git");
    writeFileSync(join(repo, "a.txt"), "a");
    run("add", "a.txt");
    run("commit", "-q", "-m", "first");
    writeFileSync(join(repo, "a.txt"), "changed");
    writeFileSync(join(repo, "new.txt"), "new");
    // A new folder counts each file in it, not one line for the folder.
    mkdirSync(join(repo, "fresh"));
    writeFileSync(join(repo, "fresh/one.txt"), "1");
    writeFileSync(join(repo, "fresh/two.txt"), "2");
    const info = await loadRepoInfo(repo);
    expect(info.owner).toBe("someone");
    expect(info.changed).toBe(4);
  });
});
