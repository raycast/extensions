import { describe, expect, it } from "vitest";
import { menuBarStatusLine } from "../src/lib/menuBarStatus";
import { PullRequest } from "../src/github/types";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    state: "OPEN",
    isDraft: false,
    checksState: null,
    reviewDecision: null,
    ...overrides,
  }) as PullRequest;

describe("menuBarStatusLine", () => {
  it("combines passing checks and approval", () => {
    expect(
      menuBarStatusLine(pr({ checksState: "SUCCESS", reviewDecision: "APPROVED" })),
    ).toBe("checks ✓ · approved");
  });

  it("shows an hourglass for pending checks", () => {
    expect(menuBarStatusLine(pr({ checksState: "PENDING" }))).toBe("checks ⏳");
  });

  it("shows a cross for failing or errored checks and changes requested", () => {
    expect(
      menuBarStatusLine(pr({ checksState: "FAILURE", reviewDecision: "CHANGES_REQUESTED" })),
    ).toBe("checks ✗ · changes requested");
    expect(menuBarStatusLine(pr({ checksState: "ERROR" }))).toBe("checks ✗");
  });

  it("labels drafts", () => {
    expect(menuBarStatusLine(pr({ isDraft: true }))).toBe("draft");
  });

  it("returns an empty string when there is nothing to show", () => {
    expect(menuBarStatusLine(pr())).toBe("");
  });
});
