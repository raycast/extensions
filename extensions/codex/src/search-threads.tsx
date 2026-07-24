import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  open,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  showFailureToast,
  useCachedPromise,
  useCachedState,
  useForm,
  usePromise,
} from "@raycast/utils";
import { basename } from "node:path";
import { useEffect, useMemo, useState } from "react";
import {
  archiveThread,
  buildCodexResumeCommand,
  CODEX_THREAD_LIST_LOOKBACK_DAYS,
  CODEX_THREAD_LIST_MAX_RESULTS,
  compactThread,
  type CodexThread,
  type CodexThreadLatestMessages,
  forkThread,
  listThreads,
  readLatestThreadMessages,
  type SetThreadNameResult,
  setThreadName,
  unarchiveThread,
} from "./utils/codex-app-server";
import {
  type CodexStatusDescriptor,
  getCodexSourceDescriptor,
  getCodexStatusDescriptor,
} from "./utils/codex-thread-display";
import {
  indexMissingThreadSearchRecords,
  loadCachedThreadSearchRecords,
  searchCodexThreads,
  type CodexThreadSearchMatch,
  type CodexThreadSearchRecord,
  type CodexThreadSearchResult,
} from "./utils/codex-thread-search";
import {
  buildThreadSummaryDocument,
  summarizeCodexThread,
} from "./utils/codex-thread-summary";
import {
  areEquivalentThreadNames,
  autoRenameCodexThreads,
  buildAutoRenameReport,
} from "./utils/codex-thread-rename";
import { exportThreadToMarkdown } from "./utils/export-thread";
import {
  formatTimestampSeconds,
  getErrorMessage,
  getProjectName,
  getThreadDisplayTitle,
  tildeifyPath,
  truncate,
} from "./utils/format";
import {
  getLatestTurnsLoadingOrErrorMarkdown,
  type LatestTurn,
  renderLatestTurnsMarkdown,
} from "./utils/latest-turns";
import { buildCodexProjectOptions } from "./utils/codex-projects";
import { runNoViewCommand } from "./utils/raycast";
import {
  openTerminalAtPath,
  openTerminalAtPathWithCommand,
} from "./utils/terminal";

type ThreadScope = "active" | "archived";
type ProjectFilter = {
  cwd: string | null;
  setCwd: (cwd: string | null) => Promise<void> | void;
};

type ThreadSearchIndexStatus = {
  isIndexing: boolean;
  error: string | null;
};

const LATEST_TURN_PRESENTATION = {
  user: {
    detailHeading: "👤 User",
    clipboardHeading: "User",
    fallback: "No user message found.",
  },
  agent: {
    detailHeading: "🤖 Agent",
    clipboardHeading: "Agent",
    fallback: "No agent message found.",
  },
} as const;

const SUBAGENT_COLOR = "#94D2BC";
const BRANCH_MAIN_COLOR = "#4A78A4";
const BRANCH_FEATURE_COLOR = "#FF7F7F";
const AUTO_RENAME_BATCH_SIZES = [5, 10, 25, 50] as const;
const ALL_PROJECTS_FILTER_VALUE = "__all_projects__";
const EMPTY_THREADS: CodexThread[] = [];
const EMPTY_SEARCH_INDEX_STATUS: ThreadSearchIndexStatus = {
  isIndexing: false,
  error: null,
};

