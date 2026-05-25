import { Action, ActionPanel, Color, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import type { WorktreeTitle } from "../composition-root";
import { worktreeOpenAppService } from "../domain/worktree-open-app.service";

/**
 * Codex App セッション選択アクションのタイトル
 */
export const SELECT_CODEX_SESSION_ACTION_TITLE = "Select CA Session";

/**
 * ワークツリーを IDE で開くアクションのタイトルを返す
 */
export function formatOpenWorktreeInIdeActionTitle(ideAppTitle = "Zed"): string {
  return `Open in ${ideAppTitle}`;
}

/**
 * Codex App セッション選択肢
 */
type CodexSessionEntry = {
  id: string;
  title: string;
  subtitle: string | null;
  threadId: string;
  sessionPath: string;
  updatedAt: number;
  icon: { source: Icon; tintColor?: Color };
  statusText: string | null;
  isArchived: boolean;
};

/**
 * Codex App 起動方法の判定結果
 */
type CodexSessionOpenPlan =
  | { kind: "open-path" }
  | { kind: "open-thread"; threadId: string }
  | { kind: "select"; entries: CodexSessionEntry[] };

/**
 * セッションアーカイブの表示条件
 */
type CodexSessionArchiveVisibility = "visible" | "archived" | "all";

/**
 * Codex App セッション選択肢の構築オプション
 */
type BuildCodexSessionEntriesOptions = {
  archivedThreadIds?: ReadonlySet<string>;
  visibility?: CodexSessionArchiveVisibility;
};

/**
 * セッションアーカイブ表示状態の移動方向
 */
type CodexSessionArchiveMoveDirection = "archive" | "unarchive";

/**
 * セッションアーカイブ表示状態
 */
type CodexSessionArchiveDisplayState = {
  visibleEntries: CodexSessionEntry[];
  archivedEntries: CodexSessionEntry[];
};

/**
 * セッションアーカイブ表示状態の移動結果
 */
type CodexSessionArchiveMoveResult = CodexSessionArchiveDisplayState & {
  movedEntry: CodexSessionEntry | null;
};

/**
 * メインセッションか判定する
 */
function isMainSession(session: WorktreeTitle): boolean {
  return session.sessionKind === "main";
}

/**
 * Codex App で開けるメインセッション選択肢を作る
 */
export function buildCodexSessionEntries(
  sessions: WorktreeTitle[],
  options: BuildCodexSessionEntriesOptions = {},
): CodexSessionEntry[] {
  const visibility = options.visibility ?? "visible";
  return sessions
    .filter(isMainSession)
    .map((session) => {
      const sessionPath = session.sessionPath?.trim() ?? "";
      const threadId = worktreeOpenAppService.extractThreadIdFromSessionPath(sessionPath);
      if (!sessionPath || threadId === null) {
        return null;
      }
      const isArchived = options.archivedThreadIds?.has(threadId) ?? false;
      if (visibility === "visible" && isArchived) {
        return null;
      }
      if (visibility === "archived" && !isArchived) {
        return null;
      }
      const status = resolveCodexSessionStatus(session);
      return {
        id: threadId,
        title: session.title,
        subtitle: session.latestMessage,
        threadId,
        sessionPath,
        updatedAt: session.updatedAt,
        icon: { source: Icon.Message, tintColor: status.tintColor },
        statusText: status.text,
        isArchived,
      };
    })
    .filter((entry): entry is CodexSessionEntry => entry !== null)
    .sort((left, right) => {
      if (right.updatedAt !== left.updatedAt) {
        return right.updatedAt - left.updatedAt;
      }
      return left.title.localeCompare(right.title);
    });
}

/**
 * Codex App の起動方法をセッション候補から決める
 */
export function resolveCodexSessionOpenPlan(args: {
  sessions: WorktreeTitle[];
  storedThreadId: string | null;
  archivedThreadIds?: ReadonlySet<string>;
}): CodexSessionOpenPlan {
  const normalizedThreadId = worktreeOpenAppService.normalizeThreadId(args.storedThreadId);
  const entries = buildCodexSessionEntries(args.sessions, { archivedThreadIds: args.archivedThreadIds });
  if (normalizedThreadId && entries.some((entry) => entry.threadId === normalizedThreadId)) {
    return { kind: "open-thread", threadId: normalizedThreadId };
  }
  const archivedEntries = buildCodexSessionEntries(args.sessions, {
    archivedThreadIds: args.archivedThreadIds,
    visibility: "archived",
  });
  if (entries.length > 1 || archivedEntries.length > 0) {
    return { kind: "select", entries };
  }
  if (entries.length === 1) {
    return { kind: "open-thread", threadId: entries[0].threadId };
  }
  if (normalizedThreadId) {
    if (args.archivedThreadIds?.has(normalizedThreadId) === true) {
      return { kind: "open-path" };
    }
    return { kind: "open-thread", threadId: normalizedThreadId };
  }
  return { kind: "open-path" };
}

/**
 * セッションアーカイブ操作を表示状態へ反映する
 */
export function applyCodexSessionArchiveMove(
  args: CodexSessionArchiveDisplayState & {
    threadId: string;
    direction: CodexSessionArchiveMoveDirection;
  },
): CodexSessionArchiveMoveResult {
  if (args.direction === "archive") {
    const movedEntry = args.visibleEntries.find((entry) => entry.threadId === args.threadId) ?? null;
    if (!movedEntry) {
      return { visibleEntries: args.visibleEntries, archivedEntries: args.archivedEntries, movedEntry: null };
    }
    return {
      visibleEntries: args.visibleEntries.filter((entry) => entry.threadId !== args.threadId),
      archivedEntries: [{ ...movedEntry, isArchived: true }, ...args.archivedEntries].sort(compareCodexSessionEntries),
      movedEntry,
    };
  }

  const movedEntry = args.archivedEntries.find((entry) => entry.threadId === args.threadId) ?? null;
  if (!movedEntry) {
    return { visibleEntries: args.visibleEntries, archivedEntries: args.archivedEntries, movedEntry: null };
  }
  return {
    visibleEntries: [{ ...movedEntry, isArchived: false }, ...args.visibleEntries].sort(compareCodexSessionEntries),
    archivedEntries: args.archivedEntries.filter((entry) => entry.threadId !== args.threadId),
    movedEntry,
  };
}

/**
 * セッションアーカイブ保存失敗時に表示状態を戻す
 */
export function applyCodexSessionArchiveRollback(
  args: CodexSessionArchiveDisplayState & {
    movedEntry: CodexSessionEntry | null;
    direction: CodexSessionArchiveMoveDirection;
  },
): CodexSessionArchiveDisplayState {
  if (!args.movedEntry) {
    return { visibleEntries: args.visibleEntries, archivedEntries: args.archivedEntries };
  }
  if (args.direction === "archive") {
    return {
      visibleEntries: [{ ...args.movedEntry, isArchived: false }, ...args.visibleEntries].sort(
        compareCodexSessionEntries,
      ),
      archivedEntries: args.archivedEntries.filter((entry) => entry.threadId !== args.movedEntry?.threadId),
    };
  }
  return {
    visibleEntries: args.visibleEntries.filter((entry) => entry.threadId !== args.movedEntry?.threadId),
    archivedEntries: [{ ...args.movedEntry, isArchived: true }, ...args.archivedEntries].sort(
      compareCodexSessionEntries,
    ),
  };
}

type CodexSessionSelectViewProps = {
  title: string;
  worktreePath: string;
  entries: CodexSessionEntry[];
  archivedEntries: CodexSessionEntry[];
  ideAppTitle?: string;
  onArchiveSession: (threadId: string) => Promise<void>;
  onUnarchiveSession: (threadId: string) => Promise<void>;
  onOpenSession: (threadId: string) => Promise<void>;
  onOpenWorktreeInZed: () => Promise<void>;
};

/**
 * Codex App で開くメインセッションを選択する画面
 */
export function CodexSessionSelectView({
  title,
  worktreePath,
  entries,
  archivedEntries,
  ideAppTitle = "Zed",
  onArchiveSession,
  onUnarchiveSession,
  onOpenSession,
  onOpenWorktreeInZed,
}: CodexSessionSelectViewProps) {
  const { pop } = useNavigation();
  const [visibleEntries, setVisibleEntries] = useState(entries);
  const [restorableEntries, setRestorableEntries] = useState(archivedEntries);
  const handleOpenSession = useCallback(
    async (threadId: string): Promise<void> => {
      try {
        await onOpenSession(threadId);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open session",
          message: "Could not open the selected Codex session.",
        });
      }
    },
    [onOpenSession],
  );
  const handleOpenWorktreeInZed = useCallback(async (): Promise<void> => {
    try {
      await onOpenWorktreeInZed();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open worktree",
        message: `Could not open the worktree in ${ideAppTitle}.`,
      });
    }
  }, [onOpenWorktreeInZed]);
  const handleArchiveSession = useCallback(
    async (threadId: string): Promise<void> => {
      const moved = applyCodexSessionArchiveMove({
        visibleEntries,
        archivedEntries: restorableEntries,
        threadId,
        direction: "archive",
      });
      if (!moved.movedEntry) {
        return;
      }
      setVisibleEntries(moved.visibleEntries);
      setRestorableEntries(moved.archivedEntries);
      try {
        await onArchiveSession(threadId);
      } catch {
        const rollback = applyCodexSessionArchiveRollback({ ...moved, direction: "archive" });
        setVisibleEntries(rollback.visibleEntries);
        setRestorableEntries(rollback.archivedEntries);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to archive session",
          message: "Could not archive the selected Codex session.",
        });
      }
    },
    [onArchiveSession, restorableEntries, visibleEntries],
  );
  const handleUnarchiveSession = useCallback(
    async (threadId: string): Promise<void> => {
      const moved = applyCodexSessionArchiveMove({
        visibleEntries,
        archivedEntries: restorableEntries,
        threadId,
        direction: "unarchive",
      });
      if (!moved.movedEntry) {
        return;
      }
      setVisibleEntries(moved.visibleEntries);
      setRestorableEntries(moved.archivedEntries);
      try {
        await onUnarchiveSession(threadId);
      } catch {
        const rollback = applyCodexSessionArchiveRollback({ ...moved, direction: "unarchive" });
        setVisibleEntries(rollback.visibleEntries);
        setRestorableEntries(rollback.archivedEntries);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to unarchive session",
          message: "Could not restore the selected Codex session.",
        });
      }
    },
    [onUnarchiveSession, restorableEntries, visibleEntries],
  );

  return (
    <List navigationTitle={`${title} CA Sessions`} searchBarPlaceholder="Search sessions">
      <List.EmptyView title="No main sessions" description="No main Codex sessions were found for this worktree." />
      <List.Section title="Sessions">
        {visibleEntries.map((entry) => (
          <CodexSessionListItem
            key={entry.id}
            entry={entry}
            worktreePath={worktreePath}
            onOpenSession={handleOpenSession}
            onOpenWorktreeInZed={handleOpenWorktreeInZed}
            ideAppTitle={ideAppTitle}
            onArchiveSession={handleArchiveSession}
            onUnarchiveSession={handleUnarchiveSession}
            onBack={pop}
          />
        ))}
      </List.Section>
      {restorableEntries.length > 0 ? (
        <List.Section title="Archived Sessions">
          {restorableEntries.map((entry) => (
            <CodexSessionListItem
              key={entry.id}
              entry={entry}
              worktreePath={worktreePath}
              onOpenSession={handleOpenSession}
              onOpenWorktreeInZed={handleOpenWorktreeInZed}
              ideAppTitle={ideAppTitle}
              onArchiveSession={handleArchiveSession}
              onUnarchiveSession={handleUnarchiveSession}
              onBack={pop}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

/**
 * セッション選択肢を更新時刻降順で並べる
 */
function compareCodexSessionEntries(left: CodexSessionEntry, right: CodexSessionEntry): number {
  if (right.updatedAt !== left.updatedAt) {
    return right.updatedAt - left.updatedAt;
  }
  return left.title.localeCompare(right.title);
}

type CodexSessionListItemProps = {
  entry: CodexSessionEntry;
  worktreePath: string;
  onOpenSession: (threadId: string) => Promise<void>;
  onOpenWorktreeInZed: () => Promise<void>;
  ideAppTitle: string;
  onArchiveSession: (threadId: string) => Promise<void>;
  onUnarchiveSession: (threadId: string) => Promise<void>;
  onBack: () => void;
};

/**
 * Codex App セッション選択画面の1行を表示する
 */
function CodexSessionListItem({
  entry,
  worktreePath,
  onOpenSession,
  onOpenWorktreeInZed,
  ideAppTitle,
  onArchiveSession,
  onUnarchiveSession,
  onBack,
}: CodexSessionListItemProps) {
  return (
    <List.Item
      key={entry.id}
      id={entry.id}
      title={entry.title}
      subtitle={entry.subtitle ?? undefined}
      icon={entry.icon}
      accessories={buildSessionAccessories(entry)}
      actions={
        <ActionPanel>
          <Action title="Open in CA" icon={Icon.Terminal} onAction={() => void onOpenSession(entry.threadId)} />
          <Action
            title={formatOpenWorktreeInIdeActionTitle(ideAppTitle)}
            icon={Icon.Code}
            onAction={() => void onOpenWorktreeInZed()}
          />
          {entry.isArchived ? (
            <Action
              title="Unarchive Session"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => void onUnarchiveSession(entry.threadId)}
            />
          ) : (
            <Action
              title="Archive Session"
              icon={Icon.Archive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => void onArchiveSession(entry.threadId)}
            />
          )}
          <Action.CopyToClipboard title="Copy Thread ID" icon={Icon.Clipboard} content={entry.threadId} />
          <Action.CopyToClipboard title="Copy Session Path" icon={Icon.Clipboard} content={entry.sessionPath} />
          <Action.CopyToClipboard title="Copy Worktree Path" icon={Icon.Clipboard} content={worktreePath} />
          <Action
            title="Back to List"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            onAction={() => onBack()}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Codex セッションの状態表示を解決する
 */
function resolveCodexSessionStatus(session: WorktreeTitle): { text: string | null; tintColor?: Color } {
  if (session.isWaitingForUser === true) {
    return { text: "Waiting", tintColor: Color.Yellow };
  }
  if (session.status === "working") {
    return { text: "Working", tintColor: Color.Green };
  }
  if (session.status === "done") {
    return { text: "Done", tintColor: Color.Blue };
  }
  return { text: null };
}

/**
 * セッション選択画面の補助表示を組み立てる
 */
function buildSessionAccessories(entry: CodexSessionEntry): List.Item.Accessory[] {
  const updatedAtText = formatUpdatedAt(entry.updatedAt);
  return [
    entry.statusText ? { text: entry.statusText, icon: entry.icon } : null,
    updatedAtText ? { text: updatedAtText } : null,
  ].filter((accessory): accessory is List.Item.Accessory => accessory !== null);
}

/**
 * 更新日時を Raycast 表示用に整形する
 */
function formatUpdatedAt(updatedAt: number): string {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return "";
  }
  return new Date(updatedAt).toLocaleString();
}
