import { describe, expect, it, vi } from "vitest";

import { createWorktreeCommitStateDependencies } from "./worktree-commit-state-dependencies";

describe("createWorktreeCommitStateDependencies", () => {
  it("infra を application 用依存に変換する", async () => {
    const infra = {
      loadFromStorage: vi.fn(async () => ({ "/tmp/repo-a": { hasCommitted: true } })),
      saveToStorage: vi.fn(async () => {}),
    };

    const deps = createWorktreeCommitStateDependencies(infra);

    await expect(deps.loadStorage()).resolves.toEqual({
      "/tmp/repo-a": { hasCommitted: true },
    });
    await deps.saveStorage({
      "/tmp/repo-b": { hasCommitted: true },
    });

    expect(infra.saveToStorage).toHaveBeenCalledWith({
      "/tmp/repo-b": { hasCommitted: true },
    });
  });
});
