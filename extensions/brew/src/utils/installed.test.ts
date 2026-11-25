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
import { InstalledFilterType } from "../components/filter";
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
  it("unions keg runtime deps with cask formula deps, normalizing tap-qualified names", () => {
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
  const names = (shown: ReturnType<typeof showInstalledPackages>) => ({
    formulae: shown.formulae.map((f) => f.name),
    dependencies: shown.dependencies.map((f) => f.name),
    pinnedFormulae: shown.pinnedFormulae.map((f) => f.name),
    casks: shown.casks.map((c) => c.token),
  });

  it("All splits on-request formulae from dependencies and shows everything", () => {
    expect(names(showInstalledPackages(map, InstalledFilterType.all))).toEqual({
      formulae: ["node"],
      dependencies: ["fmt"],
      pinnedFormulae: ["openssl@3"],
      casks: ["iterm2"],
    });
  });

  it("Installed by You drops dependencies but keeps pins, which are a choice", () => {
    expect(names(showInstalledPackages(map, InstalledFilterType.yours))).toEqual({
      formulae: ["node"],
      dependencies: [],
      pinnedFormulae: ["openssl@3"],
      casks: ["iterm2"],
    });
  });

  it("Formulae shows the formulae you installed, not dependencies or casks", () => {
    expect(names(showInstalledPackages(map, InstalledFilterType.formulae))).toEqual({
      formulae: ["node"],
      dependencies: [],
      pinnedFormulae: [],
      casks: [],
    });
  });

  it("Dependencies shows only dependencies, pinned ones included", () => {
    expect(names(showInstalledPackages(map, InstalledFilterType.dependencies))).toEqual({
      formulae: [],
      dependencies: ["fmt"],
      pinnedFormulae: ["openssl@3"],
      casks: [],
    });
  });

  it("Casks shows only casks", () => {
    expect(names(showInstalledPackages(map, InstalledFilterType.casks))).toEqual({
      formulae: [],
      dependencies: [],
      pinnedFormulae: [],
      casks: ["iterm2"],
    });
  });

  it("returns empty arrays when nothing is installed yet", () => {
    const { formulae, dependencies } = showInstalledPackages(undefined, InstalledFilterType.all);
    expect(formulae).toEqual([]);
    expect(dependencies).toEqual([]);
  });
});

// Homebrew keeps a build dependency while something installed would need it to
// build again (`build_dependents_by_name`, installed_dependents.rb), and from
// 7.0.16 `brew uninstall` refuses to remove it. Shapes from this Mac's
// `brew info --json=v2 --installed` (7.0.16): `dutis` and `omlx` were built
// from source with `build_dependencies: ["rust"]`; `rust` was poured from a
// bottle and installed only as a dependency.
describe("build dependencies Homebrew keeps", () => {
  const sourceKeg = (version: string, onRequest: boolean): InstalledVersion => ({
    ...keg(version, onRequest, []),
    poured_from_bottle: false,
  });
  const bottleKeg = (version: string, onRequest: boolean): InstalledVersion => ({
    ...keg(version, onRequest, []),
    poured_from_bottle: true,
  });
  const rust = formula({ name: "rust", installed: [bottleKeg("1.100.0", false)] });

  it("keeps a build dependency of a formula built from source", () => {
    const dutis = formula({ name: "dutis", build_dependencies: ["rust"], installed: [sourceKeg("0.5", true)] });
    const dependedOn = dependedOnNames(installedMap([dutis, rust]));
    expect(isUnusedDependency(rust, dependedOn)).toBe(false);
  });

  it("does not keep a build dependency of a formula poured from a bottle", () => {
    const jq = formula({ name: "jq", build_dependencies: ["rust"], installed: [bottleKeg("1.8.2", true)] });
    expect(isUnusedDependency(rust, dependedOnNames(installedMap([jq, rust])))).toBe(true);
  });

  it("keeps a build dependency of a formula that has no bottle to pour", () => {
    const tool = formula({
      name: "tool",
      versions: { stable: "1.0", bottle: false },
      build_dependencies: ["rust"],
      installed: [bottleKeg("1.0", true)],
    });
    expect(isUnusedDependency(rust, dependedOnNames(installedMap([tool, rust])))).toBe(false);
  });

  it("keeps a build dependency that was itself built from source", () => {
    const cmake = formula({ name: "cmake", installed: [sourceKeg("4.1", false)] });
    const jq = formula({ name: "jq", build_dependencies: ["cmake"], installed: [bottleKeg("1.8.2", true)] });
    expect(isUnusedDependency(cmake, dependedOnNames(installedMap([jq, cmake])))).toBe(false);
  });

  it("matches a tap-qualified build dependency by its short name", () => {
    const local = formula({ name: "rust", tap: "acme/tap", installed: [bottleKeg("1.0", false)] });
    const dutis = formula({
      name: "dutis",
      build_dependencies: ["acme/tap/rust"],
      installed: [sourceKeg("0.5", true)],
    });
    expect(isUnusedDependency(local, dependedOnNames(installedMap([dutis, local])))).toBe(false);
  });
});

// Homebrew checks the build dependencies of the spec that was installed; for a
// `--HEAD` keg the JSON carries those under `head_dependencies`.
describe("build dependencies of a HEAD install", () => {
  it("keeps a build dependency declared only for HEAD", () => {
    const autoconf = formula({
      name: "autoconf",
      installed: [{ ...keg("2.72", false, []), poured_from_bottle: true }],
    });
    const tool = formula({
      name: "tool",
      build_dependencies: [],
      head_dependencies: { build_dependencies: ["autoconf"] },
      installed: [{ ...keg("HEAD-1a2b3c4", true, []), poured_from_bottle: false }],
    });
    expect(isUnusedDependency(autoconf, dependedOnNames(installedMap([tool, autoconf])))).toBe(false);
  });
});
