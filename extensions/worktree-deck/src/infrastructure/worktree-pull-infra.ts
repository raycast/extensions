import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  worktreePullUsecase,
  type WorktreePullPlan as AppWorktreePullPlan,
  type WorktreePullResult as AppWorktreePullResult,
} from "../application/worktree-pull.usecase";
import {
  createBuildWorktreePullPlanDependencies,
  createPullWorktreeDependencies,
  type WorktreePullInfra,
} from "../interface-adapters/worktree-pull-dependencies";
import { isMissingExternalCommandError, normalizeExternalCommandError } from "./external-command-error";

/**
 * git コマンドを Promise で扱うラッパー
 */
const execFileAsync = promisify(execFile);

/**
 * execFile の戻り値を整形する
 */
function normalizeExecResult(result: unknown): { stdout: string; stderr: string } {
  if (result && typeof result === "object" && "stdout" in result && "stderr" in result) {
    const payload = result as { stdout?: unknown; stderr?: unknown };
    return {
      stdout: String(payload.stdout ?? ""),
      stderr: String(payload.stderr ?? ""),
    };
  }
  if (Array.isArray(result)) {
    const [stdout, stderr] = result;
    return { stdout: String(stdout ?? ""), stderr: String(stderr ?? "") };
  }
  return { stdout: String(result ?? ""), stderr: "" };
}

export type WorktreePullPlan = AppWorktreePullPlan;
export type WorktreePullResult = AppWorktreePullResult;

/**
 * worktree pull ユースケース向けの infra 実装を生成する
 */
function createWorktreePullInfra(): WorktreePullInfra {
  return {
    readCurrentBranch,
    readUpstreamTrackingRef,
    pullFromUpstream,
  };
}

/**
 * worktree pull 計画作成ユースケース用の標準依存を作る
 */
export function createDefaultBuildWorktreePullPlanDependencies() {
  return createBuildWorktreePullPlanDependencies(createWorktreePullInfra());
}

/**
 * worktree pull 実行ユースケース用の標準依存を作る
 */
export function createDefaultPullWorktreeDependencies() {
  return createPullWorktreeDependencies(createWorktreePullInfra());
}

/**
 * worktree pull の事前情報を組み立てる
 */
export async function buildWorktreePullPlan(args: {
  worktreePath: string;
  expectedBranch?: string | null;
}): Promise<WorktreePullPlan> {
  const dependencies = createDefaultBuildWorktreePullPlanDependencies();
  return worktreePullUsecase.buildPlan({
    worktreePath: args.worktreePath,
    expectedBranch: args.expectedBranch,
    dependencies,
  });
}

/**
 * worktree で git pull を実行する
 */
export async function pullWorktree(plan: WorktreePullPlan): Promise<WorktreePullResult> {
  const dependencies = createDefaultPullWorktreeDependencies();
  return worktreePullUsecase.pull({
    plan,
    dependencies,
  });
}

/**
 * 現在のブランチ名を取得する
 */
async function readCurrentBranch(worktreePath: string): Promise<string | null> {
  try {
    const result = await execGit(worktreePath, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
    const { stdout } = normalizeExecResult(result);
    const ref = stdout.trim();
    return ref || null;
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return null;
  }
}

/**
 * 上流追跡ブランチ参照を取得する
 */
async function readUpstreamTrackingRef(worktreePath: string): Promise<string | null> {
  try {
    const result = await execGit(worktreePath, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    const { stdout } = normalizeExecResult(result);
    const ref = stdout.trim();
    return ref || null;
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return null;
  }
}

/**
 * worktree で pull を実行する
 */
async function pullFromUpstream(worktreePath: string): Promise<void> {
  await execGit(worktreePath, ["pull"]);
}

/**
 * git コマンドを worktree で実行する
 */
async function execGit(worktreePath: string, gitArgs: string[]): Promise<unknown> {
  try {
    return await execFileAsync("git", ["-C", worktreePath, ...gitArgs], { cwd: worktreePath });
  } catch (error) {
    throw normalizeExternalCommandError(error, "git", "git-worktree");
  }
}
