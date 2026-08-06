import {
  Action,
  ActionPanel,
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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  archiveThread,
  buildResumeCommand,
  type CodexThread,
  type CodexThreadLatestMessages,
  forkThread,
  listThreads,
  readLatestThreadMessages,
  searchThreads,
  type SetThreadNameResult,
  setThreadName,
  threadListLookbackDays,
  threadListMaxResults,
  unarchiveThread,
} from "./utils/app-server";
import {
  getCodexSourceDescriptor,
  getCodexStatusDescriptor,
} from "./utils/display";
import {
  mapNativeThreadSearchResults,
  mergeThreadSearchResults,
  searchThreadMetadata,
  type CodexThreadSearchMatch,
  type CodexThreadSearchResult,
} from "./utils/search";
import {
  buildThreadSummaryDocument,
  summarizeCodexThread,
} from "./utils/summary";
import {
  areEquivalentThreadNames,
  autoRenameCodexThreads,
  buildAutoRenameReport,
} from "./utils/rename";
import { exportThreadToMarkdown } from "./utils/export";
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
import { buildWorkingDirectoryOptionsFromThreads } from "./utils/projects";
import { cleanCodexUserMessage } from "./utils/message-cleaning";
import { removeLegacyThreadSearchCache } from "./utils/legacy-thread-search-cache";
import { runNoViewCommand } from "./utils/raycast";
import { openTerminalAtPathWithCommand } from "./utils/terminal";

type ThreadScope = "active" | "archived";
type WorkingDirectoryFilter = {
  cwd: string | null;
  setCwd: (cwd: string | null) => Promise<void> | void;
};

type ThreadSearchResponse = {
  query: string;
  results: CodexThreadSearchResult[];
  transcriptSearchWarning: string | null;
};

type ThreadResultSection = {
  title: "Needs Attention" | "Active Threads" | "Archived Threads";
  results: CodexThreadSearchResult[];
};

const latestTurnPresentation = {
  user: {
    detailHeading: "User",
    fallback: "No user message found.",
  },
  agent: {
    detailHeading: "Codex",
    fallback: "No agent message found.",
  },
} as const;

