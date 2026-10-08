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
  Keyboard,
} from "@raycast/api";
import {
  showFailureToast,
  useCachedPromise,
  useCachedState,
  useForm,
  usePromise,
} from "@raycast/utils";
import { pathToFileURL } from "node:url";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  archiveThread,
  buildResumeCommand,
  type CodexThread,
  type CodexThreadLatestMessages,
  type CodexThreadSearchHit,
  forkThread,
  getCodexHome,
  listThreads,
  readLatestThreadMessages,
  readThreads,
  searchThreads,
  type SetThreadNameResult,
  setThreadName,
  threadListMaxResults,
  unarchiveThread,
} from "./utils/app-server";
import {
  agentColor,
  getBranchSubtitle,
  getCodexSourceDescriptor,
  automationColor,
  automationIcon,
  getModelTag,
  getStatusAccessory,
  getThreadIconAccessory,
  getUpdatedAtAccessory,
  maintenanceColor,
  subagentIcon,
} from "./utils/display";
import { probeThreadWriterLock } from "./utils/thread-writer-lock";
import { getChildThreadKind } from "./utils/threads";
import {
  mapTranscriptSearchResults,
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
  formatCount,
  getErrorMessage,
  getProjectName,
  getThreadAgentLabel,
  getThreadDisplayTitle,
  tildeifyPath,
  truncate,
} from "./utils/format";
import {
  getLatestTurnsLoadingOrErrorMarkdown,
  renderLatestTurnsMarkdown,
} from "./utils/latest-turns";
import { buildWorkingDirectoryOptionsFromThreads } from "./utils/projects";
import { cleanCodexUserMessage } from "./utils/message-cleaning";
import { removeLegacyThreadSearchCache } from "./utils/legacy-thread-search-cache";
import {
  runNoViewActionWithFailureToast,
  validateOnSubmitOnly,
} from "./utils/raycast";
import { openTerminalAtPathWithCommand } from "./utils/terminal";
import { buildCodexThreadUrl, openCodexThread } from "./utils/launch";
import { ThreadSubagentsList } from "./thread-subagents";
import { RefreshAction, ToggleDetailAction } from "./thread-actions";

type ThreadScope = "active" | "archived";
type WorkingDirectoryFilter = {
  cwd: string | null;
  setCwd: (cwd: string | null) => Promise<void> | void;
};

type ThreadResultSection = {
  title: "Needs Attention" | "Active Threads" | "Archived Threads";
  results: CodexThreadSearchResult[];
};

const autoRenameBatchSizes = [5, 10, 25, 50] as const;
const latestTurnPreviewMaxLength = 1500;
const allProjectsFilterValue = "__all_projects__";
const emptyThreads: CodexThread[] = [];
const emptyThreadIds: string[] = [];