export default function CodexThreadsCommand() {
  const [threadScope, setThreadScope] = useCachedState<ThreadScope>(
    "codex-threads-scope",
    "active",
  );
  const [isShowingDetail, setIsShowingDetail] = useCachedState(
    "codex-threads-show-detail",
    false,
  );
  const [showSubagents, setShowSubagents] = useCachedState(
    "codex-threads-show-subagents",
    false,
  );
  const [projectFilterCwd, setProjectFilterCwd] = useCachedState<string | null>(
    "codex-threads-project-filter-cwd",
    null,
  );
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const archived = threadScope === "archived";
  const projectFilter: ProjectFilter = {
    cwd: projectFilterCwd,
    setCwd: setProjectFilterCwd,
  };

  const threadListArgs = useMemo<Parameters<typeof listThreads>>(
    () => [
      {
        archived,
        maxResults: CODEX_THREAD_LIST_MAX_RESULTS,
        windowDays: CODEX_THREAD_LIST_LOOKBACK_DAYS,
      },
    ],
    [archived],
  );
  const {
    data: allThreads,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listThreads, threadListArgs, {
    keepPreviousData: true,
  });

  const threads = useMemo(
    () => filterThreadsByProject(allThreads ?? EMPTY_THREADS, projectFilterCwd),
    [allThreads, projectFilterCwd],
  );
  const projectOptions = useMemo(
    () =>
      buildCodexProjectOptions(allThreads ?? EMPTY_THREADS, projectFilterCwd),
    [allThreads, projectFilterCwd],
  );
  const subagentCounts = useMemo(
    () => getDirectSubagentCounts(threads),
    [threads],
  );
  const visibleThreads = useMemo(
    () =>
      threads.filter((thread) => showSubagents || !isSubagentThread(thread)),
    [showSubagents, threads],
  );
  const trimmedSearchText = searchText.trim();
  const {
    recordsByThreadId: searchRecordsByThreadId,
    status: searchIndexStatus,
  } = useThreadSearchIndex(visibleThreads, Boolean(trimmedSearchText));

  const displayedThreadResults = useMemo<CodexThreadSearchResult[]>(() => {
    if (trimmedSearchText) {
      return searchCodexThreads(
        visibleThreads,
        searchRecordsByThreadId,
        trimmedSearchText,
      );
    }

    return visibleThreads.map((thread) => ({
      thread,
      match: null,
      score: thread.updatedAt,
    }));
  }, [searchRecordsByThreadId, trimmedSearchText, visibleThreads]);
  const displayedThreads = useMemo(
    () => displayedThreadResults.map((result) => result.thread),
    [displayedThreadResults],
  );
  const effectiveSelectedThreadId =
    selectedThreadId &&
    displayedThreads.some((thread) => thread.id === selectedThreadId)
      ? selectedThreadId
      : (displayedThreads[0]?.id ?? null);
  const {
    data: latestSelectedThreadMessages,
    error: latestSelectedThreadMessagesError,
    isLoading: isLatestSelectedThreadMessagesLoading,
  } = usePromise(readLatestThreadMessages, [effectiveSelectedThreadId ?? ""], {
    execute: isShowingDetail && Boolean(effectiveSelectedThreadId),
  });

  if (!allThreads?.length && error) {
    return (
      <Detail
        markdown={`Failed to load Codex threads.\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={() => {
                revalidate();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={
        isLoading ||
        (Boolean(trimmedSearchText) && searchIndexStatus.isIndexing)
      }
      isShowingDetail={isShowingDetail}
      filtering={false}
      onSelectionChange={setSelectedThreadId}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder={
        projectFilterCwd
          ? `Search ${getProjectName(projectFilterCwd)} names, paths, and transcripts`
          : `Search last ${CODEX_THREAD_LIST_LOOKBACK_DAYS} days by name, path, or transcript`
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Project"
          value={projectFilterCwd ?? ALL_PROJECTS_FILTER_VALUE}
          onChange={async (value) => {
            await projectFilter.setCwd(
              value === ALL_PROJECTS_FILTER_VALUE ? null : value,
            );
          }}
        >
          <List.Dropdown.Item
            title="All Projects"
            value={ALL_PROJECTS_FILTER_VALUE}
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
          {projectOptions.map((option) => (
            <List.Dropdown.Item
              key={option.cwd}
              title={option.title}
              value={option.cwd}
              icon={{ source: Icon.Circle, tintColor: option.color }}
            />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {displayedThreadResults.map(({ thread, match }) => {
        const directSubagentCount = subagentCounts.get(thread.id) ?? 0;
        const isSelected = thread.id === effectiveSelectedThreadId;
        const selectedLatestMessages = isSelected
          ? latestSelectedThreadMessages
          : undefined;

        const displayTitle = getThreadDisplayTitle(thread);
        return (
          <List.Item
            key={thread.id}
            id={thread.id}
            title={{ value: displayTitle, tooltip: displayTitle }}
            subtitle={getThreadSubtitle(thread, match, isShowingDetail)}
            icon={{
              value: getThreadIcon(thread),
              tooltip: getCodexSourceDescriptor(thread.source).tooltip,
            }}
            accessories={getThreadAccessories(
              thread,
              directSubagentCount,
              isShowingDetail,
            )}
            detail={
              isShowingDetail && isSelected
                ? buildThreadDetail(
                    thread,
                    directSubagentCount,
                    selectedLatestMessages,
                    isLatestSelectedThreadMessagesLoading,
                    latestSelectedThreadMessagesError,
                  )
                : undefined
            }
            actions={
              <ThreadActions
                archived={archived}
                isShowingDetail={isShowingDetail}
                showSubagents={showSubagents}
                onArchiveFilterChange={setThreadScope}
                onThreadsChanged={revalidate}
                onToggleDetail={() => {
                  setIsShowingDetail(!isShowingDetail);
                }}
                onToggleShowSubagents={() => {
                  setShowSubagents(!showSubagents);
                }}
                autoRenameCandidates={displayedThreads}
                latestMessages={selectedLatestMessages}
                projectFilter={projectFilter}
                thread={thread}
              />
            }
          />
        );
      })}
      {!isLoading && displayedThreadResults.length === 0 ? (
        <List.EmptyView
          title={getEmptyViewTitle(
            archived,
            threads.length,
            Boolean(trimmedSearchText),
          )}
          description={getEmptyViewDescription({
            archived,
            indexError: searchIndexStatus.error,
            isIndexing: searchIndexStatus.isIndexing,
            projectFilterCwd,
            searchText: trimmedSearchText,
            unfilteredCount: threads.length,
          })}
          actions={
            projectFilterCwd ? (
              <ActionPanel>
                <Action
                  title="Clear Project Filter"
                  icon={Icon.XMarkCircle}
                  onAction={async () => {
                    await projectFilter.setCwd(null);
                  }}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : null}
    </List>
  );
}

function useThreadSearchIndex(
  threads: CodexThread[],
  isEnabled: boolean,
): {
  recordsByThreadId: Map<string, CodexThreadSearchRecord>;
  status: ThreadSearchIndexStatus;
} {
  const [recordsByThreadId, setRecordsByThreadId] = useState<
    Map<string, CodexThreadSearchRecord>
  >(() => new Map());
  const [status, setStatus] = useState<ThreadSearchIndexStatus>(
    EMPTY_SEARCH_INDEX_STATUS,
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadAndUpdateSearchIndex() {
      if (!isEnabled) {
        setStatus(EMPTY_SEARCH_INDEX_STATUS);
        return;
      }

      if (threads.length === 0) {
        setRecordsByThreadId(new Map());
        setStatus(EMPTY_SEARCH_INDEX_STATUS);
        return;
      }

      try {
        const cachedRecords = await loadCachedThreadSearchRecords(threads);
        if (isCancelled) return;

        const cachedRecordsByThreadId = new Map(
          cachedRecords.map((record) => [record.threadId, record]),
        );
        setRecordsByThreadId(cachedRecordsByThreadId);

        const missingRecordCount = threads.filter(
          (thread) => !cachedRecordsByThreadId.has(thread.id),
        ).length;
        if (missingRecordCount > 0) {
          setStatus({ isIndexing: true, error: null });
        }

        const indexedRecords = await indexMissingThreadSearchRecords(
          threads,
          cachedRecordsByThreadId,
        );
        if (isCancelled) return;

        setRecordsByThreadId((currentRecords) => {
          const nextRecords = new Map(currentRecords);
          for (const record of indexedRecords) {
            nextRecords.set(record.threadId, record);
          }
          return nextRecords;
        });
        setStatus(EMPTY_SEARCH_INDEX_STATUS);
      } catch (error) {
        if (isCancelled) return;
        setStatus({ isIndexing: false, error: getErrorMessage(error) });
      }
    }

    void loadAndUpdateSearchIndex();

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, threads]);

  return { recordsByThreadId, status };
}

function filterThreadsByProject(
  threads: CodexThread[],
  projectCwd: string | null,
): CodexThread[] {
  if (!projectCwd) {
    return threads;
  }

  return threads.filter((thread) => thread.cwd === projectCwd);
}

function getThreadSubtitle(
  thread: CodexThread,
  match: CodexThreadSearchMatch | null,
  isShowingDetail: boolean,
): List.Item.Props["subtitle"] {
  if (isShowingDetail) {
    return undefined;
  }

  const projectName = getProjectName(thread.cwd);
  if (match?.snippet) {
    return {
      value: `${projectName} • ${match.snippet}`,
      tooltip: `${projectName}: ${match.snippet}`,
    };
  }

  return { value: projectName, tooltip: thread.cwd };
}

function getEmptyViewTitle(
  archived: boolean,
  unfilteredCount: number,
  isSearching: boolean,
): string {
  if (isSearching) {
    return "No matching threads";
  }

  if (archived) {
    return "No archived threads";
  }

  return unfilteredCount > 0 ? "Subagent threads hidden" : "No threads found";
}

function getEmptyViewDescription({
  archived,
  indexError,
  isIndexing,
  projectFilterCwd,
  searchText,
  unfilteredCount,
}: {
  archived: boolean;
  indexError: string | null;
  isIndexing: boolean;
  projectFilterCwd: string | null;
  searchText: string;
  unfilteredCount: number;
}): string {
  if (searchText) {
    if (indexError) {
      return `Transcript indexing failed: ${indexError}. Name, path, and preview search still work.`;
    }

    return isIndexing
      ? `Still indexing transcripts for "${searchText}". Transcript matches will appear when indexing finishes.`
      : `No thread names, paths, previews, or indexed transcripts match "${searchText}".`;
  }

  if (projectFilterCwd) {
    return `No ${archived ? "archived" : "active"} threads updated in the last ${
      CODEX_THREAD_LIST_LOOKBACK_DAYS
    } days were found in ${tildeifyPath(projectFilterCwd)}.`;
  }

  if (archived) {
    return `Archived Codex threads updated in the last ${CODEX_THREAD_LIST_LOOKBACK_DAYS} days will appear here.`;
  }

  if (unfilteredCount > 0) {
    return "Press ⌘⇧S to show subagent threads.";
  }

  return `Start or resume a Codex thread and it will appear here for ${CODEX_THREAD_LIST_LOOKBACK_DAYS} days.`;
}

function ThreadActions({
  archived,
  isShowingDetail,
  showSubagents,
  onArchiveFilterChange,
  onThreadsChanged,
  onToggleDetail,
  onToggleShowSubagents,
  autoRenameCandidates,
  latestMessages,
  projectFilter,
  thread,
}: {
  archived: boolean;
  isShowingDetail: boolean;
  showSubagents: boolean;
  onArchiveFilterChange: (scope: ThreadScope) => Promise<void> | void;
  onThreadsChanged: () => Promise<unknown> | void;
  onToggleDetail: () => void;
  onToggleShowSubagents: () => void;
  autoRenameCandidates: CodexThread[];
  latestMessages?: CodexThreadLatestMessages;
  projectFilter: ProjectFilter;
  thread: CodexThread;
}) {
  return (
    <ActionPanel>
      <Action
        title="Open in Codex"
        icon={Icon.AppWindow}
        onAction={async () => {
          await openThreadInCodexApp(thread);
        }}
      />
      <Action
        title="Resume in Terminal"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["shift"], key: "enter" }}
        onAction={async () => {
          await resumeThreadInTerminal(thread);
        }}
      />
      <Action.Push
        title="Rename Thread"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        target={
          <RenameThreadForm
            archived={archived}
            thread={thread}
            onRenameSuccess={onThreadsChanged}
          />
        }
      />
      {!archived ? (
        <Action
          title="Compact Thread"
          icon={Icon.ChevronDown}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          onAction={async () => {
            const compactedThread = await performThreadMutation({
              confirm: {
                title: "Compact Thread?",
                message:
                  "This asks Codex to compact the thread context for continued work. It does not revert workspace files.",
                primaryAction: { title: "Compact" },
              },
              loadingTitle: "Compacting Thread",
              successTitle: "Thread Compacted",
              failureTitle: "Compact Failed",
              mutate: async () => {
                await compactThread(thread.id);
                return thread;
              },
            });

            if (compactedThread) {
              await onThreadsChanged();
            }
          }}
        />
      ) : null}
      {archived ? (
        <Action
          title="Unarchive Thread"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const unarchivedThread = await performThreadMutation({
              loadingTitle: "Unarchiving Thread",
              successTitle: "Thread Restored",
              failureTitle: "Restore Failed",
              mutate: async () => {
                await unarchiveThread(thread.id);
                return thread;
              },
            });

            if (unarchivedThread) {
              await onThreadsChanged();
              await onArchiveFilterChange("active");
            }
          }}
        />
      ) : (
        <Action
          title="Archive Thread"
          icon={Icon.Box}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const archivedThread = await performThreadMutation({
              confirm: {
                title: "Archive Thread?",
                message: getThreadDisplayTitle(thread),
                primaryAction: {
                  title: "Archive",
                  style: Alert.ActionStyle.Destructive,
                },
              },
              loadingTitle: "Archiving Thread",
              successTitle: "Thread Archived",
              failureTitle: "Archive Failed",
              mutate: async () => {
                await archiveThread(thread.id);
                return thread;
              },
            });

            if (archivedThread) {
              await onThreadsChanged();
            }
          }}
        />
      )}
      <Action
        title={isShowingDetail ? "Hide Details" : "Show Details"}
        icon={isShowingDetail ? Icon.AppWindowList : Icon.AppWindowSidebarRight}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={onToggleDetail}
      />

      <ActionPanel.Section title="Manage">
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            try {
              await onThreadsChanged();
              await showToast({
                style: Toast.Style.Success,
                title: "Threads Refreshed",
              });
            } catch (refreshError) {
              await showFailureToast(refreshError, {
                title: "Unable to refresh threads",
              });
            }
          }}
        />
        <Action
          title={archived ? "Show Active Threads" : "Show Archived Threads"}
          icon={archived ? Icon.AppWindowList : Icon.Box}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={async () => {
            await onArchiveFilterChange(archived ? "active" : "archived");
          }}
        />
        {projectFilter.cwd === thread.cwd ? (
          <Action
            title="Clear Project Filter"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={async () => {
              await projectFilter.setCwd(null);
            }}
          />
        ) : (
          <Action
            title="Filter to This Project"
            icon={Icon.Filter}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={async () => {
              await projectFilter.setCwd(thread.cwd);
            }}
          />
        )}
        <Action
          title="Export Thread"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={async () => {
            await exportThreadWithFeedback(thread);
          }}
        />
        <Action
          title="Fork Thread"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={async () => {
            const forkedThread = await runThreadMutation(
              "Forking Thread",
              archived ? "New fork created in active threads" : "Thread Forked",
              () => forkThread(thread.id),
              (result) => getThreadToastLabel(result),
              {
                failureTitle: "Fork Failed",
                primaryAction: {
                  title: "Open Thread",
                  shortcut: { modifiers: ["cmd"], key: "t" },
                  onAction: openThreadInCodexApp,
                },
              },
            );

            if (forkedThread) {
              await onThreadsChanged();
            }
          }}
        />
        <Action.Push
          title="Summarize Thread"
          icon={Icon.Stars}
          shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
          target={
            <ThreadSummaryDetail
              archived={archived}
              thread={thread}
              onRenameSuccess={onThreadsChanged}
            />
          }
        />
        <ActionPanel.Submenu
          title="Auto Rename…"
          icon={Icon.TextCursor}
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
        >
          {AUTO_RENAME_BATCH_SIZES.map((batchSize) => (
            <Action
              key={batchSize}
              title={`Rename Latest ${batchSize} Visible Threads`}
              icon={Icon.Text}
              onAction={async () => {
                await autoRenameVisibleThreads(
                  autoRenameCandidates,
                  batchSize,
                  archived,
                  onThreadsChanged,
                );
              }}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>

      <ActionPanel.Section title="Open & Copy">
        <Action.ShowInFinder
          title="Open Project in Finder"
          path={thread.cwd}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
        />
        <ActionPanel.Submenu
          title="Open with…"
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        >
          <Action
            title="Terminal"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
            onAction={async () => {
              await runNoViewActionWithFailureToast(
                "Unable to open in Terminal",
                async () => {
                  await openTerminalAtPath(thread.cwd);
                },
              );
            }}
          />
        </ActionPanel.Submenu>
        <Action.CopyToClipboard
          title="Copy Thread ID"
          content={thread.id}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Resume Command"
          content={buildCodexResumeCommand(thread.id)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Project Path"
          content={thread.cwd}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
        <Action
          title="Copy Latest Turns"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={async () => {
            await copyLatestTurns(thread, latestMessages);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Inspect">
        {thread.path ? (
          <Action.ShowInFinder title="Show Rollout File" path={thread.path} />
        ) : null}
        <Action
          title={
            showSubagents ? "Hide Subagent Threads" : "Show Subagent Threads"
          }
          icon={showSubagents ? Icon.EyeDisabled : Icon.Livestream}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={onToggleShowSubagents}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function RenameThreadForm({
  archived,
  thread,
  onRenameSuccess,
}: {
  archived: boolean;
  thread: CodexThread;
  onRenameSuccess: () => Promise<unknown> | void;
}) {
  const { pop } = useNavigation();
  const visibleTitle = getThreadDisplayTitle(thread);

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: {
      name: visibleTitle,
    },
    validation: {
      name: (value) => {
        const trimmedValue = value?.trim();
        if (!trimmedValue) {
          return "Thread name is required";
        }

        if (trimmedValue === visibleTitle) {
          return "Enter a different thread name";
        }

        return undefined;
      },
    },
    onSubmit: async (values) => {
      const nextName = values.name.trim();
      const renamed = await renameThreadWithFeedback(
        thread,
        nextName,
        archived,
        onRenameSuccess,
      );
      if (renamed) {
        pop();
      }
    },
  });

  return (
    <Form
      navigationTitle="Rename Thread"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Thread" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Thread ID" text={thread.id} />
      <Form.TextField
        title="Name"
        placeholder="Enter a semantic thread name"
        {...itemProps.name}
      />
    </Form>
  );
}

function ThreadSummaryDetail({
  archived,
  thread,
  onRenameSuccess,
}: {
  archived: boolean;
  thread: CodexThread;
  onRenameSuccess: () => Promise<unknown> | void;
}) {
  const { data, error, isLoading, revalidate } = usePromise(
    summarizeCodexThread,
    [thread],
  );
  const summaryDocument = data
    ? buildThreadSummaryDocument(thread, data)
    : undefined;
  const markdown = data
    ? summaryDocument
    : error
      ? `# Summary Failed\n\n${error.message}`
      : "_Summarizing thread with Raycast AI..._";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Thread Summary"
      actions={
        <ActionPanel>
          {data ? (
            <>
              <Action.CopyToClipboard
                title="Copy Summary"
                icon={Icon.Clipboard}
                content={summaryDocument ?? ""}
              />
              <Action
                title="Rename Thread to Suggested Name"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={async () => {
                  await renameThreadToTitle(
                    thread,
                    data.title,
                    archived,
                    onRenameSuccess,
                  );
                }}
              />
            </>
          ) : null}
          <Action
            title="Retry Summary"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              await revalidate();
            }}
          />
          <Action
            title="Open in Codex"
            icon={Icon.AppWindow}
            onAction={async () => {
              await openThreadInCodexApp(thread);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

async function renameThreadToTitle(
  thread: CodexThread,
  nextName: string,
  archived: boolean,
  onRenameSuccess: () => Promise<unknown> | void,
) {
  const trimmedName = nextName.trim();
  const currentTitle = getThreadDisplayTitle(thread);

  if (!trimmedName || areEquivalentThreadNames(currentTitle, trimmedName)) {
    await showToast({
      style: Toast.Style.Success,
      title: "Thread Name Unchanged",
      message: truncate(currentTitle, 110),
    });
    return;
  }

  await renameThreadWithFeedback(
    thread,
    trimmedName,
    archived,
    onRenameSuccess,
  );
}

async function renameThreadWithFeedback(
  thread: CodexThread,
  nextName: string,
  archived: boolean,
  onRenameSuccess: () => Promise<unknown> | void,
): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Renaming Thread",
    message: truncate(nextName, 90),
  });

  try {
    const renameResult = await setThreadName(thread.id, nextName, { archived });
    await onRenameSuccess();
    toast.style = Toast.Style.Success;
    toast.title = "Thread Renamed";
    toast.message = getRenameSuccessMessage(nextName, renameResult);
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Rename Failed";
    toast.message = getErrorMessage(error);
    return false;
  }
}

async function autoRenameVisibleThreads(
  candidates: CodexThread[],
  requestedCount: number,
  archived: boolean,
  onThreadsChanged: () => Promise<unknown> | void,
) {
  const targets = candidates.slice(0, requestedCount);

  if (targets.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Visible Threads",
      message: "There are no threads to rename in the current view.",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: `Auto Rename ${targets.length} Threads?`,
    message: `Raycast AI will summarize and rename the latest ${targets.length} visible ${
      archived ? "archived" : "active"
    } threads. Larger batches can take a while.`,
    primaryAction: {
      title: "Auto Rename",
    },
  });

  if (!confirmed) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Auto-renaming Threads",
    message: `0/${targets.length}`,
  });
  const results = await autoRenameCodexThreads({
    archived,
    threads: targets,
    onProgress: ({ index, title, total }) => {
      toast.message = `${index + 1}/${total}: ${truncate(title, 54)}`;
    },
  });

  try {
    await onThreadsChanged();
  } catch (error) {
    await showFailureToast(error, {
      title: "Unable to refresh renamed threads",
    });
  }

  let renamedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  for (const result of results) {
    if (result.status === "renamed") renamedCount += 1;
    else if (result.status === "skipped") skippedCount += 1;
    else if (result.status === "failed") failedCount += 1;
  }

  toast.style =
    failedCount > 0 && renamedCount === 0
      ? Toast.Style.Failure
      : Toast.Style.Success;
  toast.title =
    failedCount > 0 ? "Auto Rename Finished with Errors" : "Threads Renamed";
  toast.message = `Renamed ${renamedCount}, skipped ${skippedCount}, failed ${failedCount}`;
  toast.primaryAction = {
    title: "Copy Report",
    onAction: async () => {
      await Clipboard.copy(buildAutoRenameReport(results));
    },
  };
}

