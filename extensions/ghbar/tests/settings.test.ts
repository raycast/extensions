import { describe, expect, it } from "vitest";
import { buildQueries } from "../src/core/query";
import {
  DEFAULT_SETTINGS,
  RATE_LIMIT_LOW_THRESHOLD,
  rateLimitShows,
  settingsFromRaw,
  splitList,
  visibleSections,
} from "../src/core/settings";

describe("splitList", () => {
  it("splits on commas, trims, drops blanks", () => {
    expect(splitList("alice, bob ,, ")).toEqual(["alice", "bob"]);
    expect(splitList("  ")).toEqual([]);
    expect(splitList("")).toEqual([]);
    expect(splitList(undefined)).toEqual([]);
    expect(splitList("alice/webapp,noisy")).toEqual(["alice/webapp", "noisy"]);
  });
});

describe("settingsFromRaw", () => {
  it("empty raw input yields the defaults", () => {
    expect(settingsFromRaw({})).toEqual(DEFAULT_SETTINGS);
  });

  it("an empty accounts falls back to @me", () => {
    // Clearing it means "back to the default", not "watch nobody".
    expect(settingsFromRaw({ accounts: "" }).accounts).toEqual(["@me"]);
    expect(settingsFromRaw({ accounts: " , , " }).accounts).toEqual(["@me"]);
    expect(settingsFromRaw({ accounts: "alice, acme" }).accounts).toEqual(["alice", "acme"]);
  });

  it("the organizations list is parsed", () => {
    expect(settingsFromRaw({ organizations: "acme, widgets" }).organizations).toEqual(["acme", "widgets"]);
    expect(settingsFromRaw({}).organizations).toEqual([]);
  });

  it("the repository list is IGNORED while the filter is off", () => {
    // Otherwise a stale list keeps filtering silently after the user
    // turns the filter off.
    const s = settingsFromRaw({ repositoryFilterMode: "off", repositoryList: "alice/noisy" });
    expect(s.repoList).toEqual([]);
    expect(s.repoListIsAllowList).toBe(false);
  });

  it("allow mode sets up an allow-list", () => {
    const s = settingsFromRaw({ repositoryFilterMode: "allow", repositoryList: "alice/one, alice/two" });
    expect(s.repoList).toEqual(["alice/one", "alice/two"]);
    expect(s.repoListIsAllowList).toBe(true);
  });

  it("deny mode sets up a deny-list", () => {
    const s = settingsFromRaw({ repositoryFilterMode: "deny", repositoryList: "alice/noisy" });
    expect(s.repoList).toEqual(["alice/noisy"]);
    expect(s.repoListIsAllowList).toBe(false);
  });

  it("an unrecognized filter mode counts as off", () => {
    const s = settingsFromRaw({ repositoryFilterMode: "wat", repositoryList: "alice/noisy" });
    expect(s.repoList).toEqual([]);
    expect(s.repoListIsAllowList).toBe(false);
  });

  it("allow mode with an empty list raises allowListEmpty", () => {
    // The user said "only these" and picked nothing: the menu must say
    // "no repositories selected", not "no work waiting".
    const s = settingsFromRaw({ repositoryFilterMode: "allow", repositoryList: "" });
    expect(buildQueries(s).allowListEmpty).toBe(true);
  });

  it("numeric dropdowns are parsed", () => {
    expect(settingsFromRaw({ repoGroupThreshold: "10" }).repoGroupThreshold).toBe(10);
    expect(settingsFromRaw({ repoGroupThreshold: "0" }).repoGroupThreshold).toBe(0);
    expect(settingsFromRaw({ maxRowsPerSection: "20" }).maxRowsPerSection).toBe(20);
  });

  it("an invalid number falls back to the default", () => {
    expect(settingsFromRaw({ repoGroupThreshold: "wat" }).repoGroupThreshold).toBe(3);
    expect(settingsFromRaw({ maxRowsPerSection: "" }).maxRowsPerSection).toBe(5);
  });

  it("maxRowsPerSection is at least 1", () => {
    // A section showing 0 rows would be invisible.
    expect(settingsFromRaw({ maxRowsPerSection: "0" }).maxRowsPerSection).toBe(1);
    expect(settingsFromRaw({ maxRowsPerSection: "-5" }).maxRowsPerSection).toBe(1);
  });

  it("repoGroupThreshold never goes negative", () => {
    expect(settingsFromRaw({ repoGroupThreshold: "-1" }).repoGroupThreshold).toBe(0);
  });

  it("section toggles carry through", () => {
    const s = settingsFromRaw({
      showPullRequests: false,
      showIssues: false,
      showReviewRequested: true,
      showChangesRequested: false,
      showMyPullRequests: false,
    });
    expect([...visibleSections(s)]).toEqual(["reviewRequested"]);
  });

  it("filter toggles carry through", () => {
    expect(settingsFromRaw({ showBots: true, showDrafts: false })).toMatchObject({
      showBots: true,
      showDrafts: false,
    });
  });

  it("rate-limit visibility parses; an invalid value becomes whenLow", () => {
    expect(settingsFromRaw({ rateLimitVisibility: "always" }).rateLimitVisibility).toBe("always");
    expect(settingsFromRaw({ rateLimitVisibility: "never" }).rateLimitVisibility).toBe("never");
    expect(settingsFromRaw({ rateLimitVisibility: "wat" }).rateLimitVisibility).toBe("whenLow");
  });
});

describe("rateLimitShows", () => {
  it("never shows it at all", () => {
    expect(rateLimitShows("never", 0.01)).toBe(false);
    expect(rateLimitShows("never", 1)).toBe(false);
  });

  it("always shows it every time", () => {
    expect(rateLimitShows("always", 1)).toBe(true);
  });

  it("whenLow shows it below the threshold", () => {
    expect(rateLimitShows("whenLow", RATE_LIMIT_LOW_THRESHOLD - 0.01)).toBe(true);
    expect(rateLimitShows("whenLow", RATE_LIMIT_LOW_THRESHOLD)).toBe(false);
    expect(rateLimitShows("whenLow", 0.9)).toBe(false);
  });
});
