import { describe, expect, it } from "vitest";

import {
  WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE,
  worktreeMenuBarLifecycleService,
} from "./worktree-menu-bar-lifecycle.service";

describe("worktreeMenuBarLifecycleService", () => {
  it("停止状態でなければ描画を続ける", () => {
    const decision = worktreeMenuBarLifecycleService.resolveStartupDecision({
      storedValue: undefined,
      launchType: "background",
    });

    expect(decision).toEqual({
      shouldRender: true,
      shouldClearStopped: false,
    });
  });

  it("停止済みの background 起動ではメニューバーから消す", () => {
    const decision = worktreeMenuBarLifecycleService.resolveStartupDecision({
      storedValue: WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE,
      launchType: "background",
    });

    expect(decision).toEqual({
      shouldRender: false,
      shouldClearStopped: false,
    });
  });

  it("停止済みでもユーザー起動なら停止状態を解除して表示する", () => {
    const decision = worktreeMenuBarLifecycleService.resolveStartupDecision({
      storedValue: WORKTREE_MENU_BAR_STOPPED_STORAGE_VALUE,
      launchType: "userInitiated",
    });

    expect(decision).toEqual({
      shouldRender: true,
      shouldClearStopped: true,
    });
  });
});
