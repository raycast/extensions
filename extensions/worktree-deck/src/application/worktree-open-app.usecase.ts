import { worktreeOpenAppService, type WorktreeOpenApp } from "../domain/worktree-open-app.service";

/**
 * 起動アプリ取得依存ポート
 */
type LoadWorktreeOpenAppDependencies = {
  loadWorktreeOpenApp(worktreePath: string): Promise<WorktreeOpenApp | null>;
  loadOpenAppByWorktreePaths(paths: string[]): Promise<Map<string, WorktreeOpenApp>>;
};

/**
 * 起動アプリ保存依存ポート
 */
type SaveWorktreeOpenAppDependencies = {
  saveWorktreeOpenApp(args: { worktreePath: string; openApp: WorktreeOpenApp }): Promise<void>;
};

/**
 * worktree 起動依存ポート
 */
type OpenWorktreeInAppDependencies = {
  openPathInConfiguredIde(path: string): Promise<void>;
  openPathInCodexApp(path: string): Promise<void>;
};

/**
 * 固定アプリ起動結果
 */
type OpenWorktreeInPreferredAppResult = {
  preferenceSaved: boolean;
  savedMeta: { openApp: WorktreeOpenApp; threadId: string | null } | null;
};

/**
 * 固定アプリ起動依存ポート
 */
export type OpenWorktreeInPreferredAppDependencies = {
  openPathInConfiguredIde(path: string): Promise<void>;
  openPathInCodexApp(path: string): Promise<void>;
  openCodexThreadInApp(threadId: string): Promise<void>;
  saveOpenAppMetaForWorktreePath(
    path: string,
    openApp: WorktreeOpenApp,
    threadId?: string | null,
  ): Promise<{ openApp: WorktreeOpenApp; threadId: string | null } | null>;
};

/**
 * 単一 worktree の起動アプリ取得結果
 */
type LoadWorktreeOpenAppResult = {
  openApp: WorktreeOpenApp;
};

/**
 * 単一 worktree の起動アプリを取得する
 */
async function load(args: {
  query: { worktreePath: string };
  dependencies: LoadWorktreeOpenAppDependencies;
}): Promise<LoadWorktreeOpenAppResult> {
  const worktreePath = args.query.worktreePath.trim();
  if (!worktreePath) {
    return { openApp: "zed" };
  }
  const stored = await args.dependencies.loadWorktreeOpenApp(worktreePath);
  return { openApp: worktreeOpenAppService.resolvePreferred(stored) };
}

/**
 * 複数 worktree の起動アプリを取得する
 */
async function loadMap(args: {
  query: { paths: string[] };
  dependencies: LoadWorktreeOpenAppDependencies;
}): Promise<Map<string, WorktreeOpenApp>> {
  const paths = Array.from(new Set(args.query.paths.map((path) => path.trim()).filter(Boolean)));
  if (paths.length === 0) {
    return new Map();
  }
  const stored = await args.dependencies.loadOpenAppByWorktreePaths(paths);
  return new Map(paths.map((path) => [path, worktreeOpenAppService.resolvePreferred(stored.get(path))]));
}

/**
 * worktree の起動アプリを保存する
 */
async function save(args: {
  command: { worktreePath: string; openApp: WorktreeOpenApp };
  dependencies: SaveWorktreeOpenAppDependencies;
}): Promise<void> {
  const worktreePath = args.command.worktreePath.trim();
  const openApp = worktreeOpenAppService.normalizeOpenApp(args.command.openApp);
  if (!worktreePath || !openApp) {
    return;
  }
  await args.dependencies.saveWorktreeOpenApp({ worktreePath, openApp });
}

/**
 * 指定アプリで worktree を開く
 */
async function open(args: {
  command: { worktreePath: string; openApp: WorktreeOpenApp };
  dependencies: OpenWorktreeInAppDependencies;
}): Promise<void> {
  const worktreePath = args.command.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }
  const openApp = worktreeOpenAppService.resolvePreferred(args.command.openApp);
  if (openApp === "codex-app") {
    await args.dependencies.openPathInCodexApp(worktreePath);
    return;
  }
  await args.dependencies.openPathInConfiguredIde(worktreePath);
}

/**
 * 固定アプリ保存を非致命扱いで試みる
 */
async function trySaveOpenAppMeta(args: {
  worktreePath: string;
  openApp: WorktreeOpenApp;
  threadId?: string | null;
  dependencies: Pick<OpenWorktreeInPreferredAppDependencies, "saveOpenAppMetaForWorktreePath">;
}): Promise<{ openApp: WorktreeOpenApp; threadId: string | null } | null> {
  try {
    return await args.dependencies.saveOpenAppMetaForWorktreePath(args.worktreePath, args.openApp, args.threadId);
  } catch {
    return null;
  }
}

/**
 * 保存対象の固定アプリを保存してから worktree または Codex thread を開く
 *
 * Codex App 起動は外部プロセス側の都合で即座に戻らないことがあるため、
 * 起動後保存にすると Cmd+Enter で切り替えた設定が次回 Enter に反映されない。
 * 切り替え操作自体を設定変更として扱い、外部アプリ起動より先に保存する。
 */
async function openPreferred(args: {
  command: { worktreePath: string; openApp: WorktreeOpenApp; threadId?: string | null };
  dependencies: OpenWorktreeInPreferredAppDependencies;
}): Promise<OpenWorktreeInPreferredAppResult> {
  const worktreePath = args.command.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }
  const openApp = worktreeOpenAppService.resolvePreferred(args.command.openApp);
  if (openApp === "codex-app") {
    const threadId = worktreeOpenAppService.normalizeThreadId(args.command.threadId);
    if (threadId !== null && threadId.length > 0) {
      const savedMeta = await trySaveOpenAppMeta({
        worktreePath,
        openApp,
        threadId,
        dependencies: args.dependencies,
      });
      await args.dependencies.openCodexThreadInApp(threadId);
      return { preferenceSaved: savedMeta !== null, savedMeta };
    }
    const savedMeta = await trySaveOpenAppMeta({
      worktreePath,
      openApp,
      threadId: null,
      dependencies: args.dependencies,
    });
    await args.dependencies.openPathInCodexApp(worktreePath);
    return { preferenceSaved: savedMeta !== null, savedMeta };
  }
  const savedMeta = await trySaveOpenAppMeta({
    worktreePath,
    openApp,
    dependencies: args.dependencies,
  });
  await args.dependencies.openPathInConfiguredIde(worktreePath);
  return { preferenceSaved: savedMeta !== null, savedMeta };
}

/**
 * worktree 起動アプリユースケース関数群
 */
export const worktreeOpenAppUsecase = {
  load,
  loadMap,
  open,
  openPreferred,
  save,
} as const;
