import { describe, expect, it } from "vitest";
import { menuBarPrimaryAction } from "../src/lib/menuBarPrimaryAction";
import { PullRequest } from "../src/github/types";
import { MergeStateStatus } from "../src/lib/mergeReadiness";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    state: "OPEN",
    isDraft: false,
    authorLogin: "someone",
    viewerHasApproved: false,
    mergeStateStatus: "CLEAN" as MergeStateStatus,
    autoMergeEnabled: false,
    ...overrides,
  }) as PullRequest;

describe("menuBarPrimaryAction", () => {
  it("approves an approvable PR in the review section", () => {
    expect(menuBarPrimaryAction(pr(), "review", "octocat")).toBe("approve");
  });

  it("falls back to open when the PR can't be approved", () => {
    expect(menuBarPrimaryAction(pr({ authorLogin: "octocat" }), "review", "octocat")).toBe("open");
  });

  it("merges a ready PR in the mine section", () => {
    expect(menuBarPrimaryAction(pr({ mergeStateStatus: "CLEAN" }), "mine", "octocat")).toBe("merge");
  });

  it("enables auto-merge when a mine PR isn't ready yet", () => {
    expect(menuBarPrimaryAction(pr({ mergeStateStatus: "BLOCKED" }), "mine", "octocat")).toBe("enable-auto-merge");
  });

  it("falls back to open on conflicts and drafts", () => {
    expect(menuBarPrimaryAction(pr({ mergeStateStatus: "DIRTY" }), "mine", "octocat")).toBe("open");
    expect(menuBarPrimaryAction(pr({ isDraft: true }), "mine", "octocat")).toBe("open");
  });
});