function getRenameSuccessMessage(
  name: string,
  result: SetThreadNameResult,
): string {
  if (result.strategy === "archivedFallback") {
    return `Used archived fallback: ${truncate(name, 86)}`;
  }

  return truncate(name, 110);
}

async function exportThreadWithFeedback(thread: CodexThread) {
  if (!thread.path) {
    await showFailureToast(
      new Error(
        "This thread hasn't been written to disk yet. Try again once the thread has activity.",
      ),
      { title: "No rollout file" },
    );
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Exporting thread…",
    message: "Parsing rollout and writing markdown",
  });

  try {
    const outPath = await exportThreadToMarkdown(thread);
    toast.style = Toast.Style.Success;
    toast.title = "Thread exported";
    toast.message = tildeifyPath(outPath);
    toast.primaryAction = {
      title: "Show in Finder",
      onAction: async () => {
        await showInFinder(outPath);
      },
    };
    toast.secondaryAction = {
      title: "Open File",
      onAction: async () => {
        await open(outPath);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export failed";
    toast.message = getErrorMessage(error);
  }
}

async function openThreadInCodexApp(thread: CodexThread) {
  await runNoViewActionWithFailureToast(
    "Unable to open thread in Codex",
    async () => {
      await open(`codex://threads/${thread.id}`);
    },
  );
}

async function resumeThreadInTerminal(thread: CodexThread) {
  await runNoViewActionWithFailureToast("Unable to resume thread", async () => {
    await openTerminalAtPathWithCommand(
      thread.cwd,
      buildCodexResumeCommand(thread.id),
    );
  });
}

async function runNoViewActionWithFailureToast(
  failureTitle: string,
  action: () => Promise<void>,
) {
  try {
    await runNoViewCommand(action, { popToRoot: true });
  } catch (error) {
    await showFailureToast(error, { title: failureTitle });
  }
}

async function runThreadMutation<T>(
  loadingTitle: string,
  successTitle: string,
  action: () => Promise<T>,
  getSuccessMessage: (result: T) => string,
  options?: {
    failureTitle?: string;
    primaryAction?: {
      title: string;
      shortcut?: Toast.ActionOptions["shortcut"];
      onAction: (result: T) => Promise<void> | void;
    };
  },
): Promise<T | undefined> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: loadingTitle,
  });

  try {
    const result = await action();
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    toast.message = getSuccessMessage(result);
    if (options?.primaryAction) {
      toast.primaryAction = {
        title: options.primaryAction.title,
        shortcut: options.primaryAction.shortcut,
        onAction: () => {
          void Promise.resolve(options.primaryAction?.onAction(result)).catch(
            (actionError) => {
              void showFailureToast(actionError, { title: "Action failed" });
            },
          );
        },
      };
    }
    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = options?.failureTitle ?? "Action failed";
    toast.message = getErrorMessage(error);
    return undefined;
  }
}

