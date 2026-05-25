import { describe, expect, it } from "vitest";

import { worktreeBranchNameService } from "./worktree-branch-name.service";

describe("buildGenerationPrompt", () => {
  it("初期プロンプトを含むシンプルな生成プロンプトを作る", () => {
    const result = worktreeBranchNameService.buildGenerationPrompt("Fix focus handling");

    expect(result).toEqual({
      ok: true,
      value: expect.stringContaining("Fix focus handling"),
    });
    expect(result.ok ? result.value : "").toContain("Generate a concise Git branch name");
  });

  it("初期プロンプトが空なら失敗結果を返す", () => {
    expect(worktreeBranchNameService.buildGenerationPrompt("  ")).toEqual({
      ok: false,
      error: "Initial prompt is required.",
    });
  });
});

describe("normalizeGeneratedBranchName", () => {
  it("最初の非空行を branch 名として返す", () => {
    expect(worktreeBranchNameService.normalizeGeneratedBranchName("\nfix/focus-edge\n")).toEqual({
      ok: true,
      value: "fix/focus-edge",
    });
  });

  it("コードフェンスと引用符を取り除く", () => {
    expect(worktreeBranchNameService.normalizeGeneratedBranchName("```text\n'fix/focus-edge'\n```")).toEqual({
      ok: true,
      value: "fix/focus-edge",
    });
  });

  it("git checkout -b の出力を branch 名へ正規化する", () => {
    expect(worktreeBranchNameService.normalizeGeneratedBranchName("git checkout -b fix/focus-edge")).toEqual({
      ok: true,
      value: "fix/focus-edge",
    });
  });

  it("不正な branch 名なら失敗結果を返す", () => {
    expect(worktreeBranchNameService.normalizeGeneratedBranchName("fix focus edge")).toEqual({
      ok: false,
      error: "Generated branch name is invalid.",
    });
  });

  it(".lock で終わる path segment を含む branch 名は失敗結果を返す", () => {
    expect(worktreeBranchNameService.normalizeGeneratedBranchName("feature/foo.lock/bar")).toEqual({
      ok: false,
      error: "Generated branch name is invalid.",
    });
  });
});
