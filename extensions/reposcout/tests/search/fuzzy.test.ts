import { describe, expect, it } from "vitest";
import { fuzzyMatch } from "../../src/search/fuzzy";

describe("fuzzyMatch", () => {
  it("returns null for an empty query or target", () => {
    expect(fuzzyMatch("", "anything")).toBeNull();
    expect(fuzzyMatch("x", "")).toBeNull();
  });

  it("returns null when the query is not a subsequence", () => {
    expect(fuzzyMatch("xyz", "RepoScout")).toBeNull();
  });

  it("scores an exact (case-insensitive) match as 1", () => {
    const match = fuzzyMatch("reposcout", "RepoScout");
    expect(match?.score).toBe(1);
  });

  it("returns matched positions in ascending order", () => {
    const match = fuzzyMatch("rs", "RepoScout");
    expect(match?.positions).toEqual([0, 4]);
  });

  it("orders exact > prefix > acronym > general subsequence", () => {
    const exact = fuzzyMatch("repo", "repo")?.score ?? 0;
    const prefix = fuzzyMatch("repo", "repository")?.score ?? 0;
    const acronym = fuzzyMatch("rs", "RepoScout")?.score ?? 0;
    const general = fuzzyMatch("rst", "RepoScoutTools")?.score ?? 0;
    const scattered = fuzzyMatch("pt", "RepoScout")?.score ?? 0;

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(acronym);
    expect(acronym).toBeGreaterThanOrEqual(general);
    expect(general).toBeGreaterThan(scattered);
  });

  it("rewards contiguous prefix matches over scattered ones", () => {
    const contiguous = fuzzyMatch("dot", "dotfiles")?.score ?? 0;
    const scattered = fuzzyMatch("dot", "d-o-t-x")?.score ?? 0;
    expect(contiguous).toBeGreaterThan(scattered);
  });

  it("treats separators as boundaries for acronym matching", () => {
    const match = fuzzyMatch("mp", "my-project");
    expect(match).not.toBeNull();
    // m at 0 (start) and p at 3 (after '-') are both boundaries.
    expect(match?.positions).toEqual([0, 3]);
  });

  it("keeps all scores within [0, 1]", () => {
    for (const target of ["RepoScout", "my-cool-repo", "a", "ABCdefGHI"]) {
      const match = fuzzyMatch("c", target);
      if (match) {
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(1);
      }
    }
  });
});
