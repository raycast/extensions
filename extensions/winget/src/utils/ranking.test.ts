import { describe, expect, it } from "vitest";

import { calculateRelevanceScore } from "./ranking";

const git = {
  id: "Git.Git",
  name: "Git",
  version: "2.52.0",
  source: "winget" as const,
};
const githubCli = {
  id: "GitHub.cli",
  name: "GitHub CLI",
  version: "2.85.0",
  source: "winget" as const,
};
const fork = {
  id: "Fork.Fork",
  name: "Fork",
  version: "2.15.4",
  source: "winget" as const,
};

describe("calculateRelevanceScore", () => {
  it("returns 0 for non-matching query", () => {
    expect(calculateRelevanceScore(git, "zzzznotfound")).toBe(0);
  });

  it("scores exact name match highest", () => {
    const score = calculateRelevanceScore(git, "git");
    expect(score).toBeGreaterThanOrEqual(1000);
  });

  it("scores exact id match below exact name match", () => {
    const nameScore = calculateRelevanceScore(git, "git");
    const idScore = calculateRelevanceScore(
      { id: "git", name: "Something Else", version: "1.0.0", source: "winget" },
      "git",
    );
    expect(nameScore).toBeGreaterThan(idScore);
  });

  it("prioritizes exact and prefix matches over contains matches", () => {
    const packages = [git, githubCli, fork];
    const scores = packages.map((pkg) => ({
      id: pkg.id,
      score: calculateRelevanceScore(pkg, "git"),
    }));

    const sorted = scores.sort((a, b) => b.score - a.score);
    expect(sorted[0]?.id).toBe("Git.Git"); // exact name
    expect(sorted[1]?.id).toBe("GitHub.cli"); // name starts with
    expect(sorted[2]?.score).toBe(0); // Fork doesn't match
  });

  it("uses moniker for matching otherwise non-matching packages", () => {
    const score = calculateRelevanceScore(fork, "forky", {
      moniker: "forky",
      tags: ["git-client"],
    });

    expect(score).toBeGreaterThan(0);
  });

  it("gives exact moniker match a higher bonus than a prefix match", () => {
    // Same query and same base package, so the ONLY difference is the moniker
    // bonus tier: exact (+150) vs starts-with (+100).
    const exactMoniker = calculateRelevanceScore(fork, "fork", {
      moniker: "fork",
    });
    const prefixMoniker = calculateRelevanceScore(fork, "fork", {
      moniker: "forkclient",
    });

    expect(exactMoniker).toBe(prefixMoniker + 50);
  });

  it("gives tag match bonus", () => {
    const withTag = calculateRelevanceScore(fork, "fork", {
      tags: ["git-client", "fork"],
    });
    const withoutTag = calculateRelevanceScore(fork, "fork");

    expect(withTag).toBeGreaterThan(withoutTag);
  });

  it("uses alphabetical order as tie-breaker via length bonus", () => {
    const alpha = {
      id: "pkg.alpha",
      name: "Alpha Tool",
      version: "1.0.0",
      source: "winget" as const,
    };
    const gamma = {
      id: "pkg.gamma",
      name: "Gamma Tool",
      version: "1.0.0",
      source: "winget" as const,
    };

    const alphaScore = calculateRelevanceScore(alpha, "tool");
    const gammaScore = calculateRelevanceScore(gamma, "tool");

    // Same name length = same score (tie-breaking by name is done at sort level)
    expect(alphaScore).toBe(gammaScore);
  });

  it("gives length bonus for shorter names", () => {
    const shortPkg = {
      id: "a.git",
      name: "Git",
      version: "1.0.0",
      source: "winget" as const,
    };
    const longPkg = {
      id: "b.git",
      name: "Git for Windows with Extra Long Name",
      version: "1.0.0",
      source: "winget" as const,
    };

    const shortScore = calculateRelevanceScore(shortPkg, "git");
    const longScore = calculateRelevanceScore(longPkg, "git");

    expect(shortScore).toBeGreaterThan(longScore);
  });
});
