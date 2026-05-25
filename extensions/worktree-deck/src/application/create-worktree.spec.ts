import { describe, expect, it, vi } from "vitest";

import {
  createWorktreeUsecase,
  type CreateWorktreeCommand,
  type CreateWorktreeDependencies,
  type WorktreeCreateContext,
} from "./create-worktree.usecase";

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

/**
 * テスト用依存ポートを作成する
 */
function buildDependencies(): CreateWorktreeDependencies {
  return {
    resolvePaths: vi.fn(async () => ({
      scriptPath: "/tmp/dev-flow/assets/git_worktree_wrap.sh",
    })),
    executeCreateWorktree: vi.fn(async () => ({
      stdout: "Created worktree: /tmp/worktrees/app-a~_~feature-a\n",
      stderr: "",
      createdPath: null,
    })),
  };
}

describe("resolvePaths", () => {
  it("依存ポートを使って作成前パス情報を返す", async () => {
    const context = buildContext();
    const dependencies = buildDependencies();

    const result = await createWorktreeUsecase.resolvePaths({ context, dependencies });

    expect(dependencies.resolvePaths).toHaveBeenCalledWith(context);
    expect(result).toEqual({
      scriptPath: "/tmp/dev-flow/assets/git_worktree_wrap.sh",
    });
  });
});

describe("create", () => {
  it("外部実行結果に createdPath があればそれを優先する", async () => {
    const command = buildCommand();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.executeCreateWorktree).mockResolvedValueOnce({
      stdout: "Created worktree: /tmp/worktrees/from-stdout\n",
      stderr: "",
      createdPath: "/tmp/worktrees/from-dependency",
    });

    const result = await createWorktreeUsecase.create({ command, dependencies });

    expect(dependencies.executeCreateWorktree).toHaveBeenCalledWith(command);
    expect(result).toEqual({
      createdPath: "/tmp/worktrees/from-dependency",
      stdout: "Created worktree: /tmp/worktrees/from-stdout\n",
      stderr: "",
    });
  });

  it("外部実行結果に createdPath が無ければ stdout から抽出する", async () => {
    const command = buildCommand();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.executeCreateWorktree).mockResolvedValueOnce({
      stdout: "Preparing\nCreated worktree: /tmp/worktrees/from-stdout\n",
      stderr: "",
      createdPath: null,
    });

    const result = await createWorktreeUsecase.create({ command, dependencies });

    expect(result).toEqual({
      createdPath: "/tmp/worktrees/from-stdout",
      stdout: "Preparing\nCreated worktree: /tmp/worktrees/from-stdout\n",
      stderr: "",
    });
  });

  it("既存 worktree を採用した結果を呼び出し元へ返す", async () => {
    const command = buildCommand();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.executeCreateWorktree).mockResolvedValueOnce({
      stdout: "Existing worktree: /tmp/worktrees/from-existing\n",
      stderr: "",
      createdPath: "/tmp/worktrees/from-existing",
      reusedExisting: true,
    });

    const result = await createWorktreeUsecase.create({ command, dependencies });

    expect(result).toEqual({
      createdPath: "/tmp/worktrees/from-existing",
      stdout: "Existing worktree: /tmp/worktrees/from-existing\n",
      stderr: "",
      reusedExisting: true,
    });
  });

  it("作成成功後に createdPath を確定できない場合は英語エラーで失敗する", async () => {
    const command = buildCommand();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.executeCreateWorktree).mockResolvedValueOnce({
      stdout: "Preparing\n",
      stderr: "",
      createdPath: null,
    });

    await expect(createWorktreeUsecase.create({ command, dependencies })).rejects.toThrow(
      "Created worktree path could not be resolved.",
    );
  });
});
