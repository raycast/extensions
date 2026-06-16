import { describe, expect, it } from "vitest";
import { menuBarTitle } from "../src/lib/menuBarTitle";
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

describe("menuBarTitle", () => {
  it("shows no badge number when nothing is awaiting review", () => {
    const result = menuBarTitle([], []);
    expect(result.title).toBeUndefined();
    expect(result.tooltip).toBe("0 to review · 0 of mine ready to merge");
  });

  it("counts review requests in the badge (with a dot) and ready-to-merge PRs in the tooltip", () => {
    const result = menuBarTitle(
      [pr(), pr()],
      [pr({ mergeStateStatus: "CLEAN" }), pr({ mergeStateStatus: "BLOCKED" })],
    );
    expect(result.title).toBe("● 2");
    expect(result.tooltip).toBe("2 to review · 1 of mine ready to merge");
  });
});
