import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { classifyPaths, findFiles, findRepos, relativeParent } from "./paths";

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
    "recipes/team",
  ];
  for (const dir of dirs) mkdirSync(join(root, dir), { recursive: true });
  // A worktree or submodule marks itself with a .git FILE, not a directory.
  mkdirSync(join(root, "owner/worktree"), { recursive: true });
  writeFileSync(join(root, "owner/worktree/.git"), "gitdir: /elsewhere");
  writeFileSync(join(root, "alpha/readme.md"), "hi");
  writeFileSync(join(root, "recipes/dev.ottyrecipe"), "{}");
  writeFileSync(join(root, "recipes/team/api.ottyrecipe"), "{}");
  writeFileSync(join(root, "recipes/notes.txt"), "");
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

describe("findFiles", () => {
  it("finds files by extension, recursively", async () => {
    const files = await findFiles(join(root, "recipes"), ".ottyrecipe", 3);
    expect(files.map((path) => path.slice(root.length + 1))).toEqual([
      "recipes/dev.ottyrecipe",
      "recipes/team/api.ottyrecipe",
    ]);
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
