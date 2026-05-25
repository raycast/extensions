import type { LoadBaseRefDependencies, SaveBaseRefDependencies } from "../application/worktree-base-ref.usecase";

/**
 * baseRef 入出力で使う infra 関数
 */
export type WorktreeBaseRefInfra = {
  loadBranchConfigBaseRef(args: { worktreePath: string; branch: string }): Promise<string | null>;
  loadWorktreeBaseRef(worktreePath: string): Promise<string | null>;
  loadBaseRefByWorktreePaths(paths: string[]): Promise<Map<string, string>>;
  saveBranchConfigBaseRef(args: { worktreePath: string; branch: string; baseRef: string }): Promise<void>;
  saveWorktreeBaseRef(args: { worktreePath: string; baseRef: string }): Promise<void>;
};

/**
 * baseRef 取得ユースケース向け依存を作る
 */
export function createLoadBaseRefDependencies(infra: WorktreeBaseRefInfra): LoadBaseRefDependencies {
  return {
    async loadBranchConfigBaseRef(args) {
      try {
        return await infra.loadBranchConfigBaseRef(args);
      } catch {
        return null;
      }
    },
    async loadWorktreeBaseRef(worktreePath) {
      try {
        return await infra.loadWorktreeBaseRef(worktreePath);
      } catch {
        return null;
      }
    },
    async loadBaseRefByWorktreePaths(paths) {
      try {
        return await infra.loadBaseRefByWorktreePaths(paths);
      } catch {
        return new Map();
      }
    },
  };
}

/**
 * baseRef 保存ユースケース向け依存を作る
 */
export function createSaveBaseRefDependencies(infra: WorktreeBaseRefInfra): SaveBaseRefDependencies {
  return {
    saveBranchConfigBaseRef(args) {
      return infra.saveBranchConfigBaseRef(args);
    },
    saveWorktreeBaseRef(args) {
      return infra.saveWorktreeBaseRef(args);
    },
  };
}
