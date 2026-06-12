import { describe, expect, it } from "vitest";
import { canApprove } from "../src/lib/canApprove";
import { PullRequest } from "../src/github/types";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    authorLogin: "someone",
    viewerHasApproved: false,
    ...overrides,
  }) as PullRequest;

describe("canApprove", () => {
  it("allows approving someone else's not-yet-approved PR", () => {
    expect(canApprove(pr(), "octocat")).toBe(true);
  });

  it("rejects when the viewer is the author", () => {
    expect(canApprove(pr({ authorLogin: "octocat" }), "octocat")).toBe(
      false,
    );
  });

  it("rejects when the viewer already approved", () => {
    expect(canApprove(pr({ viewerHasApproved: true }), "octocat")).toBe(
      false,
    );
  });

  it("rejects when the viewer login is unknown", () => {
    expect(canApprove(pr(), undefined)).toBe(false);
  });
});
