/**
 * Tests for the pure installed-view helpers: on-request vs dependency, the
 * `brew leaves` depended-on set, and the section split.
 *
 * Fixtures reproduce real `brew info --json=v2 --installed` entries captured
 * from Homebrew 7.0.1 (2026-09-14) — trimmed to the fields these helpers read.
 * Notably: `docker-compose`, `pnpm` and `railway` each carry TWO kegs on that
 * machine, `linked_keg` names the one brew actually uses, and tab runtime
 * dependencies are tap-qualified (`cameroncooke/axe/axe`).
 */

import { describe, expect, it } from "vitest";
import { InstallableFilterType } from "../components/filter";
import { dependedOnNames, isInstalledOnRequest, isLeaf, isUnusedDependency, showInstalledPackages } from "./installed";
import type { Cask, Formula, InstalledMap, InstalledVersion } from "./types";

function keg(version: string, installedOnRequest: boolean, runtimeDeps?: string[]): InstalledVersion {
  return {
    version,
    installed_on_request: installedOnRequest,
    ...(runtimeDeps
      ? { runtime_dependencies: runtimeDeps.map((full_name) => ({ full_name, version: "0" })) }
      : undefined),
  };
}

function formula(overrides: Partial<Formula> & { name: string }): Formula {
  return {
    tap: "homebrew/core",
    homepage: "https://example.com",
    versions: { stable: "1.0", bottle: true },
    outdated: false,
    license: null,
    aliases: [],
    dependencies: [],
    build_dependencies: [],
    installed: [],
    keg_only: false,
    linked_keg: null,
    pinned: false,
    ...overrides,
  };
}

function cask(overrides: Partial<Cask> & { token: string }): Cask {
  return {
    tap: "homebrew/cask",
    homepage: "https://example.com",
    versions: { stable: "1.0", bottle: false },
    outdated: false,
    name: [overrides.token],
    version: "1.0",
    auto_updates: false,
    pinned: false,
    depends_on: {},
    ...overrides,
  };
}

function installedMap(formulae: Formula[], casks: Cask[] = []): InstalledMap {
  return {
    formulae: new Map(formulae.map((f) => [f.name, f])),
    casks: new Map(casks.map((c) => [c.token, c])),
  };
}

describe("isInstalledOnRequest", () => {
  it("is true for a formula the user asked for", () => {
    expect(
      isInstalledOnRequest(formula({ name: "node", linked_keg: "25.0.0", installed: [keg("25.0.0", true)] })),
    ).toBe(true);
  });

  it("is false for a formula pulled in as a dependency", () => {
    expect(
      isInstalledOnRequest(formula({ name: "fmt", linked_keg: "12.2.0", installed: [keg("12.2.0", false)] })),
    ).toBe(false);
  });

  it("reads the LINKED keg, not the newest one and not a union over every keg", () => {
    // Two kegs that disagree, and the LINKED one is the OLDER of the two: a
    // union returns true for the wrong reason, and `installed.at(-1)` returns
    // false. Only reading `linked_keg` gives true.
    const f = formula({
      name: "pnpm",
      linked_keg: "11.23.0",
      installed: [keg("11.23.0", true), keg("11.24.0", false)],
    });
    expect(isInstalledOnRequest(f)).toBe(true);
  });

  it("falls back to the newest keg when nothing is linked", () => {
    const f = formula({
      name: "docker-compose",
      linked_keg: null,
      installed: [keg("5.4.0", false), keg("5.5.0", true)],
    });
    expect(isInstalledOnRequest(f)).toBe(true);
  });

  it("is false when no keg is installed", () => {
    expect(isInstalledOnRequest(formula({ name: "ghost" }))).toBe(false);
  });
});

