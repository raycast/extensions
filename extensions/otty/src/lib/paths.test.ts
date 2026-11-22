import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { basename, classifyPaths, findRepos, relativeParent } from "./paths";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "otty-paths-"));
  const dirs = [
    "alpha/.git",
    "owner/beta/.git",
    "owner/beta/nested/.git",
    "owner/gamma/src",
    "deep/a/b/delta/.git",
    "node_modules/pkg/.git",
    ".hidden/repo/.git",
  ];
  for (const dir of dirs) mkdirSync(join(root, dir), { recursive: true });
  mkdirSync(join(root, "owner/worktree"), { recursive: true });
  writeFileSync(join(root, "owner/worktree/.git"), "gitdir: /elsewhere");
  writeFileSync(join(root, "alpha/readme.md"), "hi");
});

describe("findRepos", () => {
  it("finds repos within the depth, without descending into them", async () => {
    const repos = await findRepos(root, 2);
    expect(repos.map((path) => path.slice(root.length + 1))).toEqual(["alpha", "owner/beta", "owner/worktree"]);
  });

  it("respects a shallower depth", async () => {
    const repos = await findRepos(root, 1);
    expect(repos.map((path) => path.slice(root.length + 1))).toEqual(["alpha"]);
  });

  it("returns nothing for a missing folder", async () => {
    expect(await findRepos(join(root, "nope"), 2)).toEqual([]);
  });
});

describe("classifyPaths", () => {
  it("splits a selection into folders and files, dropping missing paths", async () => {
    expect(
      await classifyPaths([
        join(root, "alpha"),
        join(root, "alpha/readme.md"),
        join(root, "alpha"),
        join(root, "gone"),
      ]),
    ).toEqual({
      directories: [join(root, "alpha")],
      files: [join(root, "alpha/readme.md")],
    });
  });
});

describe("relativeParent", () => {
  it("shows where a repo sits below the scanned folder", () => {
    expect(relativeParent("/r/owner/repo", "/r")).toBe("owner");
    expect(relativeParent("/r/a/b/repo", "/r/")).toBe("a/b");
    expect(relativeParent("/r/repo", "/r")).toBeUndefined();
  });
});

describe("basename", () => {
  it("keeps the root as `/`, unlike node:path, and ignores a trailing slash", () => {
    expect(basename("/")).toBe("/");
    expect(basename("/Users/me/repo/")).toBe("repo");
  });
});
