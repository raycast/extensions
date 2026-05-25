import { describe, expect, it, vi } from "vitest";
import {
  resolveCodexPermissionMetadata,
  resolveCodexPermissionMode,
  startCodexInitialSessionUsecase,
  type CodexInitialSessionMetadata,
  type StartCodexInitialSessionDependencies,
} from "./start-codex-initial-session.usecase";

const DEFAULT_METADATA: CodexInitialSessionMetadata = {
  model: "gpt-5.5",
  serviceTier: "default",
  reasoningEffort: "medium",
  approvalPolicy: "on-request",
  sandboxMode: "workspace-write",
  approvalsReviewer: "guardian_subagent",
  webSearch: "cached",
};

/**
 * テスト用依存ポートを作成する
 */
function buildDependencies(): StartCodexInitialSessionDependencies {
  return {
    loadDefaults: vi.fn(async () => DEFAULT_METADATA),
    start: vi.fn(async () => ({ threadId: "thread-1" })),
  };
}

describe("loadDefaults", () => {
  it("repository root を渡して既定メタ情報を読む", async () => {
    const dependencies = buildDependencies();

    const result = await startCodexInitialSessionUsecase.loadDefaults({
      query: { repoRoot: " /repos/app-a " },
      dependencies,
    });

    expect(dependencies.loadDefaults).toHaveBeenCalledWith({ repoRoot: "/repos/app-a" });
    expect(result).toEqual(DEFAULT_METADATA);
  });
});

describe("start", () => {
  it("初期プロンプトとメタ情報で Codex 初回セッションを開始する", async () => {
    const dependencies = buildDependencies();

    const result = await startCodexInitialSessionUsecase.start({
      command: {
        worktreePath: " /worktrees/app-a ",
        initialPrompt: " Fix focus ",
        metadata: DEFAULT_METADATA,
      },
      dependencies,
    });

    expect(dependencies.start).toHaveBeenCalledWith({
      worktreePath: "/worktrees/app-a",
      initialPrompt: "Fix focus",
      metadata: DEFAULT_METADATA,
    });
    expect(result).toEqual({ threadId: "thread-1" });
  });

  it("worktree path が空なら英語エラーで失敗する", async () => {
    const dependencies = buildDependencies();

    await expect(
      startCodexInitialSessionUsecase.start({
        command: {
          worktreePath: " ",
          initialPrompt: "Fix focus",
          metadata: DEFAULT_METADATA,
        },
        dependencies,
      }),
    ).rejects.toThrow("Worktree path is required.");
  });
});

describe("resolveCodexPermissionMetadata", () => {
  it("default を workspace-write の手動承認へ展開する", () => {
    expect(resolveCodexPermissionMetadata({ permissionMode: "default" })).toEqual({
      approvalPolicy: "on-request",
      sandboxMode: "workspace-write",
      approvalsReviewer: "user",
      webSearch: "cached",
    });
  });

  it("auto_review を guardian subagent の自動レビューへ展開する", () => {
    expect(resolveCodexPermissionMetadata({ permissionMode: "auto_review" })).toEqual({
      approvalPolicy: "on-request",
      sandboxMode: "workspace-write",
      approvalsReviewer: "guardian_subagent",
      webSearch: "cached",
    });
  });

  it("full_access を承認なしのフルアクセスへ展開する", () => {
    expect(resolveCodexPermissionMetadata({ permissionMode: "full_access" })).toEqual({
      approvalPolicy: "never",
      sandboxMode: "danger-full-access",
      approvalsReviewer: "user",
      webSearch: "live",
    });
  });

  it("custom は config.toml 由来の詳細値を正規化して使う", () => {
    expect(
      resolveCodexPermissionMetadata({
        permissionMode: "custom",
        customMetadata: {
          approvalPolicy: "on-failure",
          sandboxMode: "read-only",
          approvalsReviewer: "auto_review",
          webSearch: "disabled",
        },
      }),
    ).toEqual({
      approvalPolicy: "on-failure",
      sandboxMode: "read-only",
      approvalsReviewer: "auto_review",
      webSearch: "disabled",
    });
  });
});

describe("resolveCodexPermissionMode", () => {
  it("詳細値から auto_review を推定する", () => {
    expect(
      resolveCodexPermissionMode({
        approvalPolicy: "on-request",
        sandboxMode: "workspace-write",
        approvalsReviewer: "guardian_subagent",
        webSearch: "cached",
      }),
    ).toBe("auto_review");
  });

  it("auto_review reviewer も auto_review として推定する", () => {
    expect(
      resolveCodexPermissionMode({
        approvalPolicy: "on-request",
        sandboxMode: "workspace-write",
        approvalsReviewer: "auto_review",
        webSearch: "cached",
      }),
    ).toBe("auto_review");
  });

  it("既知プリセットに一致しない詳細値は custom として扱う", () => {
    expect(
      resolveCodexPermissionMode({
        approvalPolicy: "on-failure",
        sandboxMode: "workspace-write",
        approvalsReviewer: "user",
        webSearch: "cached",
      }),
    ).toBe("custom");
  });
});
