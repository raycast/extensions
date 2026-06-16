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
    repository: {
      nameWithOwner: "acme/api",
      viewerDefaultMergeMethod: "SQUASH",
      autoMergeAllowed: true,
    },
    reviewDecision: "REVIEW_REQUIRED",
    mergeStateStatus: "BLOCKED",
    autoMergeRequest: null,
    comments: { totalCount: 3 },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "PENDING" } } }] },
    latestReviews: { nodes: [] },
    reviewRequests: { nodes: [] },
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
      autoMergeAllowed: true,
      viewerHasApproved: false,
      comments: 3,
      reviewers: [],
    });
  });

  it("detects an existing APPROVED review by the viewer", () => {
    const pr = mapPullRequest(
      node({
        latestReviews: {
          nodes: [
            {
              author: { login: "octocat", avatarUrl: "https://avatars/octocat.png" },
              state: "APPROVED",
            },
          ],
        },
      }),
      "octocat",
    );
    expect(pr.viewerHasApproved).toBe(true);
  });

  it("builds the reviewers list from requests and submitted reviews", () => {
    const pr = mapPullRequest(
      node({
        reviewRequests: {
          nodes: [
            {
              requestedReviewer: {
                __typename: "User",
                login: "alice",
                avatarUrl: "https://avatars/alice.png",
              },
            },
          ],
        },
        latestReviews: {
          nodes: [
            {
              author: { login: "bob", avatarUrl: "https://avatars/bob.png" },
              state: "APPROVED",
            },
          ],
        },
      }),
      "octocat",
    );
    expect(pr.reviewers).toEqual([
      {
        type: "user",
        login: "alice",
        avatarUrl: "https://avatars/alice.png",
        status: "pending",
      },
      {
        type: "user",
        login: "bob",
        avatarUrl: "https://avatars/bob.png",
        status: "approved",
      },
    ]);
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