describe("dependedOnNames", () => {
  it("unions keg runtime deps with cask formula deps, normalising tap-qualified names", () => {
    const names = dependedOnNames(
      installedMap(
        [formula({ name: "ada-url", linked_keg: "4.0.0", installed: [keg("4.0.0", false, ["fmt"])] })],
        [cask({ token: "gcloud-cli", depends_on: { formula: ["python@3.14", "cameroncooke/axe/axe"] } })],
      ),
    );
    expect([...names].sort()).toEqual(["axe", "fmt", "python@3.14"]);
  });

  it("reads the LINKED keg's deps only — not the newest keg's, not every keg's", () => {
    // The linked keg is again the OLDER one, so a newest-keg or union
    // implementation would surface `new-dep`.
    const names = dependedOnNames(
      installedMap([
        formula({
          name: "railway",
          linked_keg: "5.49.2",
          installed: [keg("5.49.2", false, ["old-dep"]), keg("5.49.6", false, ["new-dep"])],
        }),
      ]),
    );
    expect([...names]).toEqual(["old-dep"]);
  });

  it("contributes nothing for a keg without runtime_dependencies", () => {
    expect(dependedOnNames(installedMap([formula({ name: "fzf", installed: [keg("0.68.0", true)] })])).size).toBe(0);
  });

  it("returns an empty set for undefined input", () => {
    expect(dependedOnNames(undefined).size).toBe(0);
  });
});

describe("isLeaf", () => {
  const dependedOn = new Set(["fmt", "pnpm@12", "gsl"]);

  it("is false when matched by name", () => {
    expect(isLeaf(formula({ name: "fmt" }), dependedOn)).toBe(false);
  });

  it("is false when matched by an alias", () => {
    expect(isLeaf(formula({ name: "pnpm", aliases: ["pnpm@12"] }), dependedOn)).toBe(false);
  });

  it("is false when matched by an old name", () => {
    expect(isLeaf(formula({ name: "gnu-scientific-library", oldnames: ["gsl"] }), dependedOn)).toBe(false);
  });

  it("is true when nothing depends on it", () => {
    expect(isLeaf(formula({ name: "ada-url" }), dependedOn)).toBe(true);
  });
});

describe("isUnusedDependency", () => {
  const dependedOn = new Set(["fmt"]);

  it("is false for an on-request leaf", () => {
    expect(
      isUnusedDependency(formula({ name: "node", linked_keg: "25.0.0", installed: [keg("25.0.0", true)] }), dependedOn),
    ).toBe(false);
  });

  it("is false for a dependency something still needs", () => {
    expect(
      isUnusedDependency(formula({ name: "fmt", linked_keg: "12.2.0", installed: [keg("12.2.0", false)] }), dependedOn),
    ).toBe(false);
  });

  it("is true for a dependency nothing needs any more", () => {
    expect(
      isUnusedDependency(formula({ name: "orphan", linked_keg: "1.0", installed: [keg("1.0", false)] }), dependedOn),
    ).toBe(true);
  });
});

describe("showInstalledPackages", () => {
  const node = formula({ name: "node", linked_keg: "25.0.0", installed: [keg("25.0.0", true)] });
  const fmt = formula({ name: "fmt", linked_keg: "12.2.0", installed: [keg("12.2.0", false)] });
  const pinnedDep = formula({ name: "openssl@3", linked_keg: "3.6.0", installed: [keg("3.6.0", false)], pinned: true });
  const iterm = cask({ token: "iterm2" });
  const map = installedMap([node, fmt, pinnedDep], [iterm]);

  it("splits on-request formulae from dependencies", () => {
    const { formulae, dependencies } = showInstalledPackages(map, InstallableFilterType.all, false);
    expect(formulae.map((f) => f.name)).toEqual(["node"]);
    expect(dependencies.map((f) => f.name)).toEqual(["fmt"]);
  });

  it("empties only the dependencies when they are excluded", () => {
    const { formulae, dependencies } = showInstalledPackages(map, InstallableFilterType.all, true);
    expect(formulae.map((f) => f.name)).toEqual(["node"]);
    expect(dependencies).toEqual([]);
  });

  it("keeps a pinned dependency under pinned formulae and out of dependencies", () => {
    const { dependencies, pinnedFormulae } = showInstalledPackages(map, InstallableFilterType.all, false);
    expect(pinnedFormulae.map((f) => f.name)).toEqual(["openssl@3"]);
    expect(dependencies.map((f) => f.name)).not.toContain("openssl@3");
  });

  it("empties both formula arrays under the Casks filter", () => {
    const { formulae, dependencies, casks } = showInstalledPackages(map, InstallableFilterType.casks, false);
    expect(formulae).toEqual([]);
    expect(dependencies).toEqual([]);
    expect(casks.map((c) => c.token)).toEqual(["iterm2"]);
  });

  it("returns empty arrays and no dependencies when nothing is installed yet", () => {
    const { formulae, dependencies } = showInstalledPackages(undefined, InstallableFilterType.all, false);
    expect(formulae).toEqual([]);
    expect(dependencies).toEqual([]);
  });
});
