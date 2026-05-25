import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { worktreeBaseRefUsecase } from "../application/worktree-base-ref.usecase";
import { worktreeBaseRefService } from "../domain/worktree-base-ref.service";
import {
  createLoadBaseRefDependencies,
  createSaveBaseRefDependencies,
  type WorktreeBaseRefInfra,
} from "../interface-adapters/worktree-base-ref-dependencies";
import { buildEnvLookupArgs, type EnvLookupArgs } from "./env/env-store";
import { isMissingExternalCommandError, normalizeExternalCommandError } from "./external-command-error";
import { readWorktreeDeckFileStorageJson, writeWorktreeDeckFileStorageJson } from "./storage/json-file-storage";

/**
 * package.json の name と一致させる
 */
const WORKTREE_DECK_PACKAGE_NAME = "worktree-deck";

/**
 * worktree のベースブランチ情報
 */
type WorktreeBaseBranchMeta = {
  baseRef: string;
};

type WorktreeBaseBranchStorage = Record<string, WorktreeBaseBranchMeta>;

/**
 * base branch メタ情報を保存する storage ファイル名
 */
const WORKTREE_BASE_BRANCH_STORAGE_FILE = "worktree-base-branch.json";
/**
 * execFile を Promise 化する
 */
const execFileAsync = promisify(execFile);

/**
 * base branch 用の storage 引数を組み立てる
 */
function buildWorktreeBaseBranchStorageArgs(): EnvLookupArgs {
  return buildEnvLookupArgs(__dirname, WORKTREE_DECK_PACKAGE_NAME);
}

/**
 * storage から base branch メタ情報を読み込む
 */
async function loadWorktreeBaseBranchStorageFromStorage(): Promise<WorktreeBaseBranchStorage> {
  const stored = await readWorktreeDeckFileStorageJson<unknown>(
    buildWorktreeBaseBranchStorageArgs(),
    WORKTREE_BASE_BRANCH_STORAGE_FILE,
  );
  return worktreeBaseRefService.normalizeStorage(stored ?? "");
}

/**
 * base branch メタ情報を storage へ保存する
 */
async function saveWorktreeBaseBranchStorageToStorage(storage: WorktreeBaseBranchStorage): Promise<void> {
  await writeWorktreeDeckFileStorageJson(
    buildWorktreeBaseBranchStorageArgs(),
    WORKTREE_BASE_BRANCH_STORAGE_FILE,
    storage,
  );
}

/**
 * base branch メタ情報を読み込む
 */
async function loadWorktreeBaseBranchStorage(): Promise<WorktreeBaseBranchStorage> {
  return loadWorktreeBaseBranchStorageFromStorage();
}

/**
 * baseRef 読み書きで使う infra 実装
 */
const WORKTREE_BASE_REF_INFRA: WorktreeBaseRefInfra = {
  async loadBranchConfigBaseRef(args) {
    const worktreePath = args.worktreePath.trim();
    const branch = args.branch.trim();
    if (!worktreePath || !branch) {
      return null;
    }
    try {
      const key = worktreeBaseRefService.buildConfigKey(branch);
      const { stdout } = await execGit(worktreePath, ["config", "--get", key]);
      const value = stdout.trim();
      if (value) {
        return value;
      }
    } catch (error) {
      if (isMissingExternalCommandError(error)) {
        throw error;
      }
      return null;
    }
    return null;
  },
  async loadWorktreeBaseRef(worktreePath) {
    const trimmedPath = worktreePath.trim();
    if (!trimmedPath) {
      return null;
    }
    const storage = await loadWorktreeBaseBranchStorage();
    const baseRef = storage[trimmedPath]?.baseRef?.trim();
    return baseRef || null;
  },
  async loadBaseRefByWorktreePaths(paths) {
    const storage = await loadWorktreeBaseBranchStorage();
    const entries = paths
      .map((path) => {
        const baseRef = storage[path]?.baseRef?.trim();
        return baseRef ? ([path, baseRef] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null);
    return new Map(entries);
  },
  async saveBranchConfigBaseRef(args) {
    const worktreePath = args.worktreePath.trim();
    const branch = args.branch.trim();
    const baseRef = args.baseRef.trim();
    if (!worktreePath || !branch || !baseRef) {
      return;
    }
    const key = worktreeBaseRefService.buildConfigKey(branch);
    await execGit(worktreePath, ["config", key, baseRef]);
  },
  async saveWorktreeBaseRef(args) {
    const worktreePath = args.worktreePath.trim();
    const baseRef = args.baseRef.trim();
    if (!worktreePath || !baseRef) {
      return;
    }
    const storage = await loadWorktreeBaseBranchStorage();
    const next: WorktreeBaseBranchStorage = {
      ...storage,
      [worktreePath]: { baseRef },
    };
    await saveWorktreeBaseBranchStorageToStorage(next);
  },
};

/**
 * baseRef 取得ユースケース用依存
 */
const LOAD_BASE_REF_DEPENDENCIES = createLoadBaseRefDependencies(WORKTREE_BASE_REF_INFRA);

/**
 * baseRef 保存ユースケース用依存
 */
const SAVE_BASE_REF_DEPENDENCIES = createSaveBaseRefDependencies(WORKTREE_BASE_REF_INFRA);

/**
 * worktree パスごとの baseRef をまとめて取得する
 */
export async function loadBaseRefByWorktreePath(paths: string[]): Promise<Map<string, string>> {
  return worktreeBaseRefUsecase.loadMap({
    query: {
      paths,
    },
    dependencies: LOAD_BASE_REF_DEPENDENCIES,
  });
}

/**
 * 指定した worktree の baseRef を取得する
 */
export async function loadBaseRefForWorktreePath(path: string): Promise<string | null> {
  const result = await worktreeBaseRefUsecase.load({
    query: {
      worktreePath: path,
    },
    dependencies: LOAD_BASE_REF_DEPENDENCIES,
  });
  return result.baseRef;
}

/**
 * worktree パスに baseRef を保存する
 */
export async function saveBaseRefForWorktreePath(path: string, baseRef: string): Promise<void> {
  await worktreeBaseRefUsecase.save({
    command: {
      worktreePath: path,
      baseRef,
    },
    dependencies: SAVE_BASE_REF_DEPENDENCIES,
  });
}

/**
 * git コマンドを worktree で実行する
 */
async function execGit(worktreePath: string, gitArgs: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["-C", worktreePath, ...gitArgs], { cwd: worktreePath });
    return { stdout, stderr };
  } catch (error) {
    throw normalizeExternalCommandError(error, "git", "git-worktree");
  }
}

/**
 * ブランチに紐づく baseRef を取得する
 */
export async function loadBaseRefForBranchConfig(args: {
  worktreePath: string;
  branch: string;
}): Promise<string | null> {
  try {
    return await LOAD_BASE_REF_DEPENDENCIES.loadBranchConfigBaseRef(args);
  } catch {
    return null;
  }
}

/**
 * ブランチに紐づく baseRef を保存する
 */
export async function saveBaseRefForBranchConfig(args: {
  worktreePath: string;
  branch: string;
  baseRef: string;
}): Promise<void> {
  await SAVE_BASE_REF_DEPENDENCIES.saveBranchConfigBaseRef(args);
}
