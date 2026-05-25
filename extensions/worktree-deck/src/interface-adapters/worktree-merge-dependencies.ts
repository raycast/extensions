import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type {
  BuildWorktreeMergePlanDependencies,
  MergeWorktreeIntoBaseDependencies,
} from "../application/worktree-merge.usecase";

const execFileAsync = promisify(execFile);
type ExecFileImpl = typeof execFileAsync;

/**
 * worktree merge の外部依存実装
 */
type WorktreeMergeInfra = {
  readCurrentBranch(worktreePath: string): Promise<string | null>;
  resolveMergeTargetRef(worktreePath: string): Promise<string | null>;
  listRemotes(repoRoot: string): Promise<string[]>;
  checkLocalBranchExists(repoRoot: string, branch: string): Promise<boolean>;
  checkWorktreeClean(worktreePath: string): Promise<boolean>;
  switchBranch(repoRoot: string, branch: string): Promise<void>;
  createTrackingBranch(repoRoot: string, branch: string, targetRef: string): Promise<void>;
  mergeBranch(repoRoot: string, sourceBranch: string): Promise<void>;
};

type RunGitCommand = (repoRoot: string, gitArgs: string[]) => Promise<{ stdout: string; stderr: string }>;
type RunGitCommandByObject = (args: {
  repoRoot: string;
  gitArgs: string[];
}) => Promise<{ stdout: string; stderr: string }>;

/**
 * リポジトリ配下で git コマンドを実行する
 */
async function runGitCommandInRepository(args: {
  repoRoot: string;
  gitArgs: string[];
  execFileImpl?: ExecFileImpl;
}): Promise<{ stdout: string; stderr: string }> {
  const execFileImpl = args.execFileImpl ?? execFileAsync;
  const { stdout, stderr } = await execFileImpl("git", ["-C", args.repoRoot, ...args.gitArgs], {
    cwd: args.repoRoot,
  });
  return { stdout, stderr };
}

/**
 * オブジェクト引数の git 実行関数を merge 用シグネチャへ変換する
 */
function createRunGitAdapter(runGitByObject: RunGitCommandByObject): RunGitCommand {
  return (repoRoot, gitArgs) => runGitByObject({ repoRoot, gitArgs });
}

/**
 * worktree merge 用の infra 実装を組み立てる
 */
export function createWorktreeMergeInfra(args: {
  resolveMergeTargetRef(worktreePath: string): Promise<string | null>;
  runGit?: RunGitCommand;
  runGitByObject?: RunGitCommandByObject;
}): WorktreeMergeInfra {
  const runGit = args.runGit ?? createRunGitAdapter(args.runGitByObject ?? runGitCommandInRepository);
  return {
    async readCurrentBranch(worktreePath) {
      try {
        const { stdout } = await runGit(worktreePath, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
        const branch = stdout.trim();
        return branch || null;
      } catch {
        return null;
      }
    },
    resolveMergeTargetRef(worktreePath) {
      return args.resolveMergeTargetRef(worktreePath);
    },
    async listRemotes(repoRoot) {
      try {
        const { stdout } = await runGit(repoRoot, ["remote"]);
        return stdout
          .split(/\r?\n/)
          .map((entry) => entry.trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    },
    async checkLocalBranchExists(repoRoot, branch) {
      try {
        await runGit(repoRoot, ["show-ref", "--verify", `refs/heads/${branch}`]);
        return true;
      } catch {
        return false;
      }
    },
    async checkWorktreeClean(worktreePath) {
      try {
        const { stdout } = await runGit(worktreePath, ["status", "--porcelain"]);
        return stdout.trim().length === 0;
      } catch {
        return false;
      }
    },
    async switchBranch(repoRoot, branch) {
      await runGit(repoRoot, ["switch", branch]);
    },
    async createTrackingBranch(repoRoot, branch, targetRef) {
      await runGit(repoRoot, ["switch", "--track", "-c", branch, targetRef]);
    },
    async mergeBranch(repoRoot, sourceBranch) {
      await runGit(repoRoot, ["merge", "--no-edit", sourceBranch]);
    },
  };
}

/**
 * 計画作成ユースケース向けの依存アダプタを作成する
 */
export function createBuildWorktreeMergePlanDependencies(
  infra: WorktreeMergeInfra,
): BuildWorktreeMergePlanDependencies {
  return {
    readCurrentBranch(worktreePath) {
      return infra.readCurrentBranch(worktreePath);
    },
    resolveMergeTargetRef(worktreePath) {
      return infra.resolveMergeTargetRef(worktreePath);
    },
    listRemotes(repoRoot) {
      return infra.listRemotes(repoRoot);
    },
    checkLocalBranchExists(repoRoot, branch) {
      return infra.checkLocalBranchExists(repoRoot, branch);
    },
  };
}

/**
 * マージ実行ユースケース向けの依存アダプタを作成する
 */
export function createMergeWorktreeIntoBaseDependencies(infra: WorktreeMergeInfra): MergeWorktreeIntoBaseDependencies {
  return {
    checkWorktreeClean(worktreePath) {
      return infra.checkWorktreeClean(worktreePath);
    },
    checkLocalBranchExists(repoRoot, branch) {
      return infra.checkLocalBranchExists(repoRoot, branch);
    },
    readCurrentBranch(worktreePath) {
      return infra.readCurrentBranch(worktreePath);
    },
    createTrackingBranch(repoRoot, branch, targetRef) {
      return infra.createTrackingBranch(repoRoot, branch, targetRef);
    },
    switchBranch(repoRoot, branch) {
      return infra.switchBranch(repoRoot, branch);
    },
    mergeBranch(repoRoot, sourceBranch) {
      return infra.mergeBranch(repoRoot, sourceBranch);
    },
  };
}
