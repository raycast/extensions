import { describe, expect, it, vi } from "vitest";

import {
  worktreeMenuBarLifecycleUsecase,
  type WorktreeMenuBarLifecycleDependencies,
} from "./worktree-menu-bar-lifecycle.usecase";
import { WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE } from "../domain/worktree-menu-bar-lifecycle.service";

/**
 * lifecycle usecase のテスト用依存を作る
 */
function createDependencies(storedValue: unknown): WorktreeMenuBarLifecycleDependencies {
  return {
    loadStoppedValue: vi.fn(async () => storedValue),
    saveStoppedValue: vi.fn(async () => undefined),
    clearStoppedValue: vi.fn(async () => undefined),
  };
}

describe("worktreeMenuBarLifecycleUsecase", () => {
  it("停止済みの background 起動では停止状態を維持して描画しない", async () => {
    const dependencies = createDependencies(WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE);

    const shouldRender = await worktreeMenuBarLifecycleUsecase.resolveStartup({
      launchType: "background",
      dependencies,
    });

    expect(shouldRender).toBe(false);
    expect(dependencies.clearStoppedValue).not.toHaveBeenCalled();
  });

  it("停止済みのユーザー起動では停止状態を解除して描画する", async () => {
    const dependencies = createDependencies(WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE);

    const shouldRender = await worktreeMenuBarLifecycleUsecase.resolveStartup({
      launchType: "userInitiated",
      dependencies,
    });

    expect(shouldRender).toBe(true);
    expect(dependencies.clearStoppedValue).toHaveBeenCalledOnce();
  });

  it("停止操作では停止状態を保存する", async () => {
    const dependencies = createDependencies(undefined);

    await worktreeMenuBarLifecycleUsecase.stop({ dependencies });

    expect(dependencies.saveStoppedValue).toHaveBeenCalledOnce();
  });
});
