import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  type Keyboard,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { dirname } from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveWorktreeDeckCompositionRoot, type SessionMessage, type WorktreeTitle } from "../composition-root";
import { sessionDetailUsecase } from "../application/session-detail.usecase";
import { worktreeSessionFileUsecase } from "../application/worktree-session-file.usecase";

const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();

type SessionDetailViewProps = {
  title: string;
  sessions: WorktreeTitle[];
  homeDir: string | null;
};

type SessionEntry = {
  id: string;
  title: string;
  sessionPath: string | null;
  icon: { source: Icon; tintColor?: Color };
  skillUsages: NonNullable<WorktreeTitle["skillUsages"]>;
};

/**
 * セッション詳細で使う主アクションのタイトル
 */
export const PRIMARY_SESSION_ACTION_TITLE = "Show Session Content";

/**
 * セッション詳細で使う主アクションのショートカット
 */
export const PRIMARY_SESSION_ACTION_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "l" };

/**
 * セッション詳細で使う副アクションのタイトル
 */
export const SECONDARY_SESSION_ACTION_TITLE = "Open Session File";

/**
 * セッション詳細の表示データを整形する
 */
export function buildSessionEntries(sessions: WorktreeTitle[]): SessionEntry[] {
  return sessions.map((session) => {
    const sessionPath = session.sessionPath ?? null;
    const id = sessionPath ?? `${session.title}-${session.updatedAt}`;
    return {
      id,
      title: session.title,
      sessionPath,
      icon: {
        source: Icon.Message,
        tintColor: resolveSessionStatusTint(session.status),
      },
      skillUsages: session.skillUsages ?? [],
    };
  });
}

/**
 * セッションステータスをアイコン色に変換する
 */
export function resolveSessionStatusTint(status: WorktreeTitle["status"]): Color | undefined {
  switch (status) {
    case "working":
      return Color.Green;
    case "done":
      return Color.Blue;
    default:
      return undefined;
  }
}

/**
 * セッションファイルとフォルダの開き先を解決する
 */
export function resolveSessionOpenTargets(
  sessionPath: string,
): { sessionFilePath: string; sessionDirectoryPath: string } | null {
  const sessionFilePath = sessionPath.trim();
  if (!sessionFilePath) {
    return null;
  }
  return {
    sessionFilePath,
    sessionDirectoryPath: dirname(sessionFilePath),
  };
}

/**
 * セッション詳細画面を構築する
 */
