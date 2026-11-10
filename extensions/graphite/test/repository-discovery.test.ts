import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findGraphiteRepositories } from "../src/lib/repositories";
import { mockPreferences } from "./mocks/raycast-api";

const folders: string[] = [];

afterEach(async () => {
  mockPreferences.repositoryFolders = "";
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function graphiteClone(folder: string) {
  await mkdir(join(folder, ".git"), { recursive: true });
  await writeFile(join(folder, ".git", ".graphite_repo_config"), "{}");
  await writeFile(join(folder, ".git", "config"), '[remote "origin"]\nurl = git@github.com:acme/web.git\n');
}

describe("repository discovery", () => {
  it("finds Graphite clones while respecting Git directory and worktree boundaries", async () => {
    const root = await mkdtemp(join(tmpdir(), "graphite-discovery-"));
    folders.push(root);
    mockPreferences.repositoryFolders = root;

    const visible = join(root, "projects", "web");
    await graphiteClone(visible);
    await graphiteClone(join(visible, "nested"));
    await mkdir(join(root, "plain", ".git"), { recursive: true });
    await graphiteClone(join(root, "plain", "nested"));
    await mkdir(join(root, "worktree"), { recursive: true });
    await writeFile(join(root, "worktree", ".git"), "gitdir: /fake/worktree");
    await graphiteClone(join(root, "worktree", "nested"));

    expect(await findGraphiteRepositories()).toEqual([{ path: visible, name: "web", slug: "acme/web" }]);
  });

  it("keeps the depth limit and skips build directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "graphite-discovery-"));
    folders.push(root);
    mockPreferences.repositoryFolders = root;
    await graphiteClone(join(root, "one", "two", "three"));
    await graphiteClone(join(root, "other", "two", "three", "four"));
    await graphiteClone(join(root, "node_modules", "hidden"));
    expect((await findGraphiteRepositories()).map((repo) => repo.path)).toEqual([join(root, "one", "two", "three")]);
  });
});
