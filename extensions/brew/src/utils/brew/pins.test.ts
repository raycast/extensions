import { describe, expect, it } from "vitest";
import { isPinnedPackage, pinAliases, pinnedBeforeUpgrade } from "./helpers";
import type { Cask, Formula } from "../types";

// From Homebrew 7.0.15 (Homebrew/brew#24655) a pin counts under any of a
// formula's `possible_names` (`FormulaPin#path`): its name, old names and
// aliases. A keg left in an alias's rack (`Cellar/postgresql`) is pinned at
// `var/homebrew/pinned/postgresql`, not under the formula's current name.
describe("isPinnedPackage under other names", () => {
  const pins = { formulae: new Set(["postgresql"]), casks: new Set<string>() };

  it("finds a pin stored under an alias", () => {
    expect(isPinnedPackage(pins, "postgresql@17", false, ["postgresql"])).toBe(true);
  });

  it("still misses without the other names, and for an unrelated formula", () => {
    expect(isPinnedPackage(pins, "postgresql@17", false)).toBe(false);
    expect(isPinnedPackage(pins, "wget", false, ["gnu-wget"])).toBe(false);
  });

  it("strips a tap prefix from every name", () => {
    expect(isPinnedPackage(pins, "acme/db/postgresql@17", false, ["acme/db/postgresql"])).toBe(true);
  });
});

describe("pinAliases", () => {
  it("lists a formula's old names and aliases, as brew's possible_names does", () => {
    const formula = { name: "app@2", aliases: ["app"], oldnames: ["old-app"] } as Formula;
    expect(pinAliases(formula)).toEqual(["old-app", "app"]);
  });

  it("tolerates a search-index record with no oldnames, and a bare name", () => {
    expect(pinAliases({ name: "x", aliases: ["y"] } as Formula)).toEqual(["y"]);
    expect(pinAliases({ name: "x" })).toEqual([]);
  });

  it("is empty for a cask: brew's alias pin lookup is formula-only", () => {
    expect(pinAliases({ token: "firefox", name: ["Firefox"] } as unknown as Cask)).toEqual([]);
  });
});

// `brew outdated --json=v2` carries no aliases, so the disk check alone misses
// `postgresql@17` pinned as `postgresql`. Brew's own `pinned` on that record is
// fresh, and a view that never unpins trusts it.
describe("pinnedBeforeUpgrade", () => {
  const pins = { formulae: new Set(["postgresql"]), casks: new Set<string>() };
  const outdated = { name: "postgresql@17", pinned: true } as unknown as Formula;

  it("trusts brew's pinned flag where nothing unpins", () => {
    expect(pinnedBeforeUpgrade(pins, outdated, { allowUnpin: false })).toBe(true);
  });

  it("goes by the pin directory alone where the row may unpin", () => {
    expect(pinnedBeforeUpgrade(pins, outdated, { allowUnpin: true })).toBe(false);
  });

  it("never applies brew's formula flag to a cask", () => {
    const cask = { token: "postgresql@17", pinned: true, name: ["Postgres"] } as unknown as Cask;
    expect(pinnedBeforeUpgrade(pins, cask, { allowUnpin: false })).toBe(false);
  });

  it("still finds a pin on disk", () => {
    const record = { name: "postgresql@17", pinned: false, aliases: ["postgresql"] } as unknown as Formula;
    expect(pinnedBeforeUpgrade(pins, record, { allowUnpin: true })).toBe(true);
  });
});
