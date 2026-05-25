/**
 * 保存する選択状態の形式バージョン
 */
export const PERSISTED_SELECTION_VERSION = 1;

/**
 * 選択エントリの種類
 */
export type SelectionItemKind = "origin" | "worktree";

/**
 * 永続化する選択アンカー
 */
export type PersistedSelectionState = {
  version: typeof PERSISTED_SELECTION_VERSION;
  basePath: string;
  itemId: string;
  kind: SelectionItemKind;
  path: string;
  originPath: string | null;
};

/**
 * 選択状態キャッシュを型安全に正規化する
 */
export function normalizePersistedSelectionState(raw: unknown): PersistedSelectionState | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const rawValue = raw as Record<string, unknown>;
  const version = rawValue.version;
  const basePath = typeof rawValue.basePath === "string" ? rawValue.basePath.trim() : "";
  const itemId = typeof rawValue.itemId === "string" ? rawValue.itemId.trim() : "";
  const kind = rawValue.kind === "origin" || rawValue.kind === "worktree" ? rawValue.kind : null;
  const path = typeof rawValue.path === "string" ? rawValue.path.trim() : "";
  const originPath =
    typeof rawValue.originPath === "string" ? rawValue.originPath.trim() : rawValue.originPath == null ? null : "";
  if (version !== PERSISTED_SELECTION_VERSION || !basePath || !itemId || !kind || !path || originPath === "") {
    return null;
  }
  return {
    version: PERSISTED_SELECTION_VERSION,
    basePath,
    itemId,
    kind,
    path,
    originPath,
  };
}
