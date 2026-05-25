import { LocalStorage } from "@raycast/api";

import {
  normalizePersistedSelectionState,
  type PersistedSelectionState,
} from "../application/worktree-deck-selection-state";

/**
 * 選択状態キャッシュのキー
 */
const SELECTION_CACHE_KEY = "worktree-deck.selection";

/**
 * 選択状態キャッシュを読み込む
 */
export async function loadPersistedSelectionFromStorage(): Promise<PersistedSelectionState | null> {
  try {
    const raw = await LocalStorage.getItem<string>(SELECTION_CACHE_KEY);
    if (!raw) {
      return null;
    }
    return normalizePersistedSelectionState(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/**
 * 選択状態キャッシュを保存する
 */
export async function savePersistedSelectionToStorage(value: PersistedSelectionState): Promise<void> {
  try {
    await LocalStorage.setItem(SELECTION_CACHE_KEY, JSON.stringify(value));
  } catch {
    // キャッシュ保存失敗は UI を止めない
  }
}
