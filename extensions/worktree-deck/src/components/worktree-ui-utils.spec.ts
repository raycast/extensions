import { describe, expect, it } from "vitest";
import { canPullBranch } from "./worktree-ui-utils";

describe("canPullBranch", () => {
  it("ブランチ名が無ければ false", () => {
    expect(canPullBranch(null)).toBe(false);
    expect(canPullBranch(undefined)).toBe(false);
  });

  it("root は false", () => {
    expect(canPullBranch("root")).toBe(false);
  });

  it("通常のブランチなら true", () => {
    expect(canPullBranch("feature/test")).toBe(true);
  });
});
