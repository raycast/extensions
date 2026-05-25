import type { WorktreeDeckContext } from "../application/list-worktrees.usecase";
import type { Worktree } from "../application/worktree.entity";
import type { RepositoryMapping } from "../domain/repository-mapping.service";
import { loadRepositoryMappings } from "./repository-mapping-store";
import { loadBasePath, loadCachedWorktreesBase, loadWorktreesBase } from "./worktree-store";

/**
 * worktree 一覧の base path を読み込む
 */
export async function loadBasePathInfra(context: WorktreeDeckContext): Promise<string> {
  return loadBasePath(context);
}

/**
 * repository mapping 一覧を読み込む
 */
export async function loadRepositoryMappingsInfra(): Promise<RepositoryMapping[]> {
  return loadRepositoryMappings();
}

/**
 * worktree 一覧を読み込む
 */
export async function loadWorktreesBaseInfra(basePath: string): Promise<Worktree[]> {
  return loadWorktreesBase(basePath);
}

/**
 * worktree 一覧 cache を検証せず読み込む
 */
export async function loadCachedWorktreesBaseInfra(basePath: string): Promise<Worktree[] | null> {
  return loadCachedWorktreesBase(basePath);
}
