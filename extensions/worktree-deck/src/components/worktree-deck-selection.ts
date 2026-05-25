import {
  PERSISTED_SELECTION_VERSION,
  type PersistedSelectionState,
  type SelectionItemKind,
} from "../application/worktree-deck-selection-state";
import { resolveEntryItemId, type SectionEntry } from "./worktree-deck-view-model";

/**
 * 起動時の選択復元フェーズ
 */
export type SelectionRestorePhase =
  | "loading-storage"
  | "waiting-first-list"
  | "applying-restored-selection"
  | "settling-list"
  | "ready";

export type { PersistedSelectionState };

/**
 * 一覧上の選択候補
 */
type SelectionItemAnchor = {
  itemId: string;
  kind: SelectionItemKind;
  path: string;
  originPath: string | null;
};

/**
 * 現在表示中の選択候補インデックス
 */
type SelectionIndex = {
  items: SelectionItemAnchor[];
  itemIds: string[];
  itemById: Map<string, SelectionItemAnchor>;
  originItemIdByPath: Map<string, string>;
  worktreeItemIdByPath: Map<string, string>;
  worktreeItemIdsByOriginPath: Map<string, string[]>;
  signature: string;
};

/**
 * 選択変更イベント受理判定の入力
 */
type SelectionChangeDecisionInput = {
  phase: SelectionRestorePhase;
  currentItemId: string | null;
  nextItemId: string | null;
};

/**
 * 初期復元ロック解除判定の入力
 */
type InitialSelectionUnlockInput = {
  phase: SelectionRestorePhase;
  isLoading: boolean;
  isTitlesLoading: boolean;
  isDetailsLoading: boolean;
  selectedItemId: string | null;
  availableItemIds: readonly string[];
};

/**
 * 初期選択復元適用の結果
 */
type InitialSelectionRestoreApplication = {
  selectedItemId: string | null;
  phase: SelectionRestorePhase;
};

/**
 * 選択変更イベントの処理方針
 */
type SelectionChangeDecision = "accept" | "ignore";

/**
 * 表示中セクションから選択候補インデックスを作る
 */
export function buildSelectionIndex(sections: readonly { entries: readonly SectionEntry[] }[]): SelectionIndex {
  const items: SelectionItemAnchor[] = [];
  const itemById = new Map<string, SelectionItemAnchor>();
  const originItemIdByPath = new Map<string, string>();
  const worktreeItemIdByPath = new Map<string, string>();
  const worktreeItemIdsByOriginPath = new Map<string, string[]>();

  for (const { entries } of sections) {
    for (const entry of entries) {
      const anchor = buildSelectionItemAnchor(entry);
      items.push(anchor);
      itemById.set(anchor.itemId, anchor);
      if (anchor.kind === "origin") {
        originItemIdByPath.set(anchor.path, anchor.itemId);
        continue;
      }
      worktreeItemIdByPath.set(anchor.path, anchor.itemId);
      if (anchor.originPath) {
        const list = worktreeItemIdsByOriginPath.get(anchor.originPath) ?? [];
        list.push(anchor.itemId);
        worktreeItemIdsByOriginPath.set(anchor.originPath, list);
      }
    }
  }

  const itemIds = items.map((item) => item.itemId);
  return {
    items,
    itemIds,
    itemById,
    originItemIdByPath,
    worktreeItemIdByPath,
    worktreeItemIdsByOriginPath,
    signature: itemIds.join("\n"),
  };
}

/**
 * 現在の選択状態を永続化形式へ変換する
 */
export function buildPersistedSelectionState(args: {
  basePath: string | null;
  selectedItemId: string | null;
  selectionIndex: SelectionIndex;
}): PersistedSelectionState | null {
  const basePath = args.basePath?.trim();
  const selectedItemId = args.selectedItemId?.trim();
  if (!basePath || !selectedItemId) {
    return null;
  }
  const anchor = args.selectionIndex.itemById.get(selectedItemId);
  if (!anchor) {
    return null;
  }
  return {
    version: PERSISTED_SELECTION_VERSION,
    basePath,
    itemId: anchor.itemId,
    kind: anchor.kind,
    path: anchor.path,
    originPath: anchor.originPath,
  };
}

/**
 * 永続化済み選択アンカーから現在の選択 ID を復元する
 */
export function resolveRestoredSelectionItemId(args: {
  currentBasePath: string | null;
  persistedSelection: PersistedSelectionState | null;
  selectionIndex: SelectionIndex;
}): string | null {
  const firstItemId = args.selectionIndex.itemIds[0] ?? null;
  if (!firstItemId) {
    return null;
  }
  if (!args.persistedSelection) {
    return firstItemId;
  }
  const currentBasePath = args.currentBasePath?.trim();
  const persistedBasePath = args.persistedSelection.basePath.trim();
  if (!currentBasePath || !persistedBasePath || currentBasePath !== persistedBasePath) {
    return firstItemId;
  }
  if (args.selectionIndex.itemById.has(args.persistedSelection.itemId)) {
    return args.persistedSelection.itemId;
  }
  const pathFallback = resolvePathFallbackSelectionItemId(args.persistedSelection, args.selectionIndex);
  if (pathFallback) {
    return pathFallback;
  }
  const originFallback = resolveOriginFallbackSelectionItemId(args.persistedSelection, args.selectionIndex);
  if (originFallback) {
    return originFallback;
  }
  return firstItemId;
}