export function SessionDetailView({ title, sessions, homeDir }: SessionDetailViewProps) {
  const { pop } = useNavigation();
  const entries = useMemo(() => buildSessionEntries(sessions), [sessions]);
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null);
  const [messagesByPath, setMessagesByPath] = useState<Record<string, SessionMessage[] | null>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setSelectedId(entries[0]?.id ?? null);
  }, [entries]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null,
    [entries, selectedId],
  );

  const isSelectedLoading = selectedEntry?.sessionPath ? loadingPath === selectedEntry.sessionPath : false;

  const loadMessages = useCallback(
    async (sessionPath: string) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      setLoadingPath(sessionPath);
      try {
        const messages = await worktreeSessionFileUsecase.loadLatestMessages({
          filePath: sessionPath,
          homeDir,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeSessionFileDependencies,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setMessagesByPath((current) => ({ ...current, [sessionPath]: messages }));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingPath(null);
        }
      }
    },
    [homeDir],
  );

  useEffect(() => {
    if (!selectedEntry?.sessionPath) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(messagesByPath, selectedEntry.sessionPath)) {
      return;
    }
    void loadMessages(selectedEntry.sessionPath);
  }, [loadMessages, messagesByPath, selectedEntry]);

  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleOpenSessionFile = useCallback(async (sessionPath: string): Promise<void> => {
    const targets = resolveSessionOpenTargets(sessionPath);
    if (!targets) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open session file",
        message: "Session path is empty.",
      });
      return;
    }
    try {
      await open(targets.sessionFilePath);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open session file",
        message: "Could not open session file with the default application.",
      });
    }
  }, []);

  return (
    <List
      isShowingDetail
      navigationTitle={`${title} Sessions`}
      searchBarPlaceholder="Search sessions"
      onSelectionChange={handleSelectionChange}
    >
      <List.EmptyView title="No session titles" description="No sessions were found for this worktree." />
      {entries.map((entry) => {
        const openTargets = entry.sessionPath ? resolveSessionOpenTargets(entry.sessionPath) : null;
        const detailMarkdown = buildSessionDetailMarkdown({
          entry,
          messages: entry.sessionPath ? (messagesByPath[entry.sessionPath] ?? null) : null,
          isLoading: entry.sessionPath ? loadingPath === entry.sessionPath : false,
        });
        return (
          <List.Item
            key={entry.id}
            id={entry.id}
            title={entry.title}
            icon={entry.icon}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown}
                isLoading={entry.id === selectedEntry?.id && isSelectedLoading}
              />
            }
            actions={
              <ActionPanel>
                {openTargets ? (
                  <>
                    {entry.sessionPath ? (
                      <Action.Push
                        title={PRIMARY_SESSION_ACTION_TITLE}
                        icon={Icon.List}
                        shortcut={PRIMARY_SESSION_ACTION_SHORTCUT}
                        target={
                          <SessionFullMessagesView
                            title={entry.title}
                            sessionPath={entry.sessionPath}
                            homeDir={homeDir}
                          />
                        }
                      />
                    ) : null}
                    <Action
                      title={SECONDARY_SESSION_ACTION_TITLE}
                      icon={Icon.Document}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      onAction={() => void handleOpenSessionFile(openTargets.sessionFilePath)}
                    />
                    <Action.ShowInFinder
                      title="Open Session Folder"
                      path={openTargets.sessionDirectoryPath}
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  </>
                ) : entry.sessionPath ? (
                  <Action.Push
                    title={PRIMARY_SESSION_ACTION_TITLE}
                    icon={Icon.List}
                    shortcut={PRIMARY_SESSION_ACTION_SHORTCUT}
                    target={
                      <SessionFullMessagesView title={entry.title} sessionPath={entry.sessionPath} homeDir={homeDir} />
                    }
                  />
                ) : null}
                <Action
                  title="Back to List"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  onAction={() => pop()}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

type SessionFullMessagesViewProps = {
  title: string;
  sessionPath: string;
  homeDir: string | null;
};

/**
 * セッションの全メッセージを表示する
 */
function SessionFullMessagesView({ title, sessionPath, homeDir }: SessionFullMessagesViewProps) {
  const { pop } = useNavigation();
  const [messages, setMessages] = useState<SessionMessage[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    void worktreeSessionFileUsecase
      .loadMessages({
        filePath: sessionPath,
        homeDir,
        dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeSessionFileDependencies,
      })
      .then((result) => {
        if (!isMounted) {
          return;
        }
        setMessages(result);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [homeDir, sessionPath]);

  return (
    <Detail
      navigationTitle={`${title} Conversation`}
      markdown={buildSessionFullMarkdown({ title, messages, isLoading })}
      actions={
        <ActionPanel>
          <Action
            title="Back to List"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            onAction={() => pop()}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * セッション詳細の Markdown を組み立てる
 */
export function buildSessionDetailMarkdown(args: {
  entry: SessionEntry;
  messages: SessionMessage[] | null;
  isLoading: boolean;
}): string {
  const heading = buildSessionDetailHeading(args.entry);
  if (!args.entry.sessionPath) {
    return `${heading}\n\nSession file not available.`;
  }
  if (args.isLoading) {
    return `${heading}\n\nLoading session messages...`;
  }
  if (!args.messages || args.messages.length === 0) {
    return `${heading}\n\nNo session messages found.`;
  }
  const display = sessionDetailUsecase.buildDisplay({
    title: args.entry.title,
    messages: args.messages,
  });
  if (display.messages.length === 0) {
    const emptyMessage = display.emptyMessage ?? "No session messages found.";
    return `${heading}\n\n${emptyMessage}`;
  }
  const blocks = display.messages.map((message) => formatSessionMessageBlock(message)).join("\n\n");
  return `${heading}\n\n${blocks}`;
}

/**
 * セッション詳細の見出しをスキル使用履歴つきで作る
 */
function buildSessionDetailHeading(entry: SessionEntry): string {
  const skillUsageMarkdown = formatSkillUsageHistory(entry.skillUsages);
  if (!skillUsageMarkdown) {
    return `# ${entry.title}`;
  }
  return `${skillUsageMarkdown}\n\n# ${entry.title}`;
}

/**
 * Markdown 内のインラインコード用にスキル名を整形する
 */
function formatInlineCode(value: string): string {
  return `\`${value.replace(/`/g, "")}\``;
}

/**
 * スキル使用履歴の Markdown を作る
 */
function formatSkillUsageHistory(skillUsages: NonNullable<WorktreeTitle["skillUsages"]>): string | null {
  if (skillUsages.length === 0) {
    return null;
  }
  const items = skillUsages.map((usage) => {
    const timestamp = usage.timestamp ? ` (${usage.timestamp})` : "";
    return `- ${formatInlineCode(usage.name)}${timestamp}`;
  });
  return `## Skill Usage\n\n${items.join("\n")}`;
}

/**
 * セッション全メッセージの Markdown を組み立てる
 */
function buildSessionFullMarkdown(args: {
  title: string;
  messages: SessionMessage[] | null;
  isLoading: boolean;
}): string {
  if (args.isLoading) {
    return `# ${args.title}\n\nLoading session messages...`;
  }
  if (!args.messages || args.messages.length === 0) {
    return `# ${args.title}\n\nNo session messages found.`;
  }
  const blocks = args.messages.map((message) => formatSessionMessageBlock(message)).join("\n\n");
  return `# ${args.title}\n\n${blocks}`;
}

/**
 * セッションメッセージの見出しを作る
 */
function formatSessionMessageHeading(message: SessionMessage): string {
  const roleLabel = message.role === "assistant" ? "Assistant" : "User";
  const roleIcon = message.role === "assistant" ? "🤖" : "🙂";
  const timestamp = message.timestamp ?? "Unknown time";
  return `### ${roleIcon} ${roleLabel} | ${timestamp}`;
}

/**
 * セッションメッセージの Markdown を組み立てる
 */
function formatSessionMessageBlock(message: SessionMessage): string {
  return `${formatSessionMessageHeading(message)}\n\n${message.text}`;
}
