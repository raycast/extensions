/**
 * worktree を開く IDE アプリケーション
 */
export type WorktreeIdeApp = "zed" | "vscode" | "cursor";

/**
 * IDE アプリケーションの表示定義
 */
const WORKTREE_IDE_APP_DEFINITIONS = {
  zed: {
    title: "Zed",
  },
  vscode: {
    title: "VS Code",
  },
  cursor: {
    title: "Cursor",
  },
} as const satisfies Record<WorktreeIdeApp, { title: string }>;

/**
 * IDE アプリケーション値を正規化する
 */
function normalizeIdeApp(value: unknown): WorktreeIdeApp | null {
  if (value === "zed" || value === "vscode" || value === "cursor") {
    return value;
  }
  return null;
}

/**
 * 未保存時の IDE アプリケーションを解決する
 */
function resolvePreferred(value: WorktreeIdeApp | null | undefined): WorktreeIdeApp {
  return value ?? "zed";
}

/**
 * IDE アプリケーションの表示名を返す
 */
function formatIdeAppLabel(ideApp: WorktreeIdeApp): string {
  return WORKTREE_IDE_APP_DEFINITIONS[ideApp].title;
}

/**
 * IDE アプリケーションの選択肢を返す
 */
function listIdeAppOptions(): { value: WorktreeIdeApp; title: string }[] {
  return (Object.keys(WORKTREE_IDE_APP_DEFINITIONS) as WorktreeIdeApp[]).map((value) => ({
    value,
    title: formatIdeAppLabel(value),
  }));
}

/**
 * worktree IDE アプリケーションのドメインサービス関数群
 */
export const worktreeIdeAppService = {
  formatIdeAppLabel,
  listIdeAppOptions,
  normalizeIdeApp,
  resolvePreferred,
} as const;
