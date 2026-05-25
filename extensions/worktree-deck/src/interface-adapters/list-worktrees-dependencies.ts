import type {
  ListWorktreesDependencies,
  WorktreeDeckContext,
  WorktreeDeckSettings,
} from "../application/list-worktrees.usecase";
import type { Worktree } from "../application/worktree.entity";
import type { RepositoryMapping } from "../domain/repository-mapping.service";
import {
  loadBasePathInfra,
  loadCachedWorktreesBaseInfra,
  loadRepositoryMappingsInfra,
  loadWorktreesBaseInfra,
} from "../infrastructure/list-worktrees-infra";

/**
 * listWorktrees で使う外部依存の入力ポート
 */
type ListWorktreesInfra = {
  loadBasePath(context: WorktreeDeckContext): Promise<string>;
  loadRepositoryMappings(): Promise<RepositoryMapping[]>;
  loadCachedWorktreesBase(basePath: string): Promise<Worktree[] | null>;
  loadWorktreesBase(basePath: string): Promise<Worktree[]>;
};

/**
 * 設定値を読み込む
 */
async function loadSettingsFromInfra(
  infra: Pick<ListWorktreesInfra, "loadBasePath">,
  context: WorktreeDeckContext,
): Promise<WorktreeDeckSettings> {
  const basePath = await infra.loadBasePath(context);
  return { basePath };
}

/**
 * mapping を読み込み、失敗時は空配列にフォールバックする
 */
async function loadMappingsFromInfra(
  infra: Pick<ListWorktreesInfra, "loadRepositoryMappings">,
): Promise<RepositoryMapping[]> {
  try {
    return await infra.loadRepositoryMappings();
  } catch {
    return [];
  }
}

/**
 * 一覧取得ユースケース向けの依存アダプタを組み立てる
 */
export function createListWorktreesDependencies(infra: ListWorktreesInfra): ListWorktreesDependencies {
  return {
    loadSettings(context) {
      return loadSettingsFromInfra(infra, context);
    },
    loadMappings() {
      return loadMappingsFromInfra(infra);
    },
    loadCachedWorktrees(basePath) {
      return infra.loadCachedWorktreesBase(basePath);
    },
    loadWorktrees(basePath) {
      return infra.loadWorktreesBase(basePath);
    },
  };
}

/**
 * 既存 infra 実装を使った依存アダプタを生成する
 */
export function createDefaultListWorktreesDependencies(): ListWorktreesDependencies {
  return createListWorktreesDependencies({
    loadBasePath: loadBasePathInfra,
    loadRepositoryMappings: loadRepositoryMappingsInfra,
    loadCachedWorktreesBase: loadCachedWorktreesBaseInfra,
    loadWorktreesBase: loadWorktreesBaseInfra,
  });
}
