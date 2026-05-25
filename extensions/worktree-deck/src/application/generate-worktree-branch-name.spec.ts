import { describe, expect, it, vi } from "vitest";

import {
  generateWorktreeBranchNameUsecase,
  type GenerateWorktreeBranchNameDependencies,
} from "./generate-worktree-branch-name.usecase";

/**
 * テスト用依存ポートを作成する
 */
function buildDependencies(): GenerateWorktreeBranchNameDependencies {
  return {
    generateBranchName: vi.fn(async () => "fix/focus-edge"),
  };
}

describe("generate", () => {
  it("Codex 生成結果を branch 名として返す", async () => {
    const dependencies = buildDependencies();

    const result = await generateWorktreeBranchNameUsecase.generate({
      command: {
        repoRoot: "/repos/app-a",
        initialPrompt: "Fix focus handling",
      },
      dependencies,
    });

    expect(dependencies.generateBranchName).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      prompt: expect.stringContaining("Fix focus handling"),
    });
    expect(result).toEqual({ branch: "fix/focus-edge" });
  });

  it("repository が空なら英語エラーで失敗する", async () => {
    const dependencies = buildDependencies();

    await expect(
      generateWorktreeBranchNameUsecase.generate({
        command: {
          repoRoot: "  ",
          initialPrompt: "Fix focus handling",
        },
        dependencies,
      }),
    ).rejects.toThrow("Repository is required.");
  });
});
