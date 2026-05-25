import { describe, expect, it, vi } from "vitest";

import type { CreateWorktreeCommand, WorktreeCreateContext } from "../application/create-worktree.usecase";
import { createWorktreeDependencies } from "./create-worktree-dependencies";

/**
 * テスト用の実行コンテキストを作成する
 */
function buildContext(): WorktreeCreateContext {
  return {
    env: {},
    homeDir: "/Users/tester",
    assetsPath: "/tmp/dev-flow/assets",
    packageDir: "/tmp/dev-flow",
    packageName: "worktree-deck",
  };
}

/**
 * テスト用の作成コマンドを作成する
 */
function buildCommand(): CreateWorktreeCommand {
  return {
    repoRoot: "/repos/app-a",
    branch: "feature/a",
    startPoint: "main",
    mapValue: "app-a",
    scriptPath: "/tmp/dev-flow/assets/git_worktree_wrap.sh",
  };
}

describe("createWorktreeDependencies", () => {
  it("resolvePaths を infra に委譲する", async () => {
    const context = buildContext();
    const resolveRepositoryMapPaths = vi.fn(async () => ({
      scriptPath: "/tmp/dev-flow/assets/git_worktree_wrap.sh",
    }));
    const dependencies = createWorktreeDependencies({
      resolveRepositoryMapPaths,
      createWorktree: vi.fn(async () => ({
        stdout: "",
        stderr: "",
        createdPath: null,
      })),
    });

    const result = await dependencies.resolvePaths(context);

    expect(resolveRepositoryMapPaths).toHaveBeenCalledWith(context);
    expect(result).toEqual({
      scriptPath: "/tmp/dev-flow/assets/git_worktree_wrap.sh",
    });
  });

  it("executeCreateWorktree を infra に委譲する", async () => {
    const command = buildCommand();
    const createWorktree = vi.fn(async () => ({
      stdout: "Created worktree: /tmp/worktrees/app-a~_~feature-a\n",
      stderr: "",
      createdPath: "/tmp/worktrees/app-a~_~feature-a",
    }));
    const dependencies = createWorktreeDependencies({
      resolveRepositoryMapPaths: vi.fn(async () => ({
        scriptPath: "/tmp/dev-flow/assets/git_worktree_wrap.sh",
      })),
      createWorktree,
    });

    const result = await dependencies.executeCreateWorktree(command);

    expect(createWorktree).toHaveBeenCalledWith(command);
    expect(result).toEqual({
      stdout: "Created worktree: /tmp/worktrees/app-a~_~feature-a\n",
      stderr: "",
      createdPath: "/tmp/worktrees/app-a~_~feature-a",
    });
  });
});
