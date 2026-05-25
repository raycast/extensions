import { describe, expect, it } from "vitest";

import { worktreeCommitStateService } from "./worktree-commit-state.service";

describe("normalizeWorktreeCommitStateEntry", () => {
  it("booleanと文字列を正規化する", () => {
    expect(worktreeCommitStateService.normalizeEntry(true)).toEqual({ hasCommitted: true });
    expect(worktreeCommitStateService.normalizeEntry("true")).toEqual({ hasCommitted: true });
    expect(worktreeCommitStateService.normalizeEntry("false")).toEqual({ hasCommitted: false });
    expect(worktreeCommitStateService.normalizeEntry("invalid")).toBeNull();
  });
});

describe("normalizeWorktreeCommitStateStorage", () => {
  it("コミット済みのみ保持して辞書を正規化する", () => {
    const result = worktreeCommitStateService.normalizeStorage({
      " /tmp/repo-a ": true,
      "/tmp/repo-b": { hasCommitted: false },
      "/tmp/repo-c": { hasCommitted: true },
    });

    expect(result).toEqual({
      "/tmp/repo-a": { hasCommitted: true },
      "/tmp/repo-c": { hasCommitted: true },
    });
  });
});
