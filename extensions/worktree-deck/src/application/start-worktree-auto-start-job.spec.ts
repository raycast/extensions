import { describe, expect, it, vi } from "vitest";

import {
  startWorktreeAutoStartJobUsecase,
  type StartWorktreeAutoStartJobCommand,
  type StartWorktreeAutoStartJobDependencies,
} from "./start-worktree-auto-start-job.usecase";

/**
 * テスト用 Auto Start job コマンドを作成する
 */
function buildCommand(overrides: Partial<StartWorktreeAutoStartJobCommand> = {}): StartWorktreeAutoStartJobCommand {
  return {
    repoRoot: "/repos/app-a",
    baseBranch: "main",
    initialPrompt: "Fix startup error",
    imagePaths: [],
    scriptPath: "/tmp/dev-flow/assets/git_worktree_wrap.sh",
    mapValue: "app-a",
    openApp: "zed",
    metadata: {
      model: "gpt-5.5",
      serviceTier: "default",
      reasoningEffort: "medium",
      approvalPolicy: "on-request",
      sandboxMode: "workspace-write",
      approvalsReviewer: "user",
      webSearch: "cached",
    },
    ...overrides,
  };
}

/**
 * テスト用依存ポートを作成する
 */
function buildDependencies(): StartWorktreeAutoStartJobDependencies {
  return {
    startJob: vi.fn(async () => ({
      jobId: "job-1",
      statePath: "/tmp/storage/auto-start-jobs/job-1.json",
    })),
  };
}

describe("start", () => {
  it("Auto Start job を依存ポートへ委譲する", async () => {
    const command = buildCommand();
    const dependencies = buildDependencies();

    const result = await startWorktreeAutoStartJobUsecase.start({ command, dependencies });

    expect(dependencies.startJob).toHaveBeenCalledWith(command);
    expect(result).toEqual({
      jobId: "job-1",
      statePath: "/tmp/storage/auto-start-jobs/job-1.json",
    });
  });

  it("画像パスの空白を除いて依存ポートへ渡す", async () => {
    const command = buildCommand({ imagePaths: [" /tmp/a.png ", " ", "/tmp/b.jpg"] });
    const dependencies = buildDependencies();

    await startWorktreeAutoStartJobUsecase.start({ command, dependencies });

    expect(dependencies.startJob).toHaveBeenCalledWith({
      ...command,
      imagePaths: ["/tmp/a.png", "/tmp/b.jpg"],
    });
  });

  it("Repository が空なら英語エラーで失敗する", async () => {
    const dependencies = buildDependencies();

    await expect(
      startWorktreeAutoStartJobUsecase.start({ command: buildCommand({ repoRoot: " " }), dependencies }),
    ).rejects.toThrow("Repository is required.");
    expect(dependencies.startJob).not.toHaveBeenCalled();
  });
});
