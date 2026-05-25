/**
 * Codex App 起動ユースケースの依存ポート
 */
export type OpenCodexAppDependencies = {
  openPathInCodexApp(path: string): Promise<void>;
};

/**
 * Codex App で指定パスを開く
 */
async function open(args: { path: string; dependencies: OpenCodexAppDependencies }): Promise<void> {
  const path = args.path.trim();
  if (!path) {
    throw new Error("Worktree path is required.");
  }
  await args.dependencies.openPathInCodexApp(path);
}

/**
 * Codex App 起動ユースケース関数群
 */
export const openCodexAppUsecase = {
  open,
} as const;
