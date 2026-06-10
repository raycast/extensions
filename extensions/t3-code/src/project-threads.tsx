import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SHELL_FRESH_MS,
  SHELL_POLL_COALESCE_MS,
  classifyError,
  dispatch,
  fetchProjectThreads,
  fetchServerProviders,
  nextPollInterval,
  peekProjectThreads,
} from "./api";
import {
  Device,
  ModelOption,
  ModelSelection,
  OrchestrationProject,
  ServerProvider,
  ThreadSummary,
} from "./types";
import ThreadDetail from "./thread-detail";
import NewThreadForm from "./new-thread";
import {
  T3_CODE_ICON,
  appShortcut,
  fullStatusText,
  t3CodeUrl,
} from "./raycast-ui";
import {
  readCachedProjectThreads,
  readCachedProviderCatalog,
} from "./snapshot-cache";

export default function ProjectThreads({
  device,
  projectId,
  initialProject,
}: {
  device: Device;
  projectId: string;
  initialProject?: OrchestrationProject;
}) {
  // Render instantly from the shell data the project list just fetched,
  // falling back to the disk cache; the network only revalidates after.
  const initialData = useMemo(
    () =>
      peekProjectThreads(device.baseUrl, projectId) ??
      readCachedProjectThreads(device.baseUrl, projectId),
    [device.baseUrl, projectId],
  );
  const [threads, setThreads] = useState<ThreadSummary[]>(
    initialData?.threads ?? [],
  );
  const [project, setProject] = useState<OrchestrationProject | null>(
    initialProject ?? initialData?.project ?? null,
  );
  const [providers, setProviders] = useState<ServerProvider[]>(() => {
    const cached = readCachedProviderCatalog(device.baseUrl);
    return cached?.providers ?? [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  const doFetch = useCallback(
    async (maxAgeMs = 0) => {
      try {
        const result = await fetchProjectThreads(
          device.baseUrl,
          device.accessToken,
          projectId,
          maxAgeMs,
        );
        setThreads(result.threads);
        setProject(result.project);
        setError(null);
        retryCountRef.current = 0;
        return result.threads;
      } catch (err) {
        const classified = classifyError(err);
        setError(classified.message);
        retryCountRef.current += 1;
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [device, projectId],
  );

  const schedulePoll = useCallback(
    (threadList: ThreadSummary[] | null) => {
      if (disposedRef.current) return;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      const anyRunning = threadList?.some(
        (t) => displayState(t).state === "working",
      );
      const interval = nextPollInterval(retryCountRef.current, !!anyRunning);
      pollTimerRef.current = setTimeout(async () => {
        const result = await doFetch(SHELL_POLL_COALESCE_MS);
        schedulePoll(result);
      }, interval);
    },
    [doFetch],
  );

  const loadProviders = useCallback(async () => {
    const nextProviders = await fetchServerProviders(
      device.baseUrl,
      device.accessToken,
    ).catch(() => null);
    if (nextProviders) setProviders(nextProviders);
  }, [device]);

  useEffect(() => {
    void (async () => {
      void loadProviders();
      const result = await doFetch(SHELL_FRESH_MS);
      schedulePoll(result);
    })();
    return () => {
      disposedRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  async function handleRefresh() {
    retryCountRef.current = 0;
    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Refreshing...");
    const [result] = await Promise.all([doFetch(), loadProviders()]);
    schedulePoll(result);
    toast.style = result ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = result ? "Refreshed" : "Refresh failed";
  }

  async function handleStop(threadId: string) {
    try {
      await dispatch(device.baseUrl, device.accessToken, {
        type: "thread.turn.interrupt",
        commandId: crypto.randomUUID(),
        threadId,
        createdAt: new Date().toISOString(),
      });
      await showToast(Toast.Style.Success, "Agent stopped");
      void handleRefresh();
    } catch (err) {
      const classified = classifyError(err);
      await showToast(Toast.Style.Failure, classified.message);
    }
  }

  async function handleArchive(threadId: string) {
    try {
      await dispatch(device.baseUrl, device.accessToken, {
        type: "thread.archive",
        commandId: crypto.randomUUID(),
        threadId,
      });
      await showToast(Toast.Style.Success, "Thread archived");
      void handleRefresh();
    } catch (err) {
      const classified = classifyError(err);
      await showToast(Toast.Style.Failure, classified.message);
    }
  }

  if (error && threads.length === 0) {
    return (
      <List navigationTitle={project?.title ?? "Project"}>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Cannot Load Threads"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                shortcut={appShortcut("r")}
                onAction={() => void handleRefresh()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={project?.title ?? "Project"}
      searchBarPlaceholder="Search threads..."
    >
      {threads.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No Threads"
          description="Start a new thread to begin working with an agent."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={appShortcut("r")}
                onAction={() => void handleRefresh()}
              />
              <Action.Push
                title="New Thread"
                icon={Icon.Plus}
                shortcut={appShortcut("n")}
                target={
                  <NewThreadForm
                    device={device}
                    preselectedProjectId={projectId}
                    modelOptions={deriveModelOptions(
                      project,
                      threads,
                      providers,
                    )}
                    onDone={async () => void handleRefresh()}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        threads.map((thread) => {
          const { color, label } = statusDisplay(thread);
          const isRunning = displayState(thread).state === "working";

          const accessories: List.Item.Accessory[] = [
            { tag: { value: label, color } },
          ];
          if (thread.hasPendingApprovals) {
            accessories.push({
              tag: { value: "Needs Approval", color: Color.Yellow },
            });
          }
          if (thread.hasPendingUserInput) {
            accessories.push({
              tag: { value: "Waiting for Input", color: Color.Blue },
            });
          }
          accessories.push({ text: timeAgo(thread.updatedAt) });

          return (
            <List.Item
              key={thread.id}
              icon={{ source: Icon.Circle, tintColor: color }}
              title={thread.title}
              subtitle={thread.branch ?? undefined}
              accessories={accessories}
              keywords={[thread.title]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Open Thread"
                      icon={Icon.ArrowRight}
                      shortcut={appShortcut("return")}
                      target={
                        <ThreadDetail
                          device={device}
                          initialThread={thread}
                          modelOptions={deriveModelOptions(
                            project,
                            threads,
                            providers,
                            thread.modelSelection.instanceId,
                          )}
                        />
                      }
                    />
                    <Action.Push
                      title="New Thread"
                      icon={Icon.Plus}
                      shortcut={appShortcut("n")}
                      target={
                        <NewThreadForm
                          device={device}
                          preselectedProjectId={projectId}
                          modelOptions={deriveModelOptions(
                            project,
                            threads,
                            providers,
                          )}
                          onDone={async () => void handleRefresh()}
                        />
                      }
                    />
                    {isRunning && (
                      <Action
                        title="Stop Agent"
                        icon={Icon.Stop}
                        shortcut={appShortcut(".")}
                        onAction={() => void handleStop(thread.id)}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Open in T3 Code"
                      icon={T3_CODE_ICON}
                      url={t3CodeUrl(device, thread)}
                      shortcut={appShortcut("o")}
                    />
                    <Action.CopyToClipboard
                      title="Copy Status"
                      content={fullStatusText(
                        thread,
                        label,
                        timeAgo(thread.updatedAt),
                      )}
                      shortcut={appShortcut("i")}
                    />
                    <Action.CopyToClipboard
                      title="Copy Thread ID"
                      content={thread.id}
                      shortcut={appShortcut("c", ["shift"])}
                    />
                    <Action
                      title="Archive Thread"
                      icon={Icon.Tray}
                      shortcut={appShortcut("a", ["shift"])}
                      onAction={() => void handleArchive(thread.id)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      shortcut={appShortcut("r")}
                      onAction={() => void handleRefresh()}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function displayState(thread: ThreadSummary): {
  state: "idle" | "working" | "error" | "complete" | "stopped";
} {
  if (
    thread.sessionStatus === "error" ||
    thread.latestTurnState === "error" ||
    thread.sessionLastError
  ) {
    return { state: "error" };
  }
  if (
    thread.sessionStatus === "running" ||
    thread.sessionStatus === "starting" ||
    thread.latestTurnState === "running"
  ) {
    return { state: "working" };
  }
  if (
    thread.sessionStatus === "ready" ||
    thread.latestTurnState === "completed"
  ) {
    return { state: "complete" };
  }
  if (
    thread.sessionStatus === "interrupted" ||
    thread.sessionStatus === "stopped" ||
    thread.latestTurnState === "interrupted"
  ) {
    return { state: "stopped" };
  }
  return { state: "idle" };
}

function statusDisplay(thread: ThreadSummary): { color: Color; label: string } {
  switch (displayState(thread).state) {
    case "working":
      return { color: Color.Orange, label: "Working" };
    case "error":
      return { color: Color.Red, label: "Error" };
    case "complete":
      return { color: Color.Green, label: "Complete" };
    case "stopped":
      return { color: Color.Yellow, label: "Stopped" };
    case "idle":
      return { color: Color.SecondaryText, label: "Idle" };
  }
}

function deriveModelOptions(
  project: OrchestrationProject | null,
  threads: ThreadSummary[],
  providers: ServerProvider[],
  instanceId?: string,
): ModelOption[] {
  const seen = new Set<string>();
  const options: ModelOption[] = [];
  const addSelection = (selection: ModelSelection | null) => {
    if (!selection) return;
    if (instanceId && selection.instanceId !== instanceId) return;
    const key = modelKey(selection);
    if (seen.has(key)) return;
    seen.add(key);
    options.push({
      key,
      instanceId: selection.instanceId,
      model: selection.model,
      label: selection.model,
      providerLabel: selection.instanceId,
    });
  };
  const addProviderModel = (
    provider: ServerProvider,
    model: string,
    label: string,
  ) => {
    const key = modelKey({ instanceId: provider.instanceId, model });
    if (seen.has(key)) return;
    seen.add(key);
    options.push({
      key,
      instanceId: provider.instanceId,
      model,
      label,
      providerLabel: providerDisplayLabel(provider),
    });
  };

  for (const provider of providers) {
    if (instanceId && provider.instanceId !== instanceId) continue;
    if (!provider.enabled || !provider.installed) continue;
    if (provider.auth?.status === "unauthenticated") continue;
    for (const model of provider.models) {
      addProviderModel(
        provider,
        model.slug,
        model.name || model.shortName || model.slug,
      );
    }
  }
  addSelection(project?.defaultModelSelection ?? null);
  for (const thread of threads) addSelection(thread.modelSelection);
  return options.sort((a, b) => a.model.localeCompare(b.model));
}

function modelKey(selection: ModelSelection): string {
  return `${selection.instanceId}::${selection.model}`;
}

function providerDisplayLabel(provider: ServerProvider): string {
  if (provider.displayName) return provider.displayName;
  if (provider.driver === "codex") return "Codex";
  if (provider.driver === "claudeAgent") return "Claude";
  return provider.instanceId;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
