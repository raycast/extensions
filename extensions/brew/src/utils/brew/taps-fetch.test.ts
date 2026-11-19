/**
 * The tap fetchers that run brew, against a stubbed `execBrew`. The stub
 * answers `brew info` the way Homebrew 7.0.6 does: one unknown name in a batch
 * fails the whole call with exit 1 and "No available formula or cask".
 */

import { describe, expect, it, vi } from "vitest";
import { BrewLockError } from "../errors";
import type { ExecError } from "../types";

const brew = vi.hoisted(() => ({
  broken: new Set<string>(),
  lock: false,
  calls: [] as string[],
}));

vi.mock("./commands", () => ({
  execBrew: async (cmd: string) => {
    brew.calls.push(cmd);
    if (brew.lock) throw new BrewLockError("Another brew process is already running");
    const names = cmd.split(" ").filter((w) => w.split("/").length === 3);
    const bad = names.find((n) => brew.broken.has(n));
    if (bad) {
      const err: ExecError = Object.assign(new Error(`Command failed: brew ${cmd}`), {
        code: 1,
        stdout: "",
        stderr: `Error: No available formula or cask with the name "${bad}".`,
      });
      throw err;
    }
    const cask = cmd.includes("--cask");
    const records = names.map((n) => ({
      name: n.split("/")[2],
      token: n.split("/")[2],
      tap: n.split("/").slice(0, 2).join("/"),
    }));
    return { stdout: JSON.stringify({ formulae: cask ? [] : records, casks: cask ? records : [] }), stderr: "" };
  },
}));

const { brewFetchTapPackages, brewFetchQualifiedPackage } = await import("./taps");

const tap = (name: string, formulae: string[], casks: string[] = []) =>
  ({
    name,
    formula_names: formulae.map((f) => `${name}/${f}`),
    cask_tokens: casks.map((c) => `${name}/${c}`),
  }) as never;

function reset() {
  brew.broken = new Set();
  brew.lock = false;
  brew.calls = [];
}

describe("brewFetchTapPackages", () => {
  it("loads every tap in one call per kind", async () => {
    reset();
    const result = await brewFetchTapPackages([tap("a/one", ["x", "y"]), tap("b/two", ["z"], ["app"])]);
    expect(result.formulae.map((f) => f.name)).toEqual(["x", "y", "z"]);
    expect(result.casks.map((c) => c.token)).toEqual(["app"]);
    expect(result.unavailable).toEqual([]);
    expect(brew.calls).toHaveLength(2);
  });

  it("keeps every other package when one name will not load", async () => {
    reset();
    brew.broken.add("b/two/stale");
    const result = await brewFetchTapPackages([tap("a/one", ["x", "y"]), tap("b/two", ["z", "stale"])]);
    expect(result.formulae.map((f) => f.name).sort()).toEqual(["x", "y", "z"]);
    expect(result.unavailable).toEqual(["b/two/stale"]);
  });

  it("does not split a batch that failed for a reason other than a name", async () => {
    reset();
    brew.lock = true;
    await expect(brewFetchTapPackages([tap("a/one", ["x", "y"])])).rejects.toBeInstanceOf(BrewLockError);
    expect(brew.calls).toHaveLength(1);
  });
});

describe("brewFetchQualifiedPackage", () => {
  it("is undefined when the tap has no such package", async () => {
    reset();
    brew.broken.add("steipete/tap/not-there");
    await expect(brewFetchQualifiedPackage("steipete/tap/not-there")).resolves.toBeUndefined();
  });

  it("still throws when brew fails for another reason", async () => {
    reset();
    brew.lock = true;
    await expect(brewFetchQualifiedPackage("steipete/tap/birdclaw")).rejects.toBeInstanceOf(BrewLockError);
  });
});