function getThreadToastLabel(thread: CodexThread): string {
  return truncate(getThreadDisplayTitle(thread), 110);
}

async function performThreadMutation(opts: {
  confirm?: Parameters<typeof confirmAlert>[0];
  loadingTitle: string;
  successTitle: string;
  failureTitle?: string;
  mutate: () => Promise<CodexThread>;
}): Promise<CodexThread | undefined> {
  if (opts.confirm) {
    const confirmed = await confirmAlert(opts.confirm);
    if (!confirmed) return undefined;
  }

  return runThreadMutation(
    opts.loadingTitle,
    opts.successTitle,
    opts.mutate,
    getThreadToastLabel,
    {
      failureTitle: opts.failureTitle,
      primaryAction: {
        title: "Open Thread",
        shortcut: { modifiers: ["cmd"], key: "t" },
        onAction: openThreadInCodexApp,
      },
    },
  );
}

function getThreadIcon(thread: CodexThread) {
  const sourceDescriptor = getCodexSourceDescriptor(thread.source);

  return {
    source: sourceDescriptor.icon,
    tintColor: getCodexStatusDescriptor(thread.status).tintColor,
  };
}

function getThreadAccessories(
  thread: CodexThread,
  directSubagentCount: number,
  isShowingDetail: boolean,
): List.Item.Accessory[] {
  if (isShowingDetail) {
    return [];
  }

  const accessories: List.Item.Accessory[] = [];
  const statusAccessory = getStatusAccessory(thread);
  const branchAccessory = getBranchAccessory(thread);

  if (statusAccessory) {
    accessories.push(statusAccessory);
  }

  if (directSubagentCount > 0) {
    accessories.push({
      icon: Icon.Livestream,
      tag: {
        value: formatSubagentCount(directSubagentCount),
        color: SUBAGENT_COLOR,
      },
      tooltip: `${formatSubagentCount(directSubagentCount)} spawned from this thread`,
    });
  }

  if (branchAccessory) {
    accessories.push(branchAccessory);
  }

  accessories.push({
    date: new Date(thread.updatedAt * 1000),
    tooltip: `Updated ${formatTimestampSeconds(thread.updatedAt)}`,
  });

  return accessories;
}

