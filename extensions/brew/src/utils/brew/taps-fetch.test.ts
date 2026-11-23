/**
 * The tap fetchers that run brew, against a stubbed `execBrew`. The stub
 * answers `brew info` the way Homebrew 7.0.6 does: one unknown name in a batch
 * fails the whole call with exit 1 and "No available formula or cask". From
 * 7.0.14 it also refuses to load a package from an untrusted tap
 * ("Refusing to load cask … from untrusted tap …"), which fails a batch the
 * same way.
 */

import { describe, expect, it, vi } from "vitest";
import { BrewLockError } from "../errors";
import type { ExecError } from "../types";

const brew = vi.hoisted(() => ({
  broken: new Set<string>(),
  refused: new Set<string>(),
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
    const refused = names.find((n) => brew.refused.has(n));
    if (refused) {
      const tapName = refused.split("/").slice(0, 2).join("/");
      throw Object.assign(new Error(`Command failed: brew ${cmd}`), {
        code: 1,
        stdout: "",
        stderr: `Error: Refusing to load cask ${refused} from untrusted tap ${tapName}.\n`,
      });
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

const { brewFetchTapPackages, brewFetchQualifiedPackage, tapPackageKind } = await import("./taps");

const tap = (name: string, formulae: string[], casks: string[] = []) =>
  ({
    name,
    formula_names: formulae.map((f) => `${name}/${f}`),
    cask_tokens: casks.map((c) => `${name}/${c}`),
  }) as never;

function reset() {
  brew.broken = new Set();
  brew.refused = new Set();
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

  it("never asks brew to load a package from an untrusted tap, and lists it instead", async () => {
    reset();
    const untrusted = Object.assign(tap("d/tap", ["tool"], ["search", "kept"]), {
      trusted: false,
      trustedPackages: ["d/tap/kept"],
    });
    const result = await brewFetchTapPackages([tap("a/one", ["x"]), untrusted]);
    expect(result.formulae.map((f) => f.name)).toEqual(["x"]);
    expect(result.casks.map((c) => c.token)).toEqual(["kept"]);
    expect(result.untrusted).toEqual({ formulae: ["d/tap/tool"], casks: ["d/tap/search"] });
    expect(brew.calls.join(" ")).not.toMatch(/d\/tap\/(tool|search)/);
  });

  it("keeps every other package when brew refuses one as untrusted", async () => {
    reset();
    brew.refused.add("d/tap/search");
    const result = await brewFetchTapPackages([tap("a/one", [], ["app"]), tap("d/tap", [], ["search"])]);
    expect(result.casks.map((c) => c.token)).toEqual(["app"]);
    expect(result.untrusted).toEqual({ formulae: [], casks: ["d/tap/search"] });
    expect(result.unavailable).toEqual([]);
  });

  it("does not split a batch that failed for a reason other than a name", async () => {
    reset();
    brew.lock = true;
    await expect(brewFetchTapPackages([tap("a/one", ["x", "y"])])).rejects.toBeInstanceOf(BrewLockError);
    expect(brew.calls).toHaveLength(1);
  });
});

describe("tapPackageKind", () => {
  const both = tap("d/tap", ["same", "tool"], ["same", "search"]);
  it("reads the kind from tap-info's lists", () => {
    expect(tapPackageKind(both, "d/tap/search")).toBe("cask");
    expect(tapPackageKind(both, "d/tap/tool")).toBe("formula");
  });
  it("resolves a name in both lists to the formula unless --cask asked for the cask", () => {
    expect(tapPackageKind(both, "d/tap/same")).toBe("formula");
    expect(tapPackageKind(both, "d/tap/same", true)).toBe("cask");
  });
  it("is undefined for a name in neither list, or not a cask when --cask asked", () => {
    expect(tapPackageKind(both, "d/tap/alias")).toBeUndefined();
    expect(tapPackageKind(both, "d/tap/tool", true)).toBeUndefined();
  });
  it("ignores case, as brew does", () => {
    expect(tapPackageKind(both, "D/Tap/Search")).toBe("cask");
  });
});

describe("brewFetchQualifiedPackage", () => {
  it("is undefined when the tap has no such package", async () => {
    reset();
    brew.broken.add("steipete/tap/not-there");
    await expect(brewFetchQualifiedPackage("steipete/tap/not-there")).resolves.toBeUndefined();
  });

  it("asks for the kind it was told, so a same-named package of the other kind is never loaded", async () => {
    reset();
    await brewFetchQualifiedPackage("d/tap/same", false);
    await brewFetchQualifiedPackage("d/tap/same", true);
    await brewFetchQualifiedPackage("d/tap/same");
    expect(brew.calls.map((c) => c.split(" ")[2])).toEqual(["--formula", "--cask", ""]);
  });

  it("still throws when brew fails for another reason", async () => {
    reset();
    brew.lock = true;
    await expect(brewFetchQualifiedPackage("steipete/tap/birdclaw")).rejects.toBeInstanceOf(BrewLockError);
  });
});
