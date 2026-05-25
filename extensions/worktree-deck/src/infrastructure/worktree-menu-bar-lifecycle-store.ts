import { LocalStorage } from "@raycast/api";

import { WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE } from "../domain/worktree-menu-bar-lifecycle.service";

/**
 * worktree status メニューバーの停止状態保存キー
 */
const WORKTREE_MENU_BAR_STOPPED_STORAGE_KEY = "worktree-status-menu-bar.stopped.v1";

/**
 * worktree status メニューバーの停止状態を読み込む
 */
export async function loadWorktreeMenuBarStoppedValue(): Promise<unknown> {
  return LocalStorage.getItem(WORKTREE_MENU_BAR_STOPPED_STORAGE_KEY);
}

/**
 * worktree status メニューバーの停止状態を保存する
 */
export async function saveWorktreeMenuBarStoppedValue(): Promise<void> {
  await LocalStorage.setItem(WORKTREE_MENU_BAR_STOPPED_STORAGE_KEY, WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE);
}

/**
 * worktree status メニューバーの停止状態を解除する
 */
export async function clearWorktreeMenuBarStoppedValue(): Promise<void> {
  await LocalStorage.removeItem(WORKTREE_MENU_BAR_STOPPED_STORAGE_KEY);
}
