/**
 * メニューバーで集計するセッション状態
 */
type MenuBarSessionStatus = "working" | "done";

/**
 * メニューバー集計に必要なセッション情報
 */
export type WorktreeMenuBarTitleEntry = {
  status: MenuBarSessionStatus | null;
  isWaitingForUser: boolean;
};

/**
 * メニューバー集計対象の worktree
 */
export type WorktreeMenuBarItem = {
  titleEntries: WorktreeMenuBarTitleEntry[];
};

/**
 * メニューバーに表示する状態別件数
 */
export type WorktreeMenuBarStatusSummary = {
  blue: number;
  green: number;
  yellow: number;
};

/**
 * worktree のセッション一覧をメニューバー表示用の色に変換する
 */
function resolveColor(item: WorktreeMenuBarItem): keyof WorktreeMenuBarStatusSummary | null {
  if (item.titleEntries.length === 0) {
    return null;
  }
  if (item.titleEntries.some((entry) => entry.isWaitingForUser === true)) {
    return "yellow";
  }
  const latest = item.titleEntries[0];
  if (latest.status === "done") {
    return "blue";
  }
  if (latest.status === "working") {
    return "green";
  }
  return null;
}

/**
 * worktree 一覧をメニューバー表示用の件数へ集計する
 */
function summarize(items: WorktreeMenuBarItem[]): WorktreeMenuBarStatusSummary {
  const summary: WorktreeMenuBarStatusSummary = {
    blue: 0,
    green: 0,
    yellow: 0,
  };
  for (const item of items) {
    const color = resolveColor(item);
    if (!color) {
      continue;
    }
    summary[color] += 1;
  }
  return summary;
}

/**
 * メニューバータイトル用の短い集計文字列を組み立てる
 */
function formatTitle(summary: WorktreeMenuBarStatusSummary): string {
  return `🔵${summary.blue} 🟢${summary.green} 🟡${summary.yellow}`;
}

/**
 * worktree メニューバー状態集計の関数群
 */
export const worktreeMenuBarStatusService = {
  formatTitle,
  summarize,
} as const;