type DirectChildCounts = {
  subagents: number;
  automations: number;
  maintenance: number;
};
const noChildren: DirectChildCounts = {
  subagents: 0,
  automations: 0,
  maintenance: 0,
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
  const [showChildThreads, setShowChildThreads] = useCachedState(
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
      },
    ],
    [archived],
  );
  const {
    data: fetchedThreads,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listThreads, threadListArgs, {
    keepPreviousData: true,
  });
  // Codex leaves a thread out of thread/list until it has its first message, so
  // a fork made here is read by id until the list starts returning it.
  const [forkedThreadIds, setForkedThreadIds] = useState<string[]>([]);
  const listedThreadIds = useMemo(
    () => new Set((fetchedThreads ?? emptyThreads).map((thread) => thread.id)),
    [fetchedThreads],
  );
  useEffect(() => {
    setForkedThreadIds((current) => {
      const remaining = current.filter((id) => !listedThreadIds.has(id));
      return remaining.length === current.length ? current : remaining;
    });
  }, [listedThreadIds]);
  const unlistedForkIds = useMemo(() => {
    if (archived || forkedThreadIds.length === 0) {
      return emptyThreadIds;
    }

    return forkedThreadIds.filter((id) => !listedThreadIds.has(id));
  }, [archived, forkedThreadIds, listedThreadIds]);
  const { data: unlistedForks, revalidate: revalidateUnlistedForks } =
    usePromise(
      async (ids: string[]) => (await readThreads(ids)).threads,
      [unlistedForkIds],
      { execute: unlistedForkIds.length > 0 },
    );
  // A read result outlives the ids that produced it, so the overlay is filtered
  // again here rather than trusted.
  const allThreads = useMemo(() => {
    const listed = fetchedThreads ?? emptyThreads;
    const eligibleIds = new Set(unlistedForkIds);
    const stillUnlisted = (unlistedForks ?? emptyThreads).filter((fork) =>
      eligibleIds.has(fork.id),
    );
    if (stillUnlisted.length === 0) {
      return listed;
    }

    return [...listed, ...stillUnlisted].sort(
      (left, right) => right.updatedAt - left.updatedAt,
    );
  }, [fetchedThreads, unlistedForkIds, unlistedForks]);
  // Both reloads report failure by resolving with the error, so surface the
  // first one for revalidateWithToast instead of discarding it.
  const revalidateThreads = async () => {
    const results = await Promise.all([
      revalidate(),
      revalidateUnlistedForks(),
    ]);
    return results.find((result) => result instanceof Error);
  };

  const cwdThreads = useMemo(
    () =>
      (allThreads ?? emptyThreads).filter((thread) =>
        matchesWorkingDirectory(thread, workingDirectoryFilterPath),
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
  // Counted across every thread, not just the filtered folder, so the badge
  // always agrees with the list behind it.
  const childCounts = useMemo(
    () => getDirectChildCounts(allThreads ?? emptyThreads),
    [allThreads],
  );
  const visibleThreads = useMemo(
    () => (showChildThreads ? cwdThreads : cwdThreads.filter(isRootThread)),
    [cwdThreads, showChildThreads],
  );
  const trimmedSearchText = searchText.trim();
  const shouldSearchTranscripts = trimmedSearchText.length >= 3;
  const metadataResults = useMemo(
    () =>
      trimmedSearchText
        ? searchThreadMetadata(visibleThreads, trimmedSearchText)
        : [],
    [trimmedSearchText, visibleThreads],
  );
  const [transcriptSearch, setTranscriptSearch] = useState<{
    query: string;
    archived: boolean;
    hits: CodexThreadSearchHit[];
  }>({ query: "", archived: false, hits: [] });
  const searchAbortable = useRef<AbortController>(undefined);
  const { error: searchError, isLoading: isSearching } = usePromise(
    (query: string, isArchived: boolean) =>
      searchThreads(
        query,
        { archived: isArchived, maxResults: threadListMaxResults },
        {
          signal: searchAbortable.current?.signal,
          onPage: (hits) => {
            setTranscriptSearch({
              query,
              archived: isArchived,
              hits: [...hits],
            });
          },
        },
      ),
    [trimmedSearchText, archived],
    {
      execute: shouldSearchTranscripts,
      abortable: searchAbortable,
      failureToastOptions: { title: "Unable to search Codex threads" },
    },
  );
  const currentTranscriptHits =
    shouldSearchTranscripts &&
    transcriptSearch.query === trimmedSearchText &&
    transcriptSearch.archived === archived
      ? transcriptSearch.hits
      : [];
  const transcriptSearchWarning =
    shouldSearchTranscripts && searchError
      ? getErrorMessage(searchError)
      : null;

  const displayedThreadResults = useMemo<CodexThreadSearchResult[]>(() => {
    if (trimmedSearchText) {
      const transcriptResults = mapTranscriptSearchResults(
        currentTranscriptHits.filter(
          ({ thread }) =>
            matchesWorkingDirectory(thread, workingDirectoryFilterPath) &&
            (showChildThreads || isRootThread(thread)),
        ),
      );
      return mergeThreadSearchResults(metadataResults, transcriptResults);
    }

    return visibleThreads.map((thread) => ({
      thread,
      match: null,
      score: thread.updatedAt,
    }));
  }, [
    currentTranscriptHits,
    metadataResults,
    showChildThreads,
    trimmedSearchText,
    visibleThreads,
    workingDirectoryFilterPath,
  ]);
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
    const threadsResult = await revalidateThreads();
    if (isShowingDetail && effectiveSelectedThreadId) {
      const messagesResult = await revalidateLatestSelectedThreadMessages();
      return threadsResult ?? messagesResult;
    }
    return threadsResult;
  };

  if (!fetchedThreads?.length && error) {
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
      isLoading={isLoading || (shouldSearchTranscripts && isSearching)}
      isShowingDetail={isShowingDetail}
      filtering={false}
      onSelectionChange={setSelectedThreadId}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder={
        workingDirectoryFilterPath
          ? `Search ${getProjectName(workingDirectoryFilterPath)} threads and transcripts`
          : "Search threads and transcripts"
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
            title="All"
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
            const threadChildCounts = childCounts.get(thread.id) ?? noChildren;
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
                icon={getThreadIconAccessory(thread)}
                accessories={getThreadAccessories(
                  thread,
                  threadChildCounts.subagents,
                  isShowingDetail,
                  workingDirectoryFilterPath,
                )}
                detail={
                  isShowingDetail && isSelected
                    ? buildThreadDetail(
                        thread,
                        threadChildCounts,
                        match,
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
                    showChildThreads={showChildThreads}
                    onArchiveFilterChange={setThreadScope}
                    onRefresh={refreshThreadsAndSelectedMessages}
                    onForkCreated={(threadId) => {
                      setForkedThreadIds((current) =>
                        current.includes(threadId)
                          ? current
                          : [...current, threadId],
                      );
                    }}
                    onThreadArchived={(threadId) => {
                      setForkedThreadIds((current) =>
                        current.filter((id) => id !== threadId),
                      );
                    }}
                    onThreadsChanged={revalidateThreads}
                    onToggleDetail={() => {
                      setIsShowingDetail(!isShowingDetail);
                    }}
                    onToggleShowSubagents={() => {
                      setShowChildThreads(!showChildThreads);
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
      {!isLoading &&
      !(shouldSearchTranscripts && isSearching) &&
      displayedThreadResults.length === 0 ? (
        <List.EmptyView
          title={getEmptyViewTitle(
            archived,
            cwdThreads.length,
            Boolean(trimmedSearchText),
          )}
          description={getEmptyViewDescription({
            archived,
            workingDirectoryFilterPath,
            searchError,
            didSearchTranscripts: shouldSearchTranscripts,
            searchText: trimmedSearchText,
            unfilteredCount: cwdThreads.length,
          })}
          actions={
            <ActionPanel>
              {!showChildThreads && cwdThreads.length > 0 ? (
                <Action
                  title="Show Child Threads"
                  icon={subagentIcon}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={() => setShowChildThreads(true)}
                />
              ) : null}
              {workingDirectoryFilterPath ? (
                <Action
                  title="Clear Folder Filter"
                  icon={Icon.XMarkCircle}
                  onAction={async () => {
                    await projectFilter.setCwd(null);
                  }}
                />
              ) : null}
            </ActionPanel>
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

  const sections: ThreadResultSection[] = [];
  if (needsAttention.length > 0) {
    sections.push({ title: "Needs Attention", results: needsAttention });
  }
  if (activeThreads.length > 0) {
    sections.push({ title: "Active Threads", results: activeThreads });
  }
  return sections;
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

function matchesWorkingDirectory(
  thread: CodexThread,
  projectCwd: string | null,
): boolean {
  return !projectCwd || thread.cwd === projectCwd;
}

function isRootThread(thread: CodexThread): boolean {
  return thread.parentThreadId === null;
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
      value: match.snippet,
      tooltip: `${projectName}: ${match.snippet}`,
    };
  }

  return getBranchSubtitle(thread);
}

function getEmptyViewTitle(
  archived: boolean,
  unfilteredCount: number,
  isSearching: boolean,
): string {
  if (isSearching) {
    return "No Matching Threads";
  }

  if (unfilteredCount > 0) {
    return "Child Threads Hidden";
  }

  return archived ? "No Archived Threads" : "No Threads Found";
}

function getEmptyViewDescription({
  archived,
  workingDirectoryFilterPath,
  didSearchTranscripts,
  searchError,
  searchText,
  unfilteredCount,
}: {
  archived: boolean;
  workingDirectoryFilterPath: string | null;
  didSearchTranscripts: boolean;
  searchError?: Error;
  searchText: string;
  unfilteredCount: number;
}): string {
  if (searchText) {
    if (didSearchTranscripts && searchError) {
      return `No names or paths match "${searchText}", and transcript search is unavailable: ${getErrorMessage(searchError)}`;
    }

    if (didSearchTranscripts) {
      return `No names, paths, previews, or transcripts match "${searchText}".`;
    }

    return `No names, paths, or previews match "${searchText}". Type at least 3 characters to search transcripts.`;
  }

  if (unfilteredCount > 0) {
    return "Press ⌘⇧S to show child threads.";
  }

  if (workingDirectoryFilterPath) {
    return `No ${archived ? "archived" : "active"} threads were found in ${tildeifyPath(workingDirectoryFilterPath)}.`;
  }

  if (archived) {
    return "Archived Codex threads will appear here.";
  }

  return "Start or resume a Codex thread and it will appear here.";
}

function ThreadActions({
  archived,
  isShowingDetail,
  showChildThreads,
  onArchiveFilterChange,
  onForkCreated,
  onThreadArchived,
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
  showChildThreads: boolean;
  onArchiveFilterChange: (scope: ThreadScope) => Promise<void> | void;
  onForkCreated: (threadId: string) => void;
  onThreadArchived: (threadId: string) => void;
  onRefresh: () => Promise<unknown>;
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
      <Action.ShowInFinder
        title="Open in Finder"
        path={thread.cwd}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action
        title="Resume in Terminal"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
        onAction={async () => {
          await resumeThreadInTerminal(thread);
        }}
      />
      <ToggleDetailAction
        isShowingDetail={isShowingDetail}
        onToggleDetail={onToggleDetail}
      />
      <RefreshAction
        title="Refresh Threads"
        successTitle="Threads Refreshed"
        failureTitle="Couldn't refresh threads"
        onRefresh={onRefresh}
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
        <Action
          title="Auto Rename"
          icon={Icon.Wand}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={async () => {
            await autoRenameThread(thread, archived, onThreadsChanged);
          }}
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
                failureTitle: "Couldn't fork thread",
                primaryAction: {
                  title: "Open Thread",
                  shortcut: { modifiers: ["cmd"], key: "t" },
                  onAction: (result) => openThreadInCodexApp(result.thread),
                },
              },
            );

            if (forkResult) {
              onForkCreated(forkResult.thread.id);
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
                failureTitle: "Couldn't restore thread",
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
                failureTitle: "Couldn't archive thread",
                mutate: async () => {
                  await archiveThread(thread.id);
                  return thread;
                },
              });

              if (archivedThread) {
                onThreadArchived(archivedThread.id);
                await onThreadsChanged();
              }
            }}
          />
        )}
        <ActionPanel.Submenu title="Bulk Auto Rename" icon={Icon.TextCursor}>
          {autoRenameBatchSizes.map((batchSize) => (
            <Action
              key={batchSize}
              title={`Auto Rename Latest ${batchSize} Visible Threads`}
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
          content={buildCodexThreadUrl(thread.id)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy Working Directory"
          content={thread.cwd}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
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
        <Action.Push
          title="Browse Child Threads"
          icon={subagentIcon}
          target={<ThreadSubagentsList parent={thread} archived={archived} />}
        />
        <Action
          title={showChildThreads ? "Hide Child Threads" : "Show Child Threads"}
          icon={showChildThreads ? Icon.EyeDisabled : subagentIcon}
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
      <Form.TextField
        title="Name"
        placeholder="Enter a semantic thread name"
        {...validateOnSubmitOnly(itemProps.name)}
      />
      <Form.Description title="Thread ID" text={thread.id} />
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

async function autoRenameThread(
  thread: CodexThread,
  archived: boolean,
  onThreadsChanged: () => Promise<unknown> | void,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Auto Renaming Thread",
    message: truncate(getThreadDisplayTitle(thread), 110),
  });
  const [result] = await autoRenameCodexThreads({
    archived,
    threads: [thread],
  });

  if (!result || result.status === "failed") {
    toast.style = Toast.Style.Failure;
    toast.title = "Auto Rename Failed";
    toast.message = result?.error ?? "The thread could not be renamed.";
    return;
  }

  if (result.status === "skipped") {
    toast.style = Toast.Style.Success;
    toast.title = "Thread Name Unchanged";
    toast.message = truncate(result.previousTitle, 110);
    return;
  }

  try {
    await onThreadsChanged();
  } catch (error) {
    await showFailureToast(error, {
      title: "Thread renamed, unable to refresh threads",
    });
  }

  toast.style = Toast.Style.Success;
  toast.title = "Thread Renamed";
  toast.message =
    result.renameStrategy === "archivedFallback"
      ? `Used archived fallback: ${truncate(result.nextTitle ?? result.previousTitle, 86)}`
      : truncate(result.nextTitle ?? result.previousTitle, 110);
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
    title: "Auto Renaming Threads",
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
      await openCodexThread(thread.id);
    },
  );
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
  // Check at press time: another Codex session may have opened the thread
  // since the list loaded. "unknown" falls through to Codex's own error.
  const lockState = await probeThreadWriterLock(
    await getCodexHome(),
    thread.id,
  );
  if (lockState === "locked") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Thread is already open in another Codex session",
    });
    return;
  }

  await runNoViewActionWithFailureToast("Unable to resume thread", async () => {
    await openTerminalAtPathWithCommand(
      thread.cwd,
      buildResumeCommand(thread.id),
    );
  });
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

function getThreadAccessories(
  thread: CodexThread,
  directSubagentCount: number,
  isShowingDetail: boolean,
  projectCwd: string | null,
): List.Item.Accessory[] {
  if (isShowingDetail) {
    return [];
  }

  const accessories: List.Item.Accessory[] = [];
  const statusAccessory = getStatusAccessory(thread);

  if (!projectCwd && thread.cwd.trim()) {
    accessories.push({
      tag: { value: getProjectName(thread.cwd), color: Color.Blue },
      tooltip: thread.cwd,
    });
  }

  if (statusAccessory) {
    accessories.push(statusAccessory);
  }

  if (directSubagentCount > 0) {
    accessories.push({
      tag: {
        value: formatCount(directSubagentCount, "subagent"),
        color: agentColor,
      },
      tooltip: `${formatCount(directSubagentCount, "subagent")} started from this thread`,
    });
  }

  accessories.push(getUpdatedAtAccessory(thread));

  return accessories;
}

function buildThreadDetail(
  thread: CodexThread,
  childCounts: DirectChildCounts,
  match: CodexThreadSearchMatch | null,
  latestMessages?: CodexThreadLatestMessages,
  isLatestMessagesLoading = false,
  latestMessagesError?: Error,
) {
  const sourceDescriptor = getCodexSourceDescriptor(thread.source);
  const agentLabel = getThreadAgentLabel(thread);
  const latestTurnsMarkdown = getLatestTurnsMarkdown(
    latestMessages,
    isLatestMessagesLoading,
    latestMessagesError,
  );
  const searchMatchMarkdown = match?.snippet
    ? `### Search Match\n\n> ${match.snippet}`
    : null;
  return (
    <List.Item.Detail
      markdown={[searchMatchMarkdown, latestTurnsMarkdown]
        .filter(Boolean)
        .join("\n\n---\n\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Overview">
            {sourceDescriptor.isSubagent && agentLabel ? null : (
              <List.Item.Detail.Metadata.TagList.Item
                text={sourceDescriptor.label}
                color={sourceDescriptor.color}
              />
            )}
            {agentLabel ? (
              <List.Item.Detail.Metadata.TagList.Item
                text={agentLabel}
                color={agentColor}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Working Directory"
            target={pathToFileURL(thread.cwd).href}
            text={tildeifyPath(thread.cwd)}
          />
          {thread.model ||
          Object.values(childCounts).some((count) => count > 0) ? (
            <List.Item.Detail.Metadata.TagList title="Model & Threads">
              {thread.model ? (
                <List.Item.Detail.Metadata.TagList.Item
                  {...getModelTag(thread.model, thread.reasoningEffort)}
                />
              ) : null}
              {childCounts.subagents > 0 ? (
                <List.Item.Detail.Metadata.TagList.Item
                  text={formatCount(childCounts.subagents, "subagent")}
                  color={agentColor}
                />
              ) : null}
              {childCounts.automations > 0 ? (
                <List.Item.Detail.Metadata.TagList.Item
                  icon={automationIcon}
                  text={formatCount(childCounts.automations, "automation")}
                  color={automationColor}
                />
              ) : null}
              {childCounts.maintenance > 0 ? (
                <List.Item.Detail.Metadata.TagList.Item
                  icon={Icon.Gear}
                  text={formatCount(
                    childCounts.maintenance,
                    "maintenance thread",
                  )}
                  color={maintenanceColor}
                />
              ) : null}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Activity">
            <List.Item.Detail.Metadata.TagList.Item
              icon={Icon.Clock}
              text={`Created ${formatActivityTimestamp(thread.createdAt)}`}
            />
            <List.Item.Detail.Metadata.TagList.Item
              icon={Icon.Clock}
              text={`Updated ${formatActivityTimestamp(thread.updatedAt)}`}
            />
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function formatActivityTimestamp(seconds: number): string {
  const date = new Date(seconds * 1000);
  const day = date.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} ${time}`;
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
  return renderLatestTurnsMarkdown({
    response: latestMessages?.lastAgentMessage
      ? truncate(latestMessages.lastAgentMessage, latestTurnPreviewMaxLength)
      : "No Codex response yet.",
    userMessage: latestMessages?.lastUserMessage
      ? truncate(
          cleanCodexUserMessage(latestMessages.lastUserMessage, "compact"),
          latestTurnPreviewMaxLength,
        )
      : "No message from you yet.",
  });
}

function getDirectChildCounts(
  threads: CodexThread[],
): Map<string, DirectChildCounts> {
  const counts = new Map<string, DirectChildCounts>();

  for (const thread of threads) {
    const parentThreadId = thread.parentThreadId;
    if (!parentThreadId) continue;

    const parentCounts = counts.get(parentThreadId) ?? { ...noChildren };
    const kind = getChildThreadKind(thread.source);
    if (kind === "subagent") {
      parentCounts.subagents += 1;
    } else if (kind === "automation") {
      parentCounts.automations += 1;
    } else {
      parentCounts.maintenance += 1;
    }
    counts.set(parentThreadId, parentCounts);
  }

  return counts;
}
