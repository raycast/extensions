import { basename } from "node:path";

/**
 * repository mapping の値オブジェクト
 */
export type RepositoryMapping = {
  repoRoot: string;
  mapValue: string;
};

/**
 * repository mapping の入力型
 */
export type RepositoryMappingInput = {
  repoRoot: unknown;
  mapValue: unknown;
};

/**
 * repository mapping の要素を正規化する
 */
function normalize(entries: RepositoryMappingInput[]): RepositoryMapping[] {
  const mappingByRoot = new Map<string, RepositoryMapping>();
  for (const entry of entries) {
    const repoRoot = typeof entry.repoRoot === "string" ? entry.repoRoot.trim() : "";
    if (!repoRoot) {
      continue;
    }
    const rawValue = typeof entry.mapValue === "string" ? entry.mapValue.trim() : "";
    mappingByRoot.set(repoRoot, {
      repoRoot,
      mapValue: rawValue || basename(repoRoot),
    });
  }
  return Array.from(mappingByRoot.values());
}

/**
 * repository mapping を安定ソートする
 */
function sort(entries: RepositoryMapping[]): RepositoryMapping[] {
  return [...entries].sort((left, right) => {
    const valueDiff = left.mapValue.localeCompare(right.mapValue);
    if (valueDiff !== 0) {
      return valueDiff;
    }
    return left.repoRoot.localeCompare(right.repoRoot);
  });
}

/**
 * 保存値を mapping 配列へ変換する
 */
function parseFromStorageValue(value: unknown): RepositoryMapping[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (typeof value === "string") {
    try {
      return parseFromStorageValue(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return normalize(value as RepositoryMappingInput[]);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("repoRoot" in record) {
      return normalize([{ repoRoot: record.repoRoot, mapValue: record.mapValue }]);
    }
    const entries = Object.entries(record).map(([repoRoot, mapValue]) => ({ repoRoot, mapValue }));
    return normalize(entries);
  }
  return [];
}

/**
 * repository mapping ドメインサービス関数群
 */
export const repositoryMappingService = {
  normalize,
  sort,
  parseFromStorageValue,
} as const;
