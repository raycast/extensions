import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { RenameWorktreeBranchDependencies } from "../application/worktree-rename.usecase";

const execFileAsync = promisify(execFile);
type ExecFileImpl = typeof execFileAsync;

/**
 * worktree rename で使う外部依存の入力ポート
 */
type WorktreeRenameInfra = {
  runGit(args: { repoRoot: string; gitArgs: string[] }): Promise<{ stdout: string; stderr: string }>;
};

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
 * worktree rename 向けの標準 infra 実装を組み立てる
 */
export function createWorktreeRenameInfra(args?: { execFileImpl?: ExecFileImpl }): WorktreeRenameInfra {
  return {
    runGit(command) {
      return runGitCommandInRepository({
        repoRoot: command.repoRoot,
        gitArgs: command.gitArgs,
        execFileImpl: args?.execFileImpl,
      });
    },
  };
}

/**
 * worktree rename ユースケース向けの依存アダプタを組み立てる
 */
export function createWorktreeRenameDependencies(infra: WorktreeRenameInfra): RenameWorktreeBranchDependencies {
  return {
    async renameLocalBranch(args) {
      await infra.runGit({
        repoRoot: args.repoRoot,
        gitArgs: ["branch", "-m", args.oldBranch, args.newBranch],
      });
    },
    async listRemotes(args) {
      try {
        const { stdout } = await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs: ["remote"],
        });
        return stdout
          .split(/\r?\n/)
          .map((entry) => entry.trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    },
    async readGitConfigValue(args) {
      try {
        const { stdout } = await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs: ["config", "--get", args.key],
        });
        const value = stdout.trim();
        return value || null;
      } catch {
        return null;
      }
    },
    async checkRemoteBranchExists(args) {
      try {
        const { stdout } = await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs: ["ls-remote", "--heads", args.remote, args.branch],
        });
        return stdout.trim().length > 0;
      } catch {
        return false;
      }
    },
    async pushRemoteBranch(args) {
      const gitArgs = ["push"];
      if (args.setUpstream) {
        gitArgs.push("--set-upstream");
      }
      gitArgs.push(args.remote, args.branch);
      await infra.runGit({
        repoRoot: args.repoRoot,
        gitArgs,
      });
    },
    async deleteRemoteBranch(args) {
      await infra.runGit({
        repoRoot: args.repoRoot,
        gitArgs: ["push", args.remote, "--delete", args.branch],
      });
    },
  };
}

/**
 * 既存 infra 実装を使った依存アダプタを生成する
 */
export function createDefaultWorktreeRenameDependencies(): RenameWorktreeBranchDependencies {
  return createWorktreeRenameDependencies(createWorktreeRenameInfra());
}
