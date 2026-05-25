/**
 * worktree status メニューバー停止状態の保存値
 */
export const WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE = "stopped";

/**
 * worktree status メニューバー起動時の描画判断
 */
export type WorktreeMenuBarStartupDecision = {
  shouldRender: boolean;
  shouldClearStopped: boolean;
};

/**
 * 停止済みの worktree status を再表示する必要があるか判定する
 */
function resolveStartupDecision(args: { storedValue: unknown; launchType: string }): WorktreeMenuBarStartupDecision {
  if (args.storedValue !== WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE) {
    return {
      shouldRender: true,
      shouldClearStopped: false,
    };
  }
  if (args.launchType === "userInitiated") {
    return {
      shouldRender: true,
      shouldClearStopped: true,
    };
  }
  return {
    shouldRender: false,
    shouldClearStopped: false,
  };
}

/**
 * worktree status メニューバー lifecycle の関数群
 */
export const worktreeMenuBarLifecycleService = {
  resolveStartupDecision,
} as const;