/**
 * 一覧更新後のフォールバック選択 ID を解決する
 */
export function resolveFallbackSelectionItemId(args: {
  selectedItemId: string | null;
  selectionIndex: SelectionIndex;
}): string | null {
  if (args.selectionIndex.itemIds.length === 0) {
    return null;
  }
  const selectedItemId = args.selectedItemId?.trim();
  if (selectedItemId && args.selectionIndex.itemById.has(selectedItemId)) {
    return selectedItemId;
  }
  return args.selectionIndex.itemIds[0] ?? null;
}

/**
 * 初期一覧から復元選択を適用するか判定する
 */
export function resolveInitialSelectionRestoreApplication(args: {
  phase: SelectionRestorePhase;
  isLoading: boolean;
  currentBasePath: string | null;
  persistedSelection: PersistedSelectionState | null;
  selectionIndex: SelectionIndex;
}): InitialSelectionRestoreApplication | null {
  if (args.phase !== "waiting-first-list" || args.isLoading) {
    return null;
  }
  const selectedItemId = resolveRestoredSelectionItemId({
    currentBasePath: args.currentBasePath,
    persistedSelection: args.persistedSelection,
    selectionIndex: args.selectionIndex,
  });
  return {
    selectedItemId,
    phase: selectedItemId ? "applying-restored-selection" : "ready",
  };
}

/**
 * 初期復元後の追加読み込み完了に応じたフェーズを返す
 */
export function resolvePostLoadSelectionRestorePhase(args: {
  phase: SelectionRestorePhase;
  isLoading: boolean;
  isTitlesLoading: boolean;
  isDetailsLoading: boolean;
}): SelectionRestorePhase {
  if (args.phase !== "applying-restored-selection") {
    return args.phase;
  }
  if (args.isLoading || args.isTitlesLoading || args.isDetailsLoading) {
    return args.phase;
  }
  return "settling-list";
}

/**
 * 選択変更イベントをユーザー操作として扱うか判定する
 */
export function resolveSelectionChangeDecision(args: SelectionChangeDecisionInput): SelectionChangeDecision {
  if (args.phase !== "ready") {
    return "ignore";
  }
  const nextItemId = args.nextItemId?.trim();
  if (!nextItemId) {
    return "ignore";
  }
  return nextItemId === args.currentItemId?.trim() ? "ignore" : "accept";
}

/**
 * 初期選択保護を解除してよいか判定する
 */
export function shouldScheduleInitialSelectionUnlock(args: InitialSelectionUnlockInput): boolean {
  if (args.phase !== "settling-list") {
    return false;
  }
  if (args.isLoading || args.isTitlesLoading || args.isDetailsLoading) {
    return false;
  }
  const selectedItemId = args.selectedItemId?.trim();
  if (!selectedItemId) {
    return true;
  }
  return args.availableItemIds.includes(selectedItemId);
}

/**
 * List を controlled selection として扱う選択 ID を返す
 */
export function resolveControlledListSelectionItemId(args: {
  phase: SelectionRestorePhase;
  selectedItemId: string | null;
}): string | undefined {
  if (args.phase === "ready") {
    return undefined;
  }
  return args.selectedItemId?.trim() || undefined;
}

/**
 * 2つの選択状態が同一か判定する
 */
export function isSamePersistedSelectionState(
  current: PersistedSelectionState | null,
  next: PersistedSelectionState | null,
): boolean {
  if (!current || !next) {
    return current === next;
  }
  return (
    current.version === next.version &&
    current.basePath === next.basePath &&
    current.itemId === next.itemId &&
    current.kind === next.kind &&
    current.path === next.path &&
    current.originPath === next.originPath
  );
}

/**
 * 選択エントリから永続化用アンカーを作る
 */
function buildSelectionItemAnchor(entry: SectionEntry): SelectionItemAnchor {
  const itemId = resolveEntryItemId(entry);
  if (entry.kind === "origin") {
    return {
      itemId,
      kind: "origin",
      path: entry.originPath,
      originPath: entry.originPath,
    };
  }
  return {
    itemId,
    kind: "worktree",
    path: entry.item.path,
    originPath: entry.item.originPath?.trim() || null,
  };
}

/**
 * 保存済みパスに一致する選択候補を返す
 */
function resolvePathFallbackSelectionItemId(
  persistedSelection: PersistedSelectionState,
  selectionIndex: SelectionIndex,
): string | null {
  const path = persistedSelection.path.trim();
  if (!path) {
    return null;
  }
  if (persistedSelection.kind === "origin") {
    return selectionIndex.originItemIdByPath.get(path) ?? selectionIndex.worktreeItemIdByPath.get(path) ?? null;
  }
  return selectionIndex.worktreeItemIdByPath.get(path) ?? selectionIndex.originItemIdByPath.get(path) ?? null;
}

/**
 * 保存済み origin に一致する選択候補を返す
 */
function resolveOriginFallbackSelectionItemId(
  persistedSelection: PersistedSelectionState,
  selectionIndex: SelectionIndex,
): string | null {
  const originPath = persistedSelection.originPath?.trim();
  if (!originPath) {
    return null;
  }
  return (
    selectionIndex.originItemIdByPath.get(originPath) ??
    selectionIndex.worktreeItemIdsByOriginPath.get(originPath)?.[0] ??
    null
  );
}
