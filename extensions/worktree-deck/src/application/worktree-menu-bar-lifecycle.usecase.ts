import { worktreeMenuBarLifecycleService } from "../domain/worktree-menu-bar-lifecycle.service";

/**
 * worktree status メニューバー停止状態の永続化依存
 */
export type WorktreeMenuBarLifecycleDependencies = {
  loadStoppedValue(): Promise<unknown>;
  saveStoppedValue(): Promise<void>;
  clearStoppedValue(): Promise<void>;
};

/**
 * worktree status メニューバーの起動時描画可否を判定する
 */
async function resolveStartup(args: {
  launchType: string;
  dependencies: WorktreeMenuBarLifecycleDependencies;
}): Promise<boolean> {
  const stoppedValue = await args.dependencies.loadStoppedValue();
  const decision = worktreeMenuBarLifecycleService.resolveStartupDecision({
    storedValue: stoppedValue,
    launchType: args.launchType,
  });
  if (decision.shouldClearStopped) {
    await args.dependencies.clearStoppedValue();
  }
  return decision.shouldRender;
}

/**
 * worktree status メニューバーの停止状態を保存する
 */
async function stop(args: { dependencies: WorktreeMenuBarLifecycleDependencies }): Promise<void> {
  await args.dependencies.saveStoppedValue();
}

/**
 * worktree status メニューバー lifecycle のユースケース
 */
export const worktreeMenuBarLifecycleUsecase = {
  resolveStartup,
  stop,
} as const;
