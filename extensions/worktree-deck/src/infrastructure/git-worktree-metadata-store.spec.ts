import { describe, expect, it, vi } from "vitest";

const execGitMock = vi.hoisted(() => vi.fn());

vi.mock("./git-command", () => {
  return {
    execGit: execGitMock,
  };
});

import { resolveOriginRepoPath } from "./git-worktree-metadata-store";

/**
 * git コマンドの標準出力を返す mock を設定する
 */
function mockGitStdout(stdout: string): void {
  execGitMock.mockResolvedValueOnce({ stdout, stderr: "" });
}

describe("resolveOriginRepoPath", () => {
  it("common dir が .git のときは親ディレクトリを originPath にする", async () => {
    mockGitStdout("/Users/kz/src/app/.git\n");

    await expect(resolveOriginRepoPath("/Users/kz/.dev-flow/worktrees/app~_~feature")).resolves.toBe(
      "/Users/kz/src/app",
    );
  });

  it("common dir が .git/worktrees 配下を指す場合は main repo root に補正する", async () => {
    mockGitStdout("/Users/kz/src/app/.git/worktrees/app_-_feature\n");

    await expect(resolveOriginRepoPath("/Users/kz/.dev-flow/worktrees/app~_~feature")).resolves.toBe(
      "/Users/kz/src/app",
    );
  });
});
