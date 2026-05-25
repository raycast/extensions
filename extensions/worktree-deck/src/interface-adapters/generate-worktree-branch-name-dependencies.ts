import type {
  GenerateWorktreeBranchNameDependencies,
  GenerateWorktreeBranchNameRequest,
} from "../application/generate-worktree-branch-name.usecase";
import { generateBranchNameWithCodexExec } from "../infrastructure/worktree-branch-name-infra";

/**
 * branch 名生成ユースケース向け infra 入力
 */
type GenerateWorktreeBranchNameInfra = {
  generateBranchNameWithCodexExec(request: GenerateWorktreeBranchNameRequest): Promise<string>;
};

/**
 * branch 名生成ユースケース向け依存アダプタを組み立てる
 */
export function createGenerateWorktreeBranchNameDependencies(
  infra: GenerateWorktreeBranchNameInfra,
): GenerateWorktreeBranchNameDependencies {
  return {
    generateBranchName(request) {
      return infra.generateBranchNameWithCodexExec(request);
    },
  };
}

/**
 * 既存 infra 実装を使った branch 名生成依存を組み立てる
 */
export function createDefaultGenerateWorktreeBranchNameDependencies(): GenerateWorktreeBranchNameDependencies {
  return createGenerateWorktreeBranchNameDependencies({
    generateBranchNameWithCodexExec,
  });
}
