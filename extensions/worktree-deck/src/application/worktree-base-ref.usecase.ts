import { worktreeBaseRefService, type BaseRefSource } from "../domain/worktree-base-ref.service";

/**
 * baseRef 取得依存ポート
 */
export type LoadBaseRefDependencies = {
  loadBranchConfigBaseRef(args: { worktreePath: string; branch: string }): Promise<string | null>;
  loadWorktreeBaseRef(worktreePath: string): Promise<string | null>;
  loadBaseRefByWorktreePaths(paths: string[]): Promise<Map<string, string>>;
};

/**
 * baseRef 保存依存ポート
 */
export type SaveBaseRefDependencies = {
  saveBranchConfigBaseRef(args: { worktreePath: string; branch: string; baseRef: string }): Promise<void>;
  saveWorktreeBaseRef(args: { worktreePath: string; baseRef: string }): Promise<void>;
};

/**
 * 単一 worktree の baseRef 取得結果
 */
type LoadBaseRefResult = {
  baseRef: string | null;
  source: BaseRefSource | null;
};

/**
 * 単一 worktree の baseRef を取得する
 */
async function load(args: {
  query: { worktreePath: string; branch?: string | null };
  dependencies: LoadBaseRefDependencies;
}): Promise<LoadBaseRefResult> {
  const worktreePath = args.query.worktreePath.trim();
  if (!worktreePath) {
    return {
      baseRef: null,
      source: null,
    };
  }
  const branch = args.query.branch?.trim() ?? "";
  const branchConfigBaseRef = branch
    ? await args.dependencies.loadBranchConfigBaseRef({
        worktreePath,
        branch,
      })
    : null;
  const worktreeBaseRef = await args.dependencies.loadWorktreeBaseRef(worktreePath);
  return worktreeBaseRefService.resolvePreferred({
    branchConfigBaseRef,
    worktreeBaseRef,
  });
}

/**
 * 複数 worktree の baseRef を取得する
 */
async function loadMap(args: {
  query: { paths: string[] };
  dependencies: LoadBaseRefDependencies;
}): Promise<Map<string, string>> {
  const normalizedPaths = Array.from(new Set(args.query.paths.map((path) => path.trim()).filter(Boolean)));
  if (normalizedPaths.length === 0) {
    return new Map();
  }
  return args.dependencies.loadBaseRefByWorktreePaths(normalizedPaths);
}

/**
 * baseRef を永続化する
 */
async function save(args: {
  command: { worktreePath: string; branch?: string | null; baseRef: string };
  dependencies: SaveBaseRefDependencies;
}): Promise<void> {
  const worktreePath = args.command.worktreePath.trim();
  const baseRef = args.command.baseRef.trim();
  if (!worktreePath || !baseRef) {
    return;
  }
  const branch = args.command.branch?.trim() ?? "";
  if (branch) {
    await args.dependencies.saveBranchConfigBaseRef({
      worktreePath,
      branch,
      baseRef,
    });
  }
  await args.dependencies.saveWorktreeBaseRef({
    worktreePath,
    baseRef,
  });
}

/**
 * baseRef ユースケース関数群
 */
export const worktreeBaseRefUsecase = {
  load,
  loadMap,
  save,
} as const;
