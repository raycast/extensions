import { describe, expect, it } from "vitest";
import { groupByRepo, shortRepoName } from "../src/lib/groupByRepo";
import { PullRequest } from "../src/github/types";

const pr = (id: string, repo: string) => ({ id, repo }) as PullRequest;

describe("groupByRepo", () => {
  it("groups PRs by repo preserving first-seen and within-group order", () => {
    const prs = [
      pr("1", "acme/a"),
      pr("2", "acme/b"),
      pr("3", "acme/a"),
    ];
    expect(groupByRepo(prs)).toEqual([
      { repo: "acme/a", pullRequests: [prs[0], prs[2]] },
      { repo: "acme/b", pullRequests: [prs[1]] },
    ]);
  });

  it("returns an empty array for no PRs", () => {
    expect(groupByRepo([])).toEqual([]);
  });
});

describe("shortRepoName", () => {
  it("strips the org prefix", () => {
    expect(shortRepoName("acme/web")).toBe(
      "web",
    );
  });

  it("returns the input when there is no slash", () => {
    expect(shortRepoName("web")).toBe("web");
  });
});
