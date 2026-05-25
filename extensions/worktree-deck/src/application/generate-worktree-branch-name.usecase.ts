import { worktreeBranchNameService } from "../domain/worktree-branch-name.service";

/**
 * 初期プロンプトから branch 名を生成する入力値
 */
type GenerateWorktreeBranchNameCommand = {
  repoRoot: string;
  initialPrompt: string;
};

/**
 * Codex に branch 名生成を依頼する入力値
 */
export type GenerateWorktreeBranchNameRequest = {
  repoRoot: string;
  prompt: string;
};

/**
 * branch 名生成ユースケースの依存ポート
 */
export type GenerateWorktreeBranchNameDependencies = {
  generateBranchName(request: GenerateWorktreeBranchNameRequest): Promise<string>;
};

/**
 * 初期プロンプトから branch 名を生成する
 */
async function generate(args: {
  command: GenerateWorktreeBranchNameCommand;
  dependencies: GenerateWorktreeBranchNameDependencies;
}): Promise<{ branch: string }> {
  const repoRoot = args.command.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository is required.");
  }
  const promptResult = worktreeBranchNameService.buildGenerationPrompt(args.command.initialPrompt);
  if (!promptResult.ok) {
    throw new Error(promptResult.error);
  }
  const rawBranchName = await args.dependencies.generateBranchName({ repoRoot, prompt: promptResult.value });
  const branchResult = worktreeBranchNameService.normalizeGeneratedBranchName(rawBranchName);
  if (!branchResult.ok) {
    throw new Error(branchResult.error);
  }
  return {
    branch: branchResult.value,
  };
}

/**
 * branch 名生成ユースケース関数群
 */
export const generateWorktreeBranchNameUsecase = {
  generate,
} as const;
