import { expandHomePath, normalizePathValue } from "./path-utils";

/**
 * mapping 判定で利用する worktree の最小構造
 */
type WorktreeFilterItem = {
  path: string;
  originPath: string | null | undefined;
};

/**
 * mapping 判定で利用する repository mapping の最小構造
 */
type WorktreeFilterMapping = {
  repoRoot: string;
};

/**
 * mapping の repoRoot を正規化して集合化する
 */
function buildMappedRepoRootSet(mappings: WorktreeFilterMapping[], homeDir: string | null): Set<string> {
  const results = new Set<string>();
  for (const mapping of mappings) {
    const repoRoot = mapping.repoRoot?.trim();
    if (!repoRoot) {
      continue;
    }
    const expanded = expandHomePath(repoRoot, homeDir);
    results.add(normalizePathValue(expanded));
  }
  return results;
}

/**
 * mapping の repoRoot と一致する worktree だけを返す
 */
function filterByMappings<TItem extends WorktreeFilterItem>(args: {
  worktrees: TItem[];
  mappings: WorktreeFilterMapping[];
  homeDir: string | null;
}): TItem[] {
  const mappedRoots = buildMappedRepoRootSet(args.mappings, args.homeDir);
  if (mappedRoots.size === 0) {
    return [];
  }
  return args.worktrees.filter((item) => {
    const originPath = item.originPath === null || item.originPath === undefined ? "" : item.originPath.trim();
    const targetPath = originPath.length > 0 ? originPath : item.path;
    const normalized = normalizePathValue(targetPath);
    return mappedRoots.has(normalized);
  });
}

/**
 * worktree 絞り込みドメインサービス関数群
 */
export const worktreeFilterService = {
  filterByMappings,
} as const;
