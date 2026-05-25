import { LocalStorage } from "@raycast/api";

import {
  worktreeMenuBarSummaryService,
  type WorktreeMenuBarSummarySnapshot,
} from "../domain/worktree-menu-bar-summary.service";

/**
 * メニューバーの直近正常値を保存する LocalStorage キー
 */
const LAST_SUMMARY_STORAGE_KEY = "worktree-deck.menu-bar.last-summary.v1";

/**
 * 直近正常値を保存する
 */
export async function saveStoredWorktreeMenuBarSummary(snapshot: WorktreeMenuBarSummarySnapshot): Promise<void> {
  await LocalStorage.setItem(LAST_SUMMARY_STORAGE_KEY, JSON.stringify(snapshot));
}

/**
 * 直近正常値を読み込む
 */
export async function loadStoredWorktreeMenuBarSummary(): Promise<WorktreeMenuBarSummarySnapshot | null> {
  const raw = await LocalStorage.getItem<string>(LAST_SUMMARY_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return worktreeMenuBarSummaryService.normalizeStoredSummary(JSON.parse(raw));
  } catch {
    return null;
  }
}
