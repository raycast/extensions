import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { utimesSync } from "node:fs";
import { refreshIndex } from "../../src/indexer/indexer";
import type { IndexStore } from "../../src/cache/index-store";
import type { GitRunner } from "../../src/git/info";
import type { DiscoveryOptions } from "../../src/filesystem/discovery";
import type { IndexingProgress, RepositoryIndex } from "../../src/types/index-state";
import { ok } from "../../src/utils/result";
import { makeTempTree, type TempTree } from "../helpers/tmp";

let tree: TempTree;

beforeEach(() => {
  tree = makeTempTree();
});
afterEach(() => {
  tree.cleanup();
});

/** An in-memory IndexStore that persists across refresh calls within a test. */
function memoryStore(): IndexStore {
  let saved: RepositoryIndex | null = null;
  return {
    load: async () => saved,
    save: async (index) => {
      saved = index;
      return true;
    },
  };
}

/** A git runner that records how many repositories it enriched. */
function countingRunner(): { runner: GitRunner; enrichedPaths: string[] } {
  const enrichedPaths: string[] = [];
  const runner: GitRunner = async (args, options) => {
    if (args[0] === "rev-parse") {
      enrichedPaths.push(options.cwd);
      return ok("main");
    }
    if (args[0] === "log") {
      return ok("1700000000");
    }
    return ok("");
  };
  return { runner, enrichedPaths };
}

function discovery(): DiscoveryOptions {
  return {
    roots: [tree.root],
    maxDepth: 10,
    ignoredDirectories: new Set(),
    followSymlinks: false,
    includeBareRepos: true,
  };
}

describe("refreshIndex", () => {
  it("discovers and enriches all repositories on a cold run", async () => {
    tree.gitRepo("alpha");
    tree.gitRepo("nested/beta");
    const store = memoryStore();
    const { runner, enrichedPaths } = countingRunner();

    const index = await refreshIndex({ discovery: discovery(), store, gitOptions: { runner } });

    expect(index.records.map((r) => r.name).sort()).toEqual(["alpha", "beta"]);
    expect(index.records.every((r) => r.branch === "main")).toBe(true);
    expect(enrichedPaths).toHaveLength(2);
  });

  it("reuses cached metadata when fingerprints are unchanged", async () => {
    tree.gitRepo("alpha");
    const store = memoryStore();

    const cold = countingRunner();
    await refreshIndex({ discovery: discovery(), store, gitOptions: { runner: cold.runner } });
    expect(cold.enrichedPaths).toHaveLength(1);

    // Second run: nothing changed on disk, so no repo should be re-enriched.
    const warm = countingRunner();
    const index = await refreshIndex({
      discovery: discovery(),
      store,
      gitOptions: { runner: warm.runner },
    });
    expect(warm.enrichedPaths).toHaveLength(0);
    expect(index.records).toHaveLength(1);
    expect(index.records[0]?.branch).toBe("main");
  });

  it("re-enriches only repositories whose Git state changed", async () => {
    const alpha = tree.gitRepo("alpha");
    tree.gitRepo("beta");
    const store = memoryStore();

    await refreshIndex({
      discovery: discovery(),
      store,
      gitOptions: { runner: countingRunner().runner },
    });

    // Touch alpha's HEAD so its fingerprint changes; beta is untouched.
    const future = new Date(Date.now() + 20_000);
    utimesSync(`${alpha}/.git/HEAD`, future, future);

    const warm = countingRunner();
    await refreshIndex({ discovery: discovery(), store, gitOptions: { runner: warm.runner } });
    expect(warm.enrichedPaths).toHaveLength(1);
    expect(warm.enrichedPaths[0]).toContain("alpha");
  });

  it("drops repositories that disappeared from disk", async () => {
    tree.gitRepo("alpha");
    const store = memoryStore();
    await refreshIndex({
      discovery: discovery(),
      store,
      gitOptions: { runner: countingRunner().runner },
    });

    tree.cleanup();
    tree = makeTempTree();
    tree.gitRepo("gamma");

    const index = await refreshIndex({
      discovery: discovery(),
      store,
      gitOptions: { runner: countingRunner().runner },
    });
    expect(index.records.map((r) => r.name)).toEqual(["gamma"]);
  });

  it("emits discovering → enriching → done progress", async () => {
    tree.gitRepo("alpha");
    const store = memoryStore();
    const phases: IndexingProgress["phase"][] = [];
    await refreshIndex({
      discovery: discovery(),
      store,
      gitOptions: { runner: countingRunner().runner },
      onProgress: (p) => phases.push(p.phase),
    });
    expect(phases[0]).toBe("discovering");
    expect(phases).toContain("enriching");
    expect(phases[phases.length - 1]).toBe("done");
  });
});
