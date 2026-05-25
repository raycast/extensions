import type { WorktreeMenuBarLifecycleDependencies } from "../application/worktree-menu-bar-lifecycle.usecase";
import {
  clearWorktreeMenuBarStoppedValue,
  loadWorktreeMenuBarStoppedValue,
  saveWorktreeMenuBarStoppedValue,
} from "../infrastructure/worktree-menu-bar-lifecycle-store";

/**
 * worktree status メニューバー lifecycle の既定依存を作る
 */
export function createDefaultWorktreeMenuBarLifecycleDependencies(): WorktreeMenuBarLifecycleDependencies {
  return {
    loadStoppedValue: loadWorktreeMenuBarStoppedValue,
    saveStoppedValue: saveWorktreeMenuBarStoppedValue,
    clearStoppedValue: clearWorktreeMenuBarStoppedValue,
  };
}