function buildThreadDetail(
  thread: CodexThread,
  directSubagentCount: number,
  latestMessages?: CodexThreadLatestMessages,
  isLatestMessagesLoading = false,
  latestMessagesError?: Error,
) {
  const statusDescriptor = getCodexStatusDescriptor(thread.status);
  const sourceDescriptor = getCodexSourceDescriptor(thread.source);
  const agentLabel = [thread.agentNickname, thread.agentRole]
    .filter(Boolean)
    .join(" • ");

  return (
    <List.Item.Detail
      markdown={getLatestTurnsMarkdown(
        latestMessages,
        isLatestMessagesLoading,
        latestMessagesError,
      )}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Thread Name"
            text={getThreadDisplayTitle(thread)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Thread ID" text={thread.id} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Signals">
            <List.Item.Detail.Metadata.TagList.Item
              text={getStatusTagText(statusDescriptor)}
              color={statusDescriptor.tintColor}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={sourceDescriptor.label}
              color={Color.Blue}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={thread.modelProvider}
              color={Color.SecondaryText}
            />
            {agentLabel ? (
              <List.Item.Detail.Metadata.TagList.Item
                text={`🤖 ${agentLabel}`}
                color={Color.Magenta}
              />
            ) : null}
            {directSubagentCount > 0 ? (
              <List.Item.Detail.Metadata.TagList.Item
                text={`🧬 ${formatSubagentCount(directSubagentCount)}`}
                color={SUBAGENT_COLOR}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Project / Directory"
            text={`${getProjectName(thread.cwd)} • ${tildeifyPath(thread.cwd)}`}
          />
          <List.Item.Detail.Metadata.Separator />

          {thread.gitInfo?.branch ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Branch"
                text={thread.gitInfo.branch}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : null}
          {thread.gitInfo?.sha ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="SHA"
                text={thread.gitInfo.sha}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : null}

          <List.Item.Detail.Metadata.Label
            title="Updated"
            text={formatTimestampSeconds(thread.updatedAt)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={formatTimestampSeconds(thread.createdAt)}
          />
          <List.Item.Detail.Metadata.Separator />
          {latestMessages ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Turns"
                text={String(latestMessages.turnCount)}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : null}

          {thread.forkedFromId ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Forked From"
                text={thread.forkedFromId}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : null}
          {thread.status.type === "active" &&
          thread.status.activeFlags.length > 0 ? (
            <>
              <List.Item.Detail.Metadata.TagList title="🚦 Active Flags">
                {thread.status.activeFlags.map((flag) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={flag}
                    color={
                      flag === "waitingOnApproval" ? Color.Orange : Color.Blue
                    }
                    text={
                      flag === "waitingOnApproval"
                        ? "Waiting on Approval"
                        : "Waiting on User Input"
                    }
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : null}
          {thread.path ? (
            <List.Item.Detail.Metadata.Label
              title="Rollout Thread ID"
              text={getRolloutThreadId(thread.path)}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function getLatestTurnsMarkdown(
  latestMessages: CodexThreadLatestMessages | undefined,
  isLatestMessagesLoading: boolean,
  latestMessagesError?: Error,
): string {
  const loadingOrError = getLatestTurnsLoadingOrErrorMarkdown(
    isLatestMessagesLoading || !latestMessages,
    latestMessagesError,
  );
  if (loadingOrError !== null) {
    return loadingOrError;
  }
  return renderLatestTurnsMarkdown(
    getOrderedLatestTurns(latestMessages as CodexThreadLatestMessages),
  );
}

function getOrderedLatestTurns(
  latestMessages: CodexThreadLatestMessages,
): LatestTurn[] {
  return [
    {
      heading: LATEST_TURN_PRESENTATION.user.detailHeading,
      body:
        latestMessages.lastUserMessage ??
        LATEST_TURN_PRESENTATION.user.fallback,
      order: latestMessages.lastUserMessageOrder ?? Number.POSITIVE_INFINITY,
    },
    {
      heading: LATEST_TURN_PRESENTATION.agent.detailHeading,
      body:
        latestMessages.lastAgentMessage ??
        LATEST_TURN_PRESENTATION.agent.fallback,
      order: latestMessages.lastAgentMessageOrder ?? Number.POSITIVE_INFINITY,
    },
  ].sort((left, right) => right.order - left.order);
}

async function copyLatestTurns(
  thread: CodexThread,
  cachedLatestMessages?: CodexThreadLatestMessages,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Copying Latest Turns",
    message: truncate(getThreadDisplayTitle(thread), 80),
  });

  try {
    const latestMessages =
      cachedLatestMessages ?? (await readLatestThreadMessages(thread.id));
    await Clipboard.copy(buildLatestTurnsClipboardText(thread, latestMessages));
    toast.style = Toast.Style.Success;
    toast.title = "Latest Turns Copied";
    toast.message = `${latestMessages.turnCount} turns`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Copy Failed";
    toast.message = getErrorMessage(error);
  }
}

function buildLatestTurnsClipboardText(
  thread: CodexThread,
  latestMessages: CodexThreadLatestMessages,
): string {
  return [
    `# ${getThreadDisplayTitle(thread)}`,
    "",
    `Thread: ${thread.id}`,
    `Project: ${thread.cwd}`,
    `Turns: ${latestMessages.turnCount}`,
    "",
    `## ${LATEST_TURN_PRESENTATION.user.clipboardHeading}`,
    latestMessages.lastUserMessage?.trim() ||
      LATEST_TURN_PRESENTATION.user.fallback,
    "",
    `## ${LATEST_TURN_PRESENTATION.agent.clipboardHeading}`,
    latestMessages.lastAgentMessage?.trim() ||
      LATEST_TURN_PRESENTATION.agent.fallback,
  ].join("\n");
}

function getStatusTagText(statusDescriptor: CodexStatusDescriptor): string {
  return statusDescriptor.label ?? statusDescriptor.tooltip;
}

function getRolloutThreadId(path: string): string {
  return basename(path, ".jsonl");
}

function getDirectSubagentCounts(threads: CodexThread[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const thread of threads) {
    if (!isThreadSpawnSubagent(thread)) {
      continue;
    }

    const parentThreadId = thread.source.subAgent.thread_spawn.parent_thread_id;
    counts.set(parentThreadId, (counts.get(parentThreadId) ?? 0) + 1);
  }

  return counts;
}

function isSubagentThread(thread: CodexThread): thread is CodexThread & {
  source: Extract<CodexThread["source"], { subAgent: unknown }>;
} {
  return typeof thread.source === "object" && "subAgent" in thread.source;
}

function isThreadSpawnSubagent(thread: CodexThread): thread is CodexThread & {
  source: {
    subAgent: {
      thread_spawn: {
        parent_thread_id: string;
        depth: number;
        agent_path: string | null;
        agent_nickname: string | null;
        agent_role: string | null;
      };
    };
  };
} {
  return (
    typeof thread.source === "object" &&
    "subAgent" in thread.source &&
    typeof thread.source.subAgent === "object" &&
    "thread_spawn" in thread.source.subAgent
  );
}

function formatSubagentCount(count: number): string {
  return `${count} subagent${count === 1 ? "" : "s"}`;
}

function getStatusAccessory(
  thread: CodexThread,
): List.Item.Accessory | undefined {
  const statusDescriptor = getCodexStatusDescriptor(thread.status);

  if (!statusDescriptor.label || statusDescriptor.label === "Active") {
    return undefined;
  }

  return {
    tag: {
      value: statusDescriptor.label,
      color: statusDescriptor.tintColor,
    },
    tooltip: statusDescriptor.tooltip,
  };
}

function getBranchAccessory(
  thread: CodexThread,
): List.Item.Accessory | undefined {
  const branch = thread.gitInfo?.branch?.trim();
  if (!branch) {
    return undefined;
  }

  return {
    icon: branch === "main" ? Icon.House : Icon.WrenchScrewdriver,
    tag: {
      value: branch,
      color: branch === "main" ? BRANCH_MAIN_COLOR : BRANCH_FEATURE_COLOR,
    },
    tooltip: `Git branch: ${branch}`,
  };
}
