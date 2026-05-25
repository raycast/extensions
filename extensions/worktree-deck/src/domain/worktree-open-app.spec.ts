import { describe, expect, it } from "vitest";

import { worktreeOpenAppService } from "./worktree-open-app.service";

describe("worktreeOpenAppService", () => {
  it("保存値が無い場合は Zed にフォールバックする", () => {
    expect(worktreeOpenAppService.resolvePreferred(null)).toBe("zed");
  });

  it("不正な保存値は正規化時に捨てる", () => {
    const actual = worktreeOpenAppService.normalizeStorage({
      "/worktrees/a": { openApp: "codex-app", threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b" },
      "/worktrees/b": { openApp: "unknown" },
      "/worktrees/c": { openApp: "codex-app", threadId: "invalid" },
      " ": { openApp: "zed" },
    });

    expect(actual).toEqual({
      "/worktrees/a": { openApp: "codex-app", threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b" },
      "/worktrees/c": { openApp: "codex-app", threadId: null },
    });
  });

  it("セッションファイル名から thread id を抽出する", () => {
    const actual = worktreeOpenAppService.extractThreadIdFromSessionPath(
      "/Users/me/.codex/sessions/2026/04/29/rollout-2026-04-29T21-55-36-019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
    );

    expect(actual).toBe("019dd94f-27e0-7ad1-8d17-3d628ac5d16b");
  });

  it("thread id から Codex App deeplink を組み立てる", () => {
    expect(worktreeOpenAppService.buildCodexThreadUrl("019dd94f-27e0-7ad1-8d17-3d628ac5d16b")).toBe(
      "codex://threads/019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
    );
  });

  it("詳細表示用ラベルを返す", () => {
    expect(worktreeOpenAppService.formatMetaLabel("zed")).toBe("Zed");
    expect(worktreeOpenAppService.formatMetaLabel("codex-app")).toBe("CA");
  });
});
