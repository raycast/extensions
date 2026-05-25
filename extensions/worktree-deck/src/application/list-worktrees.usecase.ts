import type { RepositoryMapping } from "../domain/repository-mapping.service";
import type { Worktree } from "./worktree.entity";
import { worktreeFilterService } from "../domain/worktree-filter.service";

/**
 * 一覧取得で共通利用する実行コンテキスト
 */
export type WorktreeDeckContext = {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
};

/**
 * 一覧表示に必要な設定値
 */
export type WorktreeDeckSettings = {
  basePath: string;
};

/**
 * 一覧取得ユースケースの依存ポート
 */
export type ListWorktreesDependencies = {
  loadSettings(context: WorktreeDeckContext): Promise<WorktreeDeckSettings>;
  loadMappings(): Promise<RepositoryMapping[]>;
  loadCachedWorktrees(basePath: string): Promise<Worktree[] | null>;
  loadWorktrees(basePath: string): Promise<Worktree[]>;
};

/**
 * 一覧取得ユースケースの返却値
 */
export type ListWorktreesResult = {
  basePath: string;
  mappings: RepositoryMapping[];
  worktrees: Worktree[];
  isCacheHit: boolean;
};

/**
 * 一覧取得の実行オプション
 */
type ListWorktreesOptions = {
  preferCache?: boolean;
};

/**
 * mapping を適用した一覧取得結果を組み立てる
 */
function buildListWorktreesResult(args: {
  settings: WorktreeDeckSettings;
  mappings: RepositoryMapping[];
  worktrees: Worktree[];
  homeDir: string | null;
  isCacheHit: boolean;
}): ListWorktreesResult {
  const filteredWorktrees = worktreeFilterService.filterByMappings({
    worktrees: args.worktrees,
    mappings: args.mappings,
    homeDir: args.homeDir,
  });
  return {
    basePath: args.settings.basePath,
    mappings: args.mappings,
    worktrees: filteredWorktrees,
    isCacheHit: args.isCacheHit,
  };
}

/**
 * worktree 一覧を取得し mapping で表示対象を絞り込む
 */
async function list(args: {
  context: WorktreeDeckContext;
  dependencies: ListWorktreesDependencies;
  options?: ListWorktreesOptions;
}): Promise<ListWorktreesResult> {
  const [settings, mappings] = await Promise.all([
    args.dependencies.loadSettings(args.context),
    args.dependencies.loadMappings(),
  ]);
  if (args.options?.preferCache !== false) {
    const cachedWorktrees = await args.dependencies.loadCachedWorktrees(settings.basePath);
    if (cachedWorktrees !== null) {
      return buildListWorktreesResult({
        settings,
        mappings,
        worktrees: cachedWorktrees,
        homeDir: args.context.homeDir,
        isCacheHit: true,
      });
    }
  }
  const worktrees = await args.dependencies.loadWorktrees(settings.basePath);
  return buildListWorktreesResult({
    settings,
    mappings,
    worktrees,
    homeDir: args.context.homeDir,
    isCacheHit: false,
  });
}

/**
 * worktree 一覧ユースケース関数群
 */
export const listWorktreesUsecase = {
  list,
} as const;