const subagentColor = "#94D2BC";
const mainBranchColor = "#4A78A4";
const featureBranchColor = "#FF7F7F";
const autoRenameBatchSizes = [5, 10, 25, 50] as const;
const latestTurnPreviewMaxLength = 1500;
const allProjectsFilterValue = "__all_projects__";
const emptyThreads: CodexThread[] = [];

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
  const [workingDirectoryFilterPath, setWorkingDirectoryFilterPath] =
    useCachedState<string | null>("codex-threads-project-filter-cwd", null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  useEffect(() => {
    removeLegacyThreadSearchCache();
  }, []);
  const archived = threadScope === "archived";
  const projectFilter: WorkingDirectoryFilter = {
    cwd: workingDirectoryFilterPath,
    setCwd: setWorkingDirectoryFilterPath,
  };

  const threadListArgs = useMemo<Parameters<typeof listThreads>>(
    () => [
      {
        archived,
        maxResults: threadListMaxResults,
        windowDays: threadListLookbackDays,
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
    () =>
      filterThreadsByWorkingDirectory(
        allThreads ?? emptyThreads,
        workingDirectoryFilterPath,
      ),
    [allThreads, workingDirectoryFilterPath],
  );
  const projectOptions = useMemo(
    () =>
      buildWorkingDirectoryOptionsFromThreads(
        allThreads ?? emptyThreads,
        workingDirectoryFilterPath,
      ),
    [allThreads, workingDirectoryFilterPath],
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
  const searchAbortable = useRef<AbortController>(undefined);
  const {
    data: searchResponse,
    error: searchError,
    isLoading: isSearching,
  } = usePromise(
    // Read the signal at call time: usePromise swaps in a fresh controller
    // right before invoking the function, so a render-time arg would be stale.
    (threads: CodexThread[], query: string, isArchived: boolean) =>
      searchVisibleThreads(
        threads,
        query,
        isArchived,
        searchAbortable.current?.signal,
      ),
    [visibleThreads, trimmedSearchText, archived],
    {
      execute: Boolean(trimmedSearchText),
      abortable: searchAbortable,
      failureToastOptions: { title: "Unable to search Codex threads" },
    },
  );
  const currentSearchResponse =
    searchResponse?.query === trimmedSearchText ? searchResponse : undefined;
  const transcriptSearchWarning = trimmedSearchText
    ? (currentSearchResponse?.transcriptSearchWarning ?? null)
    : null;

  const displayedThreadResults = useMemo<CodexThreadSearchResult[]>(() => {
    if (trimmedSearchText) {
      return currentSearchResponse?.results ?? [];
    }

    return visibleThreads.map((thread) => ({
      thread,
      match: null,
      score: thread.updatedAt,
    }));
  }, [currentSearchResponse, trimmedSearchText, visibleThreads]);
  const displayedThreads = useMemo(
    () => displayedThreadResults.map((result) => result.thread),
    [displayedThreadResults],
  );
  const threadResultSections = useMemo(
    () => buildThreadResultSections(displayedThreadResults, archived),
    [archived, displayedThreadResults],
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
    revalidate: revalidateLatestSelectedThreadMessages,
  } = usePromise(readLatestThreadMessages, [effectiveSelectedThreadId ?? ""], {
    execute: isShowingDetail && Boolean(effectiveSelectedThreadId),
  });
  const refreshThreadsAndSelectedMessages = async () => {
    revalidate();
    if (isShowingDetail && effectiveSelectedThreadId) {
      await revalidateLatestSelectedThreadMessages();
    }
  };

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
      isLoading={isLoading || (Boolean(trimmedSearchText) && isSearching)}
      isShowingDetail={isShowingDetail}
      filtering={false}
      onSelectionChange={setSelectedThreadId}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder={
        workingDirectoryFilterPath
          ? `Search ${getProjectName(workingDirectoryFilterPath)} names, paths, and transcripts`
          : `Search last ${threadListLookbackDays} days by name, path, or transcript`
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Folder"
          value={workingDirectoryFilterPath ?? allProjectsFilterValue}
          onChange={async (value) => {
            await projectFilter.setCwd(
              value === allProjectsFilterValue ? null : value,
            );
          }}
        >
          <List.Dropdown.Item
            title="All Folders"
            value={allProjectsFilterValue}
            icon={Icon.Folder}
          />
          {projectOptions.map((option) => (
            <List.Dropdown.Item
              key={option.cwd}
              title={option.title}
              value={option.cwd}
              icon={{ fileIcon: option.cwd }}
            />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {threadResultSections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={
            transcriptSearchWarning
              ? `${section.results.length} (transcript search unavailable)`
              : String(section.results.length)
          }
        >
          {section.results.map(({ thread, match }) => {
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
                    onRefresh={refreshThreadsAndSelectedMessages}
                    onThreadsChanged={revalidate}
                    onToggleDetail={() => {
                      setIsShowingDetail(!isShowingDetail);
                    }}
                    onToggleShowSubagents={() => {
                      setShowSubagents(!showSubagents);
                    }}
                    autoRenameCandidates={displayedThreads}
                    projectFilter={projectFilter}
                    thread={thread}
                    latestMessages={selectedLatestMessages}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
      {!isLoading && !isSearching && displayedThreadResults.length === 0 ? (
        <List.EmptyView
          title={getEmptyViewTitle(
            archived,
            threads.length,
            Boolean(trimmedSearchText),
          )}
          description={getEmptyViewDescription({
            archived,
            workingDirectoryFilterPath,
            searchError,
            transcriptSearchWarning,
            searchText: trimmedSearchText,
            unfilteredCount: threads.length,
          })}
          actions={
            workingDirectoryFilterPath ? (
              <ActionPanel>
                <Action
                  title="Clear Folder Filter"
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

function buildThreadResultSections(
  results: CodexThreadSearchResult[],
  archived: boolean,
): ThreadResultSection[] {
  if (archived) {
    return results.length > 0 ? [{ title: "Archived Threads", results }] : [];
  }

  const needsAttention = results
    .filter(({ thread }) => getAttentionPriority(thread) > 0)
    .sort(
      (left, right) =>
        getAttentionPriority(right.thread) -
          getAttentionPriority(left.thread) ||
        right.thread.updatedAt - left.thread.updatedAt,
    );
  const activeThreads = results.filter(
    ({ thread }) => getAttentionPriority(thread) === 0,
  );

  return [
    ...(needsAttention.length > 0
      ? ([{ title: "Needs Attention", results: needsAttention }] as const)
      : []),
    ...(activeThreads.length > 0
      ? ([{ title: "Active Threads", results: activeThreads }] as const)
      : []),
  ];
}

function getAttentionPriority(thread: CodexThread): number {
  if (thread.status.type !== "active") {
    return 0;
  }

  if (thread.status.activeFlags.includes("waitingOnApproval")) {
    return 2;
  }

  return thread.status.activeFlags.includes("waitingOnUserInput") ? 1 : 0;
}

async function searchVisibleThreads(
  threads: CodexThread[],
  query: string,
  archived: boolean,
  signal?: AbortSignal,
): Promise<ThreadSearchResponse> {
  const metadataResults = searchThreadMetadata(threads, query);
  // Skip the transcript search entirely when local matches already cover
  // every visible thread; there is nothing more it could add.
  if (threads.length === 0 || metadataResults.length === threads.length) {
    return { query, results: metadataResults, transcriptSearchWarning: null };
  }

  try {
    const hits = await searchThreads(
      query,
      {
        archived,
        maxResults: threadListMaxResults,
        windowDays: threadListLookbackDays,
      },
      signal,
    );
    const nativeResults = mapNativeThreadSearchResults(threads, hits);

    return {
      query,
      results: mergeThreadSearchResults(metadataResults, nativeResults),
      transcriptSearchWarning: null,
    };
  } catch (error) {
    // A superseded search is cancelled, not failed: let usePromise swallow it.
    if (isAbortError(error)) {
      throw error;
    }

    // Transcript search failed, but the local matches are still good.
    return {
      query,
      results: metadataResults,
      transcriptSearchWarning: getErrorMessage(error),
    };
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === "AbortError"
  );
}

function filterThreadsByWorkingDirectory(
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
  workingDirectoryFilterPath,
  searchError,
  transcriptSearchWarning,
  searchText,
  unfilteredCount,
}: {
  archived: boolean;
  workingDirectoryFilterPath: string | null;
  searchError?: Error;
  transcriptSearchWarning: string | null;
  searchText: string;
  unfilteredCount: number;
}): string {
  if (searchText) {
    if (searchError) {
      return `Search failed: ${getErrorMessage(searchError)}`;
    }

    if (transcriptSearchWarning) {
      return `No names or paths match "${searchText}", and transcript search is unavailable: ${transcriptSearchWarning}`;
    }

    return `No names, paths, previews, or transcripts match "${searchText}".`;
  }

  if (workingDirectoryFilterPath) {
    return `No ${archived ? "archived" : "active"} threads updated in the last ${
      threadListLookbackDays
    } days were found in ${tildeifyPath(workingDirectoryFilterPath)}.`;
  }

  if (archived) {
    return `Archived Codex threads updated in the last ${threadListLookbackDays} days will appear here.`;
  }

  if (unfilteredCount > 0) {
    return "Press ⌘⇧S to show subagent threads.";
  }

  return `Start or resume a Codex thread and it will appear here for ${threadListLookbackDays} days.`;
}

function ThreadActions({
  archived,
  isShowingDetail,
  showSubagents,
  onArchiveFilterChange,
  onRefresh,
  onThreadsChanged,
  onToggleDetail,
  onToggleShowSubagents,
  autoRenameCandidates,
  projectFilter,
  thread,
  latestMessages,
}: {
  archived: boolean;
  isShowingDetail: boolean;
  showSubagents: boolean;
  onArchiveFilterChange: (scope: ThreadScope) => Promise<void> | void;
  onRefresh: () => Promise<void>;
  onThreadsChanged: () => Promise<unknown> | void;
  onToggleDetail: () => void;
  onToggleShowSubagents: () => void;
  autoRenameCandidates: CodexThread[];
  projectFilter: WorkingDirectoryFilter;
  thread: CodexThread;
  latestMessages?: CodexThreadLatestMessages;
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
      <Action.ShowInFinder title="Show Directory in Finder" path={thread.cwd} />
      <Action
        title="Resume in Terminal"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
        onAction={async () => {
          await resumeThreadInTerminal(thread);
        }}
      />
      <Action
        title={isShowingDetail ? "Hide Details" : "Show Details"}
        icon={isShowingDetail ? Icon.AppWindowList : Icon.AppWindowSidebarRight}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={onToggleDetail}
      />
      <Action
        title="Refresh Threads"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={async () => {
          try {
            await onRefresh();
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

      <ActionPanel.Section>
        <Action.Push
          title="Rename"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
          target={
            <RenameThreadForm
              archived={archived}
              thread={thread}
              onRenameSuccess={onThreadsChanged}
            />
          }
        />
        <Action.Push
          title="Summarize"
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
        <Action
          title="Fork"
          icon={Icon.Duplicate}
          shortcut={{ modifiers: ["cmd", "opt"], key: "k" }}
          onAction={async () => {
            const forkResult = await runThreadMutation(
              "Forking Thread",
              archived ? "New fork created in active threads" : "Thread Forked",
              () =>
                forkThread(
                  thread.id,
                  `${getThreadDisplayTitle(thread)} [Fork]`,
                ),
              (result) =>
                result.renameWarning
                  ? truncate(`Rename Failed: ${result.renameWarning}`, 110)
                  : getThreadToastLabel(result.thread),
              {
                failureTitle: "Fork Failed",
                primaryAction: {
                  title: "Open Thread",
                  shortcut: { modifiers: ["cmd"], key: "t" },
                  onAction: (result) => openThreadInCodexApp(result.thread),
                },
              },
            );

            if (forkResult) {
              try {
                await onThreadsChanged();
              } catch (refreshError) {
                await showFailureToast(refreshError, {
                  title: "Thread forked, unable to refresh threads",
                });
              }
            }
          }}
        />
        <Action
          title="Export Markdown"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
          onAction={async () => {
            await exportThreadWithFeedback(thread);
          }}
        />
        {archived ? (
          <Action
            title="Unarchive"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
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
            title="Archive"
            icon={Icon.Box}
            shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
            onAction={async () => {
              const archivedThread = await performThreadMutation({
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
        <ActionPanel.Submenu title="Bulk Rename" icon={Icon.TextCursor}>
          {autoRenameBatchSizes.map((batchSize) => (
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

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Resume Command"
          content={buildResumeCommand(thread.id)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Thread Deeplink"
          content={buildThreadDeeplink(thread)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Working Directory"
          content={thread.cwd}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
        <Action
          title="Copy Last User Turn"
          icon={Icon.Clipboard}
          onAction={async () => {
            await copyLatestThreadTurn(thread, "user", latestMessages);
          }}
        />
        <Action
          title="Copy Last Assistant Turn"
          icon={Icon.Clipboard}
          onAction={async () => {
            await copyLatestThreadTurn(thread, "assistant", latestMessages);
          }}
        />
        <Action.CopyToClipboard title="Copy Thread ID" content={thread.id} />
      </ActionPanel.Section>

      <ActionPanel.Section>
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
            title="Clear Folder Filter"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={async () => {
              await projectFilter.setCwd(null);
            }}
          />
        ) : (
          <Action
            title="Filter to Folder"
            icon={Icon.Filter}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={async () => {
              await projectFilter.setCwd(thread.cwd);
            }}
          />
        )}
        <Action
          title={showSubagents ? "Hide Subagents" : "Show Subagents"}
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
      : "_✨ Summarizing Thread… ✨_";

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
              <Action.Paste
                title="Paste Summary"
                content={summaryDocument ?? ""}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
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
    onProgress: ({ completedCount, title, total }) => {
      toast.message = `${completedCount}/${total}: ${truncate(title, 54)}`;
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
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Exporting thread…",
    message: "Reading structured transcript and writing markdown",
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
      await open(buildThreadDeeplink(thread));
    },
  );
}

function buildThreadDeeplink(thread: CodexThread): string {
  return `codex://threads/${thread.id}`;
}

async function copyLatestThreadTurn(
  thread: CodexThread,
  role: "user" | "assistant",
  cachedMessages?: CodexThreadLatestMessages,
) {
  await runNoViewActionWithFailureToast("Unable to copy turn", async () => {
    await showToast({ style: Toast.Style.Animated, title: "Reading Thread" });
    const messages =
      cachedMessages ?? (await readLatestThreadMessages(thread.id));
    const text =
      role === "user"
        ? messages.lastUserMessage &&
          cleanCodexUserMessage(messages.lastUserMessage, "compact")
        : messages.lastAgentMessage;
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title:
          role === "user" ? "No User Turn Found" : "No Assistant Turn Found",
      });
      return;
    }

    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: "Copied" });
  });
}

async function resumeThreadInTerminal(thread: CodexThread) {
  await runNoViewActionWithFailureToast("Unable to resume thread", async () => {
    await openTerminalAtPathWithCommand(
      thread.cwd,
      buildResumeCommand(thread.id),
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
  loadingTitle: string;
  successTitle: string;
  failureTitle?: string;
  mutate: () => Promise<CodexThread>;
}): Promise<CodexThread | undefined> {
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
  const statusDescriptor = getCodexStatusDescriptor(thread.status);

  return {
    source: sourceDescriptor.icon,
    ...(statusDescriptor.label
      ? { tintColor: statusDescriptor.tintColor }
      : {}),
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
        color: subagentColor,
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
            title="Thread"
            icon={sourceDescriptor.icon}
            text={getThreadDisplayTitle(thread)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Signals">
            {statusDescriptor.label ? (
              <List.Item.Detail.Metadata.TagList.Item
                text={statusDescriptor.label}
                color={statusDescriptor.tintColor}
              />
            ) : null}
            <List.Item.Detail.Metadata.TagList.Item
              text={sourceDescriptor.label}
              color={Color.Blue}
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
                color={subagentColor}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Working Directory">
            <List.Item.Detail.Metadata.TagList.Item
              icon={Icon.Folder}
              text={tildeifyPath(thread.cwd)}
              color={Color.Blue}
              onAction={() => {
                void showInFinder(thread.cwd);
              }}
            />
            {thread.gitInfo?.branch ? (
              <List.Item.Detail.Metadata.TagList.Item
                icon={
                  thread.gitInfo.branch === "main"
                    ? Icon.House
                    : Icon.WrenchScrewdriver
                }
                text={thread.gitInfo.branch}
                color={
                  thread.gitInfo.branch === "main"
                    ? mainBranchColor
                    : featureBranchColor
                }
                onAction={() => {
                  void Clipboard.copy(thread.gitInfo?.branch ?? "");
                }}
              />
            ) : null}
            {thread.gitInfo?.sha ? (
              <List.Item.Detail.Metadata.TagList.Item
                icon={Icon.Code}
                text={thread.gitInfo.sha.slice(0, 8)}
                color={Color.SecondaryText}
                onAction={() => {
                  void Clipboard.copy(thread.gitInfo?.sha ?? "");
                }}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Activity">
            <List.Item.Detail.Metadata.TagList.Item
              icon={Icon.Clock}
              text={`Updated ${formatActivityTimestamp(thread.updatedAt)}`}
              color={Color.Green}
            />
            <List.Item.Detail.Metadata.TagList.Item
              icon={Icon.Calendar}
              text={`Created ${formatActivityTimestamp(thread.createdAt)}`}
              color={Color.SecondaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          {thread.forkedFromId ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Forked From"
                icon={Icon.Duplicate}
                text={thread.forkedFromId.slice(0, 8)}
              />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function formatActivityTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
      heading: latestTurnPresentation.user.detailHeading,
      body: latestMessages.lastUserMessage
        ? truncate(
            cleanCodexUserMessage(latestMessages.lastUserMessage, "compact"),
            latestTurnPreviewMaxLength,
          )
        : latestTurnPresentation.user.fallback,
      order: latestMessages.lastUserMessageOrder ?? Number.POSITIVE_INFINITY,
    },
    {
      heading: latestTurnPresentation.agent.detailHeading,
      body: latestMessages.lastAgentMessage
        ? truncate(latestMessages.lastAgentMessage, latestTurnPreviewMaxLength)
        : latestTurnPresentation.agent.fallback,
      order: latestMessages.lastAgentMessageOrder ?? Number.POSITIVE_INFINITY,
    },
  ].sort((left, right) => right.order - left.order);
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
      color: branch === "main" ? mainBranchColor : featureBranchColor,
    },
    tooltip: `Git branch: ${branch}`,
  };
}
