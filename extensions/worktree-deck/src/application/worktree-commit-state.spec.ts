import { describe, expect, it, vi } from "vitest";

import { worktreeCommitStateUsecase } from "./worktree-commit-state.usecase";

describe("loadStorage", () => {
  it("読み込み結果を正規化して返す", async () => {
    const dependencies = {
      loadStorage: vi.fn(async () => ({
        "/tmp/repo-a": true,
        "/tmp/repo-b": { hasCommitted: false },
      })),
    };

    const result = await worktreeCommitStateUsecase.loadStorage({ dependencies });

    expect(result).toEqual({
      "/tmp/repo-a": { hasCommitted: true },
    });
  });
});

describe("saveStorage", () => {
  it("保存前に正規化して依存へ渡す", async () => {
    const dependencies = {
      saveStorage: vi.fn(async () => {}),
    };

    await worktreeCommitStateUsecase.saveStorage({
      storage: {
        "/tmp/repo-a": { hasCommitted: true },
        "/tmp/repo-b": { hasCommitted: false },
      },
      dependencies,
    });

    expect(dependencies.saveStorage).toHaveBeenCalledWith({
      "/tmp/repo-a": { hasCommitted: true },
    });
  });
});
