import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmodSync } from "node:fs";
import { discoverRepositories, type DiscoveryOptions } from "../../src/filesystem/discovery";
import { makeTempTree, type TempTree } from "../helpers/tmp";

let tree: TempTree;

beforeEach(() => {
  tree = makeTempTree();
});

afterEach(() => {
  tree.cleanup();
});

function options(overrides: Partial<DiscoveryOptions> = {}): DiscoveryOptions {
  return {
    roots: [tree.root],
    maxDepth: 10,
    ignoredDirectories: new Set(["node_modules"]),
    followSymlinks: false,
    includeBareRepos: true,
    ...overrides,
  };
}

/** Basenames of discovered repos, sorted, for stable assertions. */
async function discoverNames(opts: DiscoveryOptions): Promise<string[]> {
  const repos = await discoverRepositories(opts);
  return repos.map((r) => r.name).sort();
}

describe("discoverRepositories", () => {
  it("finds normal, bare, and worktree repositories", async () => {
    tree.gitRepo("code/alpha");
    tree.bareRepo("mirrors/beta.git");
    tree.worktree("work/gamma");
    expect(await discoverNames(options())).toEqual(["alpha", "beta.git", "gamma"]);
  });

  it("does not descend into a discovered repository (nested repos ignored)", async () => {
    tree.gitRepo("outer");
    tree.gitRepo("outer/vendor/inner");
    const repos = await discoverRepositories(options());
    expect(repos.map((r) => r.name)).toEqual(["outer"]);
  });

  it("skips ignored directory names", async () => {
    tree.gitRepo("app");
    tree.gitRepo("app-modules-host/node_modules/pkg");
    expect(await discoverNames(options())).toEqual(["app"]);
  });

  it("respects maxDepth", async () => {
    tree.gitRepo("a/b/c/deep");
    expect(await discoverNames(options({ maxDepth: 2 }))).toEqual([]);
    expect(await discoverNames(options({ maxDepth: 4 }))).toEqual(["deep"]);
  });

  it("does not follow symlinked directories by default", async () => {
    tree.gitRepo("real/repo");
    tree.symlink("linkfarm/mirror", "real");
    // Only the real repo is found; the symlinked path is not traversed.
    const repos = await discoverRepositories(options());
    expect(repos.map((r) => r.path).some((p) => p.includes("linkfarm"))).toBe(false);
    expect(repos.map((r) => r.name)).toEqual(["repo"]);
  });

  it("terminates on symlink cycles when following symlinks", async () => {
    tree.gitRepo("root/repo");
    // Create a cycle: root/loop -> root.
    tree.symlink("root/loop", "root");
    const repos = await discoverRepositories(options({ followSymlinks: true, maxDepth: 20 }));
    // Must complete and find the repo exactly once despite the cycle.
    expect(repos.filter((r) => r.name === "repo")).toHaveLength(1);
  });

  it("handles unreadable directories without throwing", async () => {
    tree.gitRepo("visible");
    const locked = tree.dir("locked");
    tree.gitRepo("locked/hidden");
    chmodSync(locked, 0o000);
    try {
      const names = await discoverNames(options());
      // The visible repo is found; the locked subtree is skipped gracefully.
      expect(names).toContain("visible");
      expect(names).not.toContain("hidden");
    } finally {
      chmodSync(locked, 0o755);
    }
  });

  it("reports progress via onDiscover", async () => {
    tree.gitRepo("one");
    tree.gitRepo("two");
    const totals: number[] = [];
    await discoverRepositories(options({ onDiscover: (_repo, total) => totals.push(total) }));
    expect(totals).toEqual([1, 2]);
  });

  it("aborts promptly when signalled", async () => {
    tree.gitRepo("a");
    tree.gitRepo("b");
    const controller = new AbortController();
    controller.abort();
    const repos = await discoverRepositories(options({ signal: controller.signal }));
    expect(repos).toEqual([]);
  });
});
