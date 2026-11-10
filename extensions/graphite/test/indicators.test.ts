import { describe, expect, it } from "vitest";
import type { PullRequestStatus } from "../src/lib/github";
import {
  checksIndicator,
  conversationsIndicator,
  isReadyToMerge,
  mergeIndicator,
  reviewIndicator,
  viewerReviewIndicator,
} from "../src/lib/indicators";

function status(overrides: Partial<PullRequestStatus> = {}): PullRequestStatus {
  return {
    isDraft: false,
    reviewDecision: null,
    checks: null,
    unresolvedThreads: 0,
    approvalsWithComments: [],
    viewerReview: null,
    viewerDidAuthor: false,
    hasConflicts: false,
    ...overrides,
  };
}

describe("isReadyToMerge", () => {
  it.each([
    { mergeability: "READY_TO_MERGE", expected: true },
    { mergeability: "READY_TO_MERGE_AS_STACK", expected: true },
    { mergeability: "NEEDS_APPROVALS", expected: false },
    { mergeability: undefined, expected: false },
  ])("recognizes $mergeability", ({ mergeability, expected }) => {
    expect(isReadyToMerge(mergeability)).toBe(expected);
  });
});

describe("checksIndicator", () => {
  it.each([
    { checks: "SUCCESS", expected: { label: "Checks passed", color: "Green", icon: "CheckCircle" } },
    { checks: "FAILURE", expected: { label: "Checks failing", color: "Red", icon: "XMarkCircle" } },
    { checks: "ERROR", expected: { label: "Checks failing", color: "Red", icon: "XMarkCircle" } },
    { checks: "PENDING", expected: { label: "Checks running", color: "Yellow", icon: "Clock" } },
    { checks: "EXPECTED", expected: { label: "Checks running", color: "Yellow", icon: "Clock" } },
    { checks: null, expected: undefined },
  ])("represents $checks", ({ checks, expected }) => {
    expect(checksIndicator(checks)).toEqual(expected);
  });
});

describe("reviewIndicator", () => {
  it.each([
    { decision: "APPROVED", expected: { label: "Approved", color: "Green", icon: "CheckCircle" } },
    { decision: "CHANGES_REQUESTED", expected: { label: "Changes requested", color: "Red", icon: "ExclamationMark" } },
    { decision: "REVIEW_REQUIRED", expected: { label: "Review required", color: "SecondaryText", icon: "Eye" } },
    { decision: null, expected: undefined },
  ])("represents $decision", ({ decision, expected }) => {
    expect(reviewIndicator(decision)).toEqual(expected);
  });
});

describe("mergeIndicator", () => {
  it.each([
    { mergeability: "READY_TO_MERGE", expected: { label: "Ready to merge", color: "Green", icon: "ArrowRightCircle" } },
    { mergeability: "QUEUED_TO_MERGE", expected: { label: "Merging", color: "Purple", icon: "ArrowRightCircle" } },
    { mergeability: "MERGE_CONFLICTS", expected: { label: "Merge conflicts", color: "Red", icon: "Warning" } },
    { mergeability: "MERGED", expected: undefined },
    { mergeability: undefined, expected: undefined },
    {
      mergeability: "SOME_NEW_STATUS",
      expected: { label: "Some new status", color: "SecondaryText", icon: "Hourglass" },
    },
  ])("represents $mergeability", ({ mergeability, expected }) => {
    expect(mergeIndicator(mergeability)).toEqual(expected);
  });
});

describe("conversationsIndicator", () => {
  const approvalsWithComments: PullRequestStatus["approvalsWithComments"] = [
    { state: "APPROVED", body: "One suggestion.", author: { login: "reviewer" } },
  ];

  it("prioritizes unresolved comments over approvals with comments", () => {
    expect(conversationsIndicator(status({ unresolvedThreads: 2, approvalsWithComments }))).toEqual({
      label: "2 unresolved comments",
      color: "Orange",
      icon: "SpeechBubbleActive",
    });
  });

  it("shows approvals with comments when no threads are unresolved", () => {
    expect(conversationsIndicator(status({ approvalsWithComments }))).toEqual({
      label: "Approved with comments",
      color: "Blue",
      icon: "SpeechBubble",
      tooltip: "reviewer approved and left comments",
    });
  });

  it("omits an indicator when there are no conversations", () => {
    expect(conversationsIndicator(status())).toBeUndefined();
  });
});

describe("viewerReviewIndicator", () => {
  it("omits the viewer's review on an authored PR", () => {
    expect(viewerReviewIndicator(status({ viewerDidAuthor: true, viewerReview: "APPROVED" }))).toBeUndefined();
  });

  it.each([
    { viewerReview: "APPROVED", expected: { label: "You approved", color: "Green", icon: "Checkmark" } },
    { viewerReview: "CHANGES_REQUESTED", expected: { label: "You requested changes", color: "Red", icon: "Undo" } },
    { viewerReview: "COMMENTED", expected: { label: "You commented", color: "SecondaryText", icon: "SpeechBubble" } },
    { viewerReview: "PENDING", expected: undefined },
    { viewerReview: null, expected: undefined },
  ])("represents $viewerReview", ({ viewerReview, expected }) => {
    expect(viewerReviewIndicator(status({ viewerReview }))).toEqual(expected);
  });
});

describe("conversationsIndicator with truncated threads", () => {
  it("shows a lower bound when more threads exist than were fetched", () => {
    expect(conversationsIndicator(status({ unresolvedThreads: 3, threadsTruncated: true }))?.label).toBe(
      "3+ unresolved comments",
    );
  });

  it("never implies everything is resolved when threads were truncated", () => {
    expect(conversationsIndicator(status({ unresolvedThreads: 0, threadsTruncated: true }))?.label).toBe(
      "Too many comment threads to check",
    );
  });
});
