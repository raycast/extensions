import { describe, expect, it } from "vitest";
import { primaryMergeAction } from "../src/lib/primaryMergeAction";
import { PullRequest } from "../src/github/types";
import { MergeStateStatus } from "../src/lib/mergeReadiness";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    state: "OPEN",
    isDraft: false,
    mergeStateStatus: "CLEAN" as MergeStateStatus,
    autoMergeEnabled: false,
    ...overrides,
  }) as PullRequest;

describe("primaryMergeAction", () => {
  it("merges when the PR is mergeable now", () => {
    expect(primaryMergeAction(pr({ mergeStateStatus: "CLEAN" }))).toBe("merge");
  });

  it("enables auto-merge when not mergeable yet", () => {
    expect(primaryMergeAction(pr({ mergeStateStatus: "BLOCKED" }))).toBe(
      "enable-auto-merge",
    );
  });

  it("merges (with confirmation) when only non-required checks fail", () => {
    expect(primaryMergeAction(pr({ mergeStateStatus: "UNSTABLE" }))).toBe(
      "merge",
    );
  });

  it("does nothing (falls back to open) on conflicts auto-merge can't fix", () => {
    expect(primaryMergeAction(pr({ mergeStateStatus: "DIRTY" }))).toBe("none");
  });

  it("does nothing when mergeability is still unknown", () => {
    expect(primaryMergeAction(pr({ mergeStateStatus: "UNKNOWN" }))).toBe("none");
  });

  it("does nothing when auto-merge is already armed and not yet mergeable", () => {
    expect(
      primaryMergeAction(
        pr({ mergeStateStatus: "BLOCKED", autoMergeEnabled: true }),
      ),
    ).toBe("none");
  });

  it("does nothing on drafts", () => {
    expect(primaryMergeAction(pr({ isDraft: true }))).toBe("none");
  });
});
