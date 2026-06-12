import { describe, expect, it } from "vitest";
import { mergeReadiness } from "../src/lib/mergeReadiness";

describe("mergeReadiness", () => {
  it("is ready when CLEAN", () => {
    expect(mergeReadiness("CLEAN")).toEqual({ kind: "ready" });
  });

  it("is ready when HAS_HOOKS", () => {
    expect(mergeReadiness("HAS_HOOKS")).toEqual({ kind: "ready" });
  });

  it("asks for confirmation when UNSTABLE", () => {
    expect(mergeReadiness("UNSTABLE")).toEqual({
      kind: "confirm",
      reason: "Some non-required checks are failing or still running.",
    });
  });

  it.each([
    ["BLOCKED", "Blocked by branch protection: missing review or required checks.", true],
    ["BEHIND", "Branch is behind the base branch.", true],
    ["DIRTY", "Merge conflicts with the base branch.", false],
    ["DRAFT", "Pull request is still a draft.", false],
    ["UNKNOWN", "GitHub is still computing mergeability — try again in a few seconds.", false],
  ] as const)("blocks %s", (status, reason, autoMergeable) => {
    expect(mergeReadiness(status)).toEqual({ kind: "blocked", reason, autoMergeable });
  });
});
