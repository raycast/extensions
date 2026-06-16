import { describe, expect, it } from "vitest";
import { canApprove } from "../src/lib/canApprove";
import { PullRequest } from "../src/github/types";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    state: "OPEN",
    authorLogin: "someone",
    viewerHasApproved: false,
    ...overrides,
  }) as PullRequest;

describe("canApprove", () => {
  it("allows approving someone else's not-yet-approved PR", () => {
    expect(canApprove(pr(), "octocat")).toBe(true);
  });

  it("rejects when the viewer is the author", () => {
    expect(canApprove(pr({ authorLogin: "octocat" }), "octocat")).toBe(false);
  });

  it("rejects when the viewer already approved", () => {
    expect(canApprove(pr({ viewerHasApproved: true }), "octocat")).toBe(false);
  });

  it("rejects when the viewer login is unknown", () => {
    expect(canApprove(pr(), undefined)).toBe(false);
  });

  it("rejects closed and merged PRs (e.g. from the closed-review window)", () => {
    expect(canApprove(pr({ state: "CLOSED" }), "octocat")).toBe(false);
    expect(canApprove(pr({ state: "MERGED" }), "octocat")).toBe(false);
  });

  it("allows closed and merged PRs when ignoreState is set", () => {
    const opts = { ignoreState: true };
    expect(canApprove(pr({ state: "CLOSED" }), "octocat", opts)).toBe(true);
    expect(canApprove(pr({ state: "MERGED" }), "octocat", opts)).toBe(true);
  });

  it("still rejects the author / already-approved even with ignoreState", () => {
    const opts = { ignoreState: true };
    expect(
      canApprove(
        pr({ state: "MERGED", authorLogin: "octocat" }),
        "octocat",
        opts,
      ),
    ).toBe(false);
    expect(
      canApprove(
        pr({ state: "CLOSED", viewerHasApproved: true }),
        "octocat",
        opts,
      ),
    ).toBe(false);
  });
});
