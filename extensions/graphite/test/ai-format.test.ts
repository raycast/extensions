import { describe, expect, it } from "vitest";
import type { InboxSection } from "../src/lib/api";
import { detailsForAI, inboxForAI } from "../src/lib/ai-format";
import type { PullRequestDetails, PullRequestStatus } from "../src/lib/github";

const status: PullRequestStatus = {
  isDraft: false,
  reviewDecision: "CHANGES_REQUESTED",
  checks: "FAILURE",
  unresolvedThreads: 2,
  approvalsWithComments: [],
  viewerReview: null,
  viewerDidAuthor: true,
  hasConflicts: false,
};

const section: InboxSection = {
  sectionId: "s1",
  name: "Returned to you",
  includeInTotalCount: true,
  totalUnpaginatedPrs: 30,
  prs: [
    {
      number: 7,
      title: "Retry webhooks",
      state: "OPEN",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-02T00:00:00Z",
      repo: { owner: "Acme", name: "API" },
      author: { name: null, login: "leo", avatarUrl: "" },
      reviewDecision: null,
    },
  ],
};

describe("inboxForAI", () => {
  it("joins GitHub status and Graphite mergeability by case-insensitive reference", () => {
    const [result] = inboxForAI(
      [section],
      "https://app.graphite.com",
      { "acme/api#7": status },
      { "acme/api#7": "UNRESOLVED_COMMENTS" },
    );
    expect(result.note).toMatch(/Only the 1 most recent/);
    expect(result.pullRequests[0]).toMatchObject({
      pullRequest: "Acme/API#7",
      reviewDecision: "Changes requested",
      mergeStatus: "Unresolved comments",
      checks: "failing",
      unresolvedComments: 2,
      iAmAuthor: true,
      graphiteUrl: "https://app.graphite.com/github/pr/Acme/API/7",
    });
  });

  it("omits GitHub facts it doesn't have instead of guessing", () => {
    const [result] = inboxForAI([section], "https://app.graphite.com", {}, {});
    expect(result.pullRequests[0].checks).toBeUndefined();
    expect(result.pullRequests[0].unresolvedComments).toBeUndefined();
  });
});

describe("detailsForAI", () => {
  const details: PullRequestDetails = {
    ...status,
    title: "Retry webhooks",
    body: "<!-- template -->\nAdds retries.\n" + "x".repeat(5000),
    url: "https://github.com/acme/api/pull/7",
    state: "OPEN",
    createdAt: "",
    updatedAt: "",
    additions: 10,
    deletions: 2,
    changedFiles: 3,
    baseRefName: "main",
    headRefName: "retry",
    author: { login: "leo" },
    labels: [],
    requestedReviewers: ["sofia"],
    reviews: [{ state: "CHANGES_REQUESTED", body: "Cap it", author: { login: "sofia" } }],
    commentReviews: [{ state: "COMMENTED", body: "Nice test coverage", author: { login: "noah" } }],
    unresolved: [
      { path: "retry.ts", line: 48, isOutdated: false, replies: 0, author: "sofia", body: "Cap the backoff", url: "u" },
    ],
    conversationComments: 1,
    checkRuns: [
      { name: "unit", state: "FAILURE" },
      { name: "lint", state: "SUCCESS" },
    ],
  };

  it("keeps decision-relevant facts and truncates long text", () => {
    const result = detailsForAI(details, { owner: "acme", repo: "api", number: 7 }, undefined, "READY_TO_MERGE");
    expect(result.description.startsWith("Adds retries.")).toBe(true);
    expect(result.description).toMatch(/\(truncated\)$/);
    expect(result.checks).toEqual({ summary: "failing", failing: ["unit"], running: [], passed: 1 });
    expect(result.unresolvedComments[0].location).toBe("retry.ts:48");
    expect(result.mergeStatus).toBe("Ready to merge");
    expect(result.graphiteUrl).toBeUndefined();
  });
});
