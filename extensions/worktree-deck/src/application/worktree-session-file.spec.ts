import { describe, expect, it, vi } from "vitest";

import { worktreeSessionFileUsecase, type WorktreeSessionFileDependencies } from "./worktree-session-file.usecase";
import type { WorktreeDeckContext } from "./list-worktrees.usecase";

/**
 * session file ユースケース向け依存モックを作る
 */
function buildDependencies(): WorktreeSessionFileDependencies {
  return {
    findFirstSessionFileByPath: vi.fn(async () => null),
    findLatestSessionFileByPath: vi.fn(async () => null),
    saveCodexThreadIdForWorktreePath: vi.fn(async () => undefined),
    openPathInConfiguredIde: vi.fn(async () => undefined),
    loadLatestSessionMessages: vi.fn(async () => []),
    loadSessionMessages: vi.fn(async () => []),
  };
}

/**
 * worktree-deck の実行 context を作る
 */
function buildContext(): WorktreeDeckContext {
  return {
    env: {},
    cwd: "/cwd",
    homeDir: "/home/me",
    assetsPath: "/assets",
    packageDir: "/pkg",
    packageName: "worktree-deck",
  };
}

describe("resolveAndSaveCodexThreadId", () => {
  it("最初の session file から thread id を抽出して保存する", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.findFirstSessionFileByPath).mockResolvedValueOnce(
      "/home/me/.codex/sessions/11111111-2222-3333-4444-555555555555.jsonl",
    );

    await expect(
      worktreeSessionFileUsecase.resolveAndSaveCodexThreadId({
        worktreePath: " /repo/wt ",
        context: buildContext(),
        dependencies,
      }),
    ).resolves.toEqual({
      worktreePath: "/repo/wt",
      threadId: "11111111-2222-3333-4444-555555555555",
      sessionPath: "/home/me/.codex/sessions/11111111-2222-3333-4444-555555555555.jsonl",
    });
    expect(dependencies.saveCodexThreadIdForWorktreePath).toHaveBeenCalledWith(
      "/repo/wt",
      "11111111-2222-3333-4444-555555555555",
    );
  });

  it("thread id を抽出できない場合は保存しない", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.findFirstSessionFileByPath).mockResolvedValueOnce("/tmp/session.jsonl");

    await expect(
      worktreeSessionFileUsecase.resolveAndSaveCodexThreadId({
        worktreePath: "/repo/wt",
        context: buildContext(),
        dependencies,
      }),
    ).resolves.toBeNull();
    expect(dependencies.saveCodexThreadIdForWorktreePath).not.toHaveBeenCalled();
  });
});

describe("openLatestSessionFile", () => {
  it("最新 session file を IDE で開く", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.findLatestSessionFileByPath).mockResolvedValueOnce("/tmp/latest.jsonl");

    await expect(
      worktreeSessionFileUsecase.openLatestSessionFile({
        worktreePath: "/repo/wt",
        context: buildContext(),
        dependencies,
      }),
    ).resolves.toEqual({ status: "opened", sessionPath: "/tmp/latest.jsonl" });
    expect(dependencies.openPathInConfiguredIde).toHaveBeenCalledWith("/tmp/latest.jsonl");
  });

  it("path が空なら session 探索を行わない", async () => {
    const dependencies = buildDependencies();

    await expect(
      worktreeSessionFileUsecase.openLatestSessionFile({
        worktreePath: " ",
        context: buildContext(),
        dependencies,
      }),
    ).resolves.toEqual({ status: "path-empty" });
    expect(dependencies.findLatestSessionFileByPath).not.toHaveBeenCalled();
  });
});
