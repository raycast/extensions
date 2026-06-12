import { describe, expect, it } from "vitest";
import { mapPullRequest } from "../src/lib/mapPullRequest";
import { PullRequestNode } from "../src/github/types";

function node(overrides: Partial<PullRequestNode> = {}): PullRequestNode {
  return {
    id: "PR_abc",
    number: 42,
    title: "feat: something",
    url: "https://github.com/acme/api/pull/42",
    state: "OPEN",
    isDraft: false,
    updatedAt: "2026-06-12T10:00:00Z",
    headRefName: "feat/something",
    author: { login: "someone", avatarUrl: "https://avatars/someone.png" },
    repository: { nameWithOwner: "acme/api", viewerDefaultMergeMethod: "SQUASH" },
    reviewDecision: "REVIEW_REQUIRED",
    mergeStateStatus: "BLOCKED",
    autoMergeRequest: null,
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "PENDING" } } }] },
    latestReviews: { nodes: [] },
    ...overrides,
  };
}

describe("mapPullRequest", () => {
  it("maps a node to a flat PullRequest", () => {
    const pr = mapPullRequest(node(), "octocat");
    expect(pr).toEqual({
      id: "PR_abc",
      number: 42,
      title: "feat: something",
      url: "https://github.com/acme/api/pull/42",
      state: "OPEN",
      isDraft: false,
      updatedAt: "2026-06-12T10:00:00Z",
      headRefName: "feat/something",
      authorLogin: "someone",
      authorAvatarUrl: "https://avatars/someone.png",
      repo: "acme/api",
      defaultMergeMethod: "SQUASH",
      reviewDecision: "REVIEW_REQUIRED",
      mergeStateStatus: "BLOCKED",
      checksState: "PENDING",
      autoMergeEnabled: false,
      viewerHasApproved: false,
    });
  });

  it("detects an existing APPROVED review by the viewer", () => {
    const pr = mapPullRequest(
      node({ latestReviews: { nodes: [{ author: { login: "octocat" }, state: "APPROVED" }] } }),
      "octocat",
    );
    expect(pr.viewerHasApproved).toBe(true);
  });

  it("handles missing author, rollup, and commits", () => {
    const pr = mapPullRequest(
      node({ author: null, commits: { nodes: [] }, autoMergeRequest: { enabledAt: "2026-06-12T10:00:00Z" } }),
      "octocat",
    );
    expect(pr.authorLogin).toBe("ghost");
    expect(pr.authorAvatarUrl).toBe("");
    expect(pr.checksState).toBeNull();
    expect(pr.autoMergeEnabled).toBe(true);
  });
});
