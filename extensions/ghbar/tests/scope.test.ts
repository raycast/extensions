import { describe, expect, it } from "vitest";
import { buildQueries } from "../src/core/query";
import {
  ScopeOverride,
  applyScope,
  decodeScopeOverride,
  effectiveFilterMode,
  effectiveOrganizations,
  effectiveRepoList,
  emptyScopeOverride,
  encodeScopeOverride,
  isEmptyScopeOverride,
  toggle,
} from "../src/core/scope";
import { DEFAULT_SETTINGS, Settings } from "../src/core/settings";

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function override(overrides: Partial<ScopeOverride> = {}): ScopeOverride {
  return { ...emptyScopeOverride(), ...overrides };
}

describe("toggle", () => {
  it("adds when absent, removes when present", () => {
    expect(toggle([], "a")).toEqual(["a"]);
    expect(toggle(["a"], "a")).toEqual([]);
    expect(toggle(["a", "b"], "b")).toEqual(["a"]);
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
  });
});

describe("applyScope", () => {
  it("an empty selection leaves the preference untouched", () => {
    const base = settings({ organizations: ["acme"], repoList: ["a/b"], repoListIsAllowList: true });
    expect(applyScope(base, emptyScopeOverride())).toEqual(base);
  });

  it("selected organizations replace the preference", () => {
    const base = settings({ organizations: ["fromPrefs"] });
    expect(applyScope(base, override({ organizations: ["picked"] })).organizations).toEqual(["picked"]);
  });

  it("an empty ARRAY is not the same as null", () => {
    // An empty array means "I selected none", a valid choice; null means
    // "not chosen here, let the preference win".
    const base = settings({ organizations: ["fromPrefs"] });
    expect(applyScope(base, override({ organizations: [] })).organizations).toEqual([]);
    expect(applyScope(base, override({ organizations: null })).organizations).toEqual(["fromPrefs"]);
  });

  it("allow mode sets up an allow-list", () => {
    const result = applyScope(settings(), override({ filterMode: "allow", repoList: ["a/b"] }));
    expect(result.repoListIsAllowList).toBe(true);
    expect(result.repoList).toEqual(["a/b"]);
  });

  it("deny mode sets up a deny-list", () => {
    const result = applyScope(settings(), override({ filterMode: "deny", repoList: ["a/noisy"] }));
    expect(result.repoListIsAllowList).toBe(false);
    expect(result.repoList).toEqual(["a/noisy"]);
  });

  it("off mode makes the list INERT without erasing the selection", () => {
    // The picks must survive toggling the mode off and on, so they stay in
    // the override and only reach `Settings` as an empty list.
    const picked = override({ filterMode: "off", repoList: ["a/b", "a/c"] });
    expect(applyScope(settings(), picked).repoList).toEqual([]);
    expect(picked.repoList).toEqual(["a/b", "a/c"]);
  });

  it("off mode also turns off an allow-list from the preferences", () => {
    const base = settings({ repoList: ["a/b"], repoListIsAllowList: true });
    const result = applyScope(base, override({ filterMode: "off" }));
    expect(result.repoListIsAllowList).toBe(false);
    expect(result.repoList).toEqual([]);
    expect(buildQueries(result).allowListEmpty).toBe(false);
  });

  it("with no mode chosen the repository fields are untouched", () => {
    const base = settings({ repoList: ["a/b"], repoListIsAllowList: true });
    const result = applyScope(base, override({ organizations: ["x"] }));
    expect(result.repoListIsAllowList).toBe(true);
    expect(result.repoList).toEqual(["a/b"]);
  });

  it("allow mode with an empty selection raises allowListEmpty", () => {
    const result = applyScope(settings(), override({ filterMode: "allow", repoList: [] }));
    expect(buildQueries(result).allowListEmpty).toBe(true);
  });

  it("leaves section and filter settings alone", () => {
    const base = settings({ showBots: true, showIssues: false, maxRowsPerSection: 20 });
    const result = applyScope(base, override({ organizations: ["x"], filterMode: "deny", repoList: ["a/b"] }));
    expect(result).toMatchObject({ showBots: true, showIssues: false, maxRowsPerSection: 20 });
  });
});

describe("effective values", () => {
  it("filter mode comes from the selection, else from the preferences", () => {
    expect(effectiveFilterMode(emptyScopeOverride(), settings())).toBe("off");
    expect(effectiveFilterMode(emptyScopeOverride(), settings({ repoList: ["a/b"] }))).toBe("deny");
    expect(
      effectiveFilterMode(emptyScopeOverride(), settings({ repoList: ["a/b"], repoListIsAllowList: true })),
    ).toBe("allow");
    expect(effectiveFilterMode(override({ filterMode: "allow" }), settings())).toBe("allow");
  });

  it("list and organizations come from the selection, else the preferences", () => {
    const base = settings({ organizations: ["o"], repoList: ["a/b"] });
    expect(effectiveOrganizations(emptyScopeOverride(), base)).toEqual(["o"]);
    expect(effectiveOrganizations(override({ organizations: [] }), base)).toEqual([]);
    expect(effectiveRepoList(emptyScopeOverride(), base)).toEqual(["a/b"]);
    expect(effectiveRepoList(override({ repoList: ["x/y"] }), base)).toEqual(["x/y"]);
  });
});

describe("isEmptyScopeOverride", () => {
  it("true when no field has been chosen", () => {
    expect(isEmptyScopeOverride(emptyScopeOverride())).toBe(true);
    expect(isEmptyScopeOverride(override({ organizations: [] }))).toBe(false);
    expect(isEmptyScopeOverride(override({ filterMode: "off" }))).toBe(false);
    expect(isEmptyScopeOverride(override({ repoList: [] }))).toBe(false);
  });
});

describe("decodeScopeOverride", () => {
  it("round-trips through encode and decode", () => {
    const original = override({ organizations: ["acme"], repoList: ["a/b"], filterMode: "deny" });
    expect(decodeScopeOverride(encodeScopeOverride(original))).toEqual(original);
  });

  it("empty and corrupt data yield an empty selection", () => {
    expect(decodeScopeOverride(undefined)).toEqual(emptyScopeOverride());
    expect(decodeScopeOverride("")).toEqual(emptyScopeOverride());
    expect(decodeScopeOverride("not json")).toEqual(emptyScopeOverride());
    expect(decodeScopeOverride("[1,2]")).toEqual(emptyScopeOverride());
  });

  it("an unrecognized filter mode becomes null", () => {
    expect(decodeScopeOverride('{"filterMode":"wat"}').filterMode).toBeNull();
  });

  it("a non-array field becomes null and non-string entries are dropped", () => {
    expect(decodeScopeOverride('{"organizations":"acme"}').organizations).toBeNull();
    expect(decodeScopeOverride('{"repoList":["a/b",5,null,"c/d"]}').repoList).toEqual(["a/b", "c/d"]);
  });

  it("an empty array does NOT become null", () => {
    // Clearing every checkbox does not mean "reset to defaults".
    expect(decodeScopeOverride('{"organizations":[]}').organizations).toEqual([]);
  });
});
