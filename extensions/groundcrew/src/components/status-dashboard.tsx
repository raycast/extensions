import {
  Action,
  ActionPanel,
  Alert,
  Cache,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { GroundcrewClientError } from "../cli";
import type {
  GroundcrewLifecycleResult,
  GroundcrewStatusBlockedIssue,
  GroundcrewStatusBoardIssue,
  GroundcrewStatusInventory,
  GroundcrewStatusQueueIssue,
  GroundcrewStatusTask,
  GroundcrewStatusWorktree,
  GroundcrewTask,
} from "../types/groundcrew";
import { GroundcrewDoctor } from "./doctor";
import {
  findCanonicalTask,
  findLifecycleTask,
  LifecycleActions,
  type LifecycleActionController,
  lifecycleErrorDetail,
  type LifecycleMutations,
  type LifecycleTaskSelection,
  useLifecycleActionController,
} from "./lifecycle-actions";
import { WorkspaceActions } from "./workspace-actions";

interface StatusDashboardProps {
  cleanupAllTasks?: (options?: { force?: boolean }) => Promise<GroundcrewLifecycleResult>;
  loadStatus: () => Promise<GroundcrewStatusInventory>;
  loadTasks: () => Promise<GroundcrewTask[]>;
  mutations: LifecycleMutations;
}

const GROUNDCREW_INSTALL_URL = "https://www.npmjs.com/package/@clipboard-health/groundcrew";

interface AsyncState<T> {
  error?: unknown;
  isLoading: boolean;
  value?: T;
}

type ReloadResult<T> = { kind: "success"; value: T } | { kind: "failure"; error: unknown } | { kind: "stale" };

interface StatusErrorPresentation {
  description: string;
  showPreferences: boolean;
  title: string;
}

const cache = new Cache();

function readCache<T>(key: string): T | undefined {
  try {
    const raw = cache.get(key);
    return raw === undefined ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    cache.set(key, JSON.stringify(value));
  } catch {
    // Cache write failures only cost first-paint speed; ignore them.
  }
}

interface UseAsyncValueOptions {
  cacheKey?: string;
  revalidateIntervalMs?: number;
}

/**
 * Loads a value, with optional stale-while-revalidate caching (renders the last
 * snapshot instantly) and background auto-refresh while the view is open.
 */
function useAsyncValue<T>(loader: () => Promise<T>, options: UseAsyncValueOptions = {}) {
  const { cacheKey, revalidateIntervalMs } = options;
  const seed = cacheKey === undefined ? undefined : readCache<T>(cacheKey);
  const [state, setState] = useState<AsyncState<T>>({
    isLoading: true,
    ...(seed === undefined ? {} : { value: seed }),
  });
  const mounted = useRef(false);
  const requestId = useRef(0);

  const reload = useCallback(async (): Promise<ReloadResult<T>> => {
    const currentRequest = ++requestId.current;
    setState((current) => ({ ...current, error: undefined, isLoading: true }));
    try {
      const value = await loader();
      if (mounted.current && currentRequest === requestId.current) {
        setState({ isLoading: false, value });
        if (cacheKey !== undefined) {
          writeCache(cacheKey, value);
        }
        return { kind: "success", value };
      }
      return { kind: "stale" };
    } catch (error) {
      if (mounted.current && currentRequest === requestId.current) {
        setState((current) => ({ ...current, error, isLoading: false }));
        return { kind: "failure", error };
      }
      return { kind: "stale" };
    }
  }, [loader, cacheKey]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    const timer =
      revalidateIntervalMs !== undefined && revalidateIntervalMs > 0
        ? setInterval(() => {
            void reload();
          }, revalidateIntervalMs)
        : undefined;
    // Don't let the poll timer keep the process alive (matters for tests/headless).
    timer?.unref?.();
    return () => {
      mounted.current = false;
      requestId.current += 1;
      if (timer !== undefined) {
        clearInterval(timer);
      }
    };
  }, [reload, revalidateIntervalMs]);

  return { ...state, reload };
}

function cleanupAllSummary(output: string): string | undefined {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const cleaned = lines.filter((line) => /cleanup complete/i.test(line)).length;
  const skipped = lines.filter((line) => /skipping/i.test(line)).length;
  const failed = lines.filter((line) => /cleanup failed/i.test(line)).length;
  const parts = [
    cleaned > 0 ? `${cleaned} cleaned` : undefined,
    skipped > 0 ? `${skipped} skipped` : undefined,
    failed > 0 ? `${failed} failed` : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function CleanupAllWorkspacesAction({
  cleanupAllTasks,
  count,
  onRefresh,
}: {
  cleanupAllTasks: (options?: { force?: boolean }) => Promise<GroundcrewLifecycleResult>;
  count: number;
  onRefresh: () => Promise<void>;
}) {
  const workspaces = `${count} preserved ${count === 1 ? "workspace" : "workspaces"}`;
  const run = async (force: boolean) => {
    const confirmed = await confirmAlert(
      force
        ? {
            title: `Force clean up ${workspaces}?`,
            message:
              "Removes every idle or interrupted Groundcrew workspace, including worktrees with uncommitted changes. Discarded changes cannot be recovered. Active sessions are still skipped.",
            primaryAction: { title: "Force Clean up All", style: Alert.ActionStyle.Destructive },
          }
        : {
            title: `Clean up ${workspaces}?`,
            message:
              "Removes every idle or interrupted Groundcrew workspace. Active sessions and worktrees with uncommitted changes are skipped.",
            primaryAction: { title: "Clean up All", style: Alert.ActionStyle.Destructive },
          },
    );
    if (!confirmed) {
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: force ? "Force Cleaning up Idle Workspaces" : "Cleaning up Idle Workspaces",
    });
    const result = await cleanupAllTasks(force ? { force: true } : undefined);
    const summary = cleanupAllSummary(`${result.stdout}\n${result.stderr}`);
    if (result.kind === "success") {
      toast.style = Toast.Style.Success;
      toast.title = "Idle Workspaces Cleaned up";
      toast.message = summary ?? "No workspaces required cleanup.";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn’t Clean up All Workspaces";
      toast.message = lifecycleErrorDetail(result) ?? summary ?? "Cleanup failed.";
    }
    await onRefresh();
  };
  return (
    <>
      <Action
        title="Clean up All Idle Workspaces"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.RemoveAll}
        onAction={() => run(false)}
      />
      <Action
        title="Clean up All Idle Workspaces (Force)"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => run(true)}
      />
    </>
  );
}

function isActiveTask(task: GroundcrewStatusTask): boolean {
  return (
    task.worktrees.length > 0 &&
    task.session !== "exited" &&
    (task.lifecycle === "provisioning" || task.lifecycle === "running" || task.lifecycle === "resumed")
  );
}

function localTaskState(task: GroundcrewStatusTask): string {
  if (task.worktrees.length === 0) {
    return "Missing Workspace";
  }
  if (task.session === "exited") {
    return "Exited";
  }
  switch (task.lifecycle) {
    case "provisioning":
      return "Provisioning";
    case "running":
      return "Running";
    case "interrupted":
      return "Interrupted";
    case "resumed":
      return "Resumed";
    case "failed-to-launch":
      return "Failed to Launch";
    case "idle":
      return "Idle";
  }
}

function localTaskColor(task: GroundcrewStatusTask): Color {
  if (task.worktrees.length === 0 || task.lifecycle === "failed-to-launch") {
    return Color.Red;
  }
  if (task.session === "exited" || task.lifecycle === "interrupted") {
    return Color.Yellow;
  }
  if (task.lifecycle === "resumed") {
    return Color.Blue;
  }
  return task.lifecycle === "running" ? Color.Green : Color.SecondaryText;
}

function localTaskIcon(task: GroundcrewStatusTask): Icon {
  if (task.worktrees.length === 0 || task.lifecycle === "failed-to-launch") {
    return Icon.XMarkCircle;
  }
  if (task.session === "exited") {
    return Icon.Stop;
  }
  if (task.lifecycle === "interrupted") {
    return Icon.Pause;
  }
  if (task.lifecycle === "resumed") {
    return Icon.ArrowClockwise;
  }
  return task.lifecycle === "running" ? Icon.Play : Icon.CircleProgress;
}

function localTaskSubtitle(task: GroundcrewStatusTask): string {
  const worktree = task.worktrees[0];
  const repository = task.source?.repository ?? worktree?.repository ?? "Repository unavailable";
  const branch = worktree?.branch;
  return branch === undefined ? `${task.task} · ${repository}` : `${task.task} · ${repository} · ${branch}`;
}

function localTaskId(task: GroundcrewStatusTask): string {
  return task.source?.id ?? task.task;
}

function LocalTaskRow({
  canonicalTasks,
  cleanupAllAction,
  inventory,
  lifecycleController,
  onRefresh,
  task,
}: {
  canonicalTasks: readonly GroundcrewTask[];
  cleanupAllAction?: ReactNode;
  inventory: GroundcrewStatusInventory;
  lifecycleController: LifecycleActionController;
  onRefresh: () => Promise<void>;
  task: GroundcrewStatusTask;
}) {
  const state = localTaskState(task);
  const selection: StatusTaskSelection = { kind: "local", task };
  return (
    <List.Item
      id={`local:${localTaskId(task)}`}
      title={task.title ?? task.source?.title ?? task.task}
      subtitle={localTaskSubtitle(task)}
      icon={{ source: localTaskIcon(task), tintColor: localTaskColor(task) }}
      keywords={[
        task.task,
        task.agent,
        task.source?.repository,
        task.source?.status,
        ...task.worktrees.flatMap((worktree) => [worktree.repository, worktree.branch]),
      ].filter((value): value is string => value !== undefined)}
      accessories={[
        { text: task.agent ?? task.source?.agent ?? "Agent unavailable", icon: Icon.Person },
        { tag: { value: state, color: localTaskColor(task) } },
      ]}
      actions={
        <TaskRowActions
          inventory={inventory}
          selection={selection}
          onRefresh={onRefresh}
          canonicalTasks={canonicalTasks}
          lifecycleController={lifecycleController}
          cleanupAllAction={cleanupAllAction}
        />
      }
    />
  );
}

function MissingWorkspaceRow({
  canonicalTasks,
  cleanupAllAction,
  inventory,
  issue,
  lifecycleController,
  onRefresh,
}: {
  canonicalTasks: readonly GroundcrewTask[];
  cleanupAllAction?: ReactNode;
  inventory: GroundcrewStatusInventory;
  issue: GroundcrewStatusBoardIssue;
  lifecycleController: LifecycleActionController;
  onRefresh: () => Promise<void>;
}) {
  const selection: StatusTaskSelection = { kind: "missing", task: issue };
  return (
    <List.Item
      id={`remote-missing:${issue.id}`}
      title={issue.title}
      subtitle={`${issue.naturalId} · ${issue.repository ?? "Repository unavailable"}`}
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      keywords={[issue.naturalId, issue.repository, issue.agent, "missing workspace"].filter(
        (value): value is string => value !== undefined,
      )}
      accessories={[
        { text: issue.agent ?? "Agent unavailable", icon: Icon.Person },
        { tag: { value: "Missing Workspace", color: Color.Red } },
      ]}
      actions={
        <TaskRowActions
          inventory={inventory}
          selection={selection}
          onRefresh={onRefresh}
          canonicalTasks={canonicalTasks}
          lifecycleController={lifecycleController}
          cleanupAllAction={cleanupAllAction}
        />
      }
    />
  );
}

function QueueReadyRow({
  canonicalTasks,
  inventory,
  issue,
  lifecycleController,
  onRefresh,
}: {
  canonicalTasks: readonly GroundcrewTask[];
  inventory: GroundcrewStatusInventory;
  issue: GroundcrewStatusQueueIssue;
  lifecycleController: LifecycleActionController;
  onRefresh: () => Promise<void>;
}) {
  const selection: StatusTaskSelection = { kind: "ready", task: issue };
  return (
    <List.Item
      id={`queue-ready:${issue.id}`}
      title={issue.title}
      subtitle={`${issue.naturalId} · ${issue.repository}`}
      icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
      keywords={[issue.naturalId, issue.repository, issue.agent, "ready", "eligible"]}
      accessories={[{ text: issue.agent, icon: Icon.Person }, { tag: { value: "Ready", color: Color.Blue } }]}
      actions={
        <TaskRowActions
          inventory={inventory}
          selection={selection}
          onRefresh={onRefresh}
          canonicalTasks={canonicalTasks}
          lifecycleController={lifecycleController}
        />
      }
    />
  );
}

function QueueBlockedRow({
  canonicalTasks,
  inventory,
  issue,
  lifecycleController,
  onRefresh,
}: {
  canonicalTasks: readonly GroundcrewTask[];
  inventory: GroundcrewStatusInventory;
  issue: GroundcrewStatusBlockedIssue;
  lifecycleController: LifecycleActionController;
  onRefresh: () => Promise<void>;
}) {
  const selection: StatusTaskSelection = { kind: "blocked", task: issue };
  return (
    <List.Item
      id={`queue-blocked:${issue.id}`}
      title={issue.title}
      subtitle={`${issue.naturalId} · ${issue.repository}`}
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      keywords={[
        issue.naturalId,
        issue.repository,
        issue.agent,
        "blocked",
        ...issue.blockedBy.map((blocker) => blocker.naturalId),
      ]}
      accessories={[
        { text: issue.agent, icon: Icon.Person },
        { tag: { value: `Blocked (${issue.blockedBy.length})`, color: Color.Red } },
      ]}
      actions={
        <TaskRowActions
          inventory={inventory}
          selection={selection}
          onRefresh={onRefresh}
          canonicalTasks={canonicalTasks}
          lifecycleController={lifecycleController}
        />
      }
    />
  );
}

function slotUsageText(inventory: GroundcrewStatusInventory): string {
  return inventory.slots === undefined
    ? `slots unavailable · configured maximum ${inventory.maximumInProgress}`
    : `${inventory.slots.used} of ${inventory.slots.maximum} slots used`;
}

function remoteSnapshotText(inventory: GroundcrewStatusInventory): string {
  const attempt = `remote attempt ${inventory.remote.lastAttemptStatus} at ${inventory.remote.lastAttemptAt}`;
  if (inventory.remote.capturedAt === undefined) {
    return `${attempt} · no remote payload`;
  }
  return inventory.remote.lastAttemptStatus === "unavailable"
    ? `${attempt} · retained payload captured ${inventory.remote.capturedAt}`
    : `${attempt} · payload captured ${inventory.remote.capturedAt}`;
}

function SlotHealthRow({
  inventory,
  onRefresh,
}: {
  inventory: GroundcrewStatusInventory;
  onRefresh: () => Promise<void>;
}) {
  const usage = slotUsageText(inventory);
  return (
    <List.Item
      id="slot-health"
      title="In-progress Slots"
      subtitle={`${usage} · local captured ${inventory.localCapturedAt} · ${remoteSnapshotText(inventory)}`}
      icon={Icon.Gauge}
      accessories={[
        {
          tag: {
            value: inventory.slots === undefined ? "Remote Unavailable" : usage,
            color: inventory.slots === undefined ? Color.Yellow : Color.SecondaryText,
          },
        },
      ]}
      actions={<HealthRowActions onRefresh={onRefresh} />}
    />
  );
}

function RemoteHealthRow({
  inventory,
  onRefresh,
}: {
  inventory: GroundcrewStatusInventory;
  onRefresh: () => Promise<void>;
}) {
  const retainedPayload = inventory.remote.capturedAt !== undefined;
  return (
    <List.Item
      id="remote-health"
      title="Remote Inventory Attempt"
      subtitle={inventory.remote.lastAttemptError ?? "Remote inventory is unavailable."}
      icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
      accessories={[
        {
          tag: {
            value: retainedPayload ? "Retained Payload May Be Stale" : "No Remote Payload",
            color: Color.Yellow,
          },
        },
      ]}
      actions={<HealthRowActions onRefresh={onRefresh} />}
    />
  );
}

function WorkspaceProbeRow({
  inventory,
  onRefresh,
}: {
  inventory: GroundcrewStatusInventory;
  onRefresh: () => Promise<void>;
}) {
  return (
    <List.Item
      id="workspace-probe"
      title="Workspace Probe"
      subtitle={inventory.workspaceProbe.error ?? "Workspace paths could not be inspected."}
      icon={{ source: Icon.HardDrive, tintColor: Color.Yellow }}
      accessories={[{ tag: { value: "Unavailable", color: Color.Yellow } }]}
      actions={<HealthRowActions onRefresh={onRefresh} />}
    />
  );
}

function OrphanedSessionsRow({ onRefresh, sessions }: { onRefresh: () => Promise<void>; sessions: string[] }) {
  return (
    <List.Item
      id="orphaned-sessions"
      title="Orphaned Sessions"
      subtitle={sessions.join(", ")}
      icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
      accessories={[{ tag: { value: String(sessions.length), color: Color.Yellow } }]}
      actions={<HealthRowActions onRefresh={onRefresh} />}
    />
  );
}

type StatusTaskSelection = LifecycleTaskSelection;

function findStatusTask({
  inventory,
  naturalTaskId,
}: {
  inventory: GroundcrewStatusInventory;
  naturalTaskId: string;
}): StatusTaskSelection | undefined {
  return findLifecycleTask(inventory, naturalTaskId);
}

function canonicalStatusTitle(status: string): string {
  return status
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function selectionNaturalTaskId(selection: StatusTaskSelection): string {
  return selection.kind === "local" ? selection.task.task : selection.task.naturalId;
}

function selectionTaskId(selection: StatusTaskSelection): string {
  return selection.kind === "local" ? localTaskId(selection.task) : selection.task.id;
}

function selectionTitle(selection: StatusTaskSelection): string {
  return selection.kind === "local"
    ? (selection.task.title ?? selection.task.source?.title ?? selection.task.task)
    : selection.task.title;
}

function firstNonBlank(values: readonly (string | undefined)[]): string | undefined {
  return values.map((value) => value?.trim()).find((value) => value !== undefined && value.length > 0);
}

function selectionUrl(selection: StatusTaskSelection): string | undefined {
  return selection.kind === "local"
    ? firstNonBlank([selection.task.url, selection.task.source?.url])
    : firstNonBlank([selection.task.url]);
}

function selectionAgent(selection: StatusTaskSelection): string {
  const value =
    selection.kind === "local" ? (selection.task.agent ?? selection.task.source?.agent) : selection.task.agent;
  return value ?? "Not supplied by legacy status";
}

function selectionRepository(selection: StatusTaskSelection): string {
  if (selection.kind !== "local") {
    return selection.task.repository ?? "Not supplied by legacy status";
  }
  return (
    selection.task.source?.repository ?? selection.task.worktrees[0]?.repository ?? "Not supplied by legacy status"
  );
}

function selectionLifecycle(selection: StatusTaskSelection): string {
  switch (selection.kind) {
    case "local":
      return localTaskState(selection.task);
    case "missing":
      return "In Progress (Workspace Missing)";
    case "ready":
      return "Queued";
    case "blocked":
      return "Queued / Blocked";
  }
}

function selectionSourceStatus(selection: StatusTaskSelection): string {
  if (selection.kind === "local") {
    return selection.task.source === undefined
      ? "Not supplied by legacy status"
      : canonicalStatusTitle(selection.task.source.status);
  }
  if (selection.kind === "missing") {
    return "In Progress";
  }
  return "Not supplied by legacy status";
}

function selectionEligibility(selection: StatusTaskSelection): string {
  switch (selection.kind) {
    case "local":
      return selection.task.worktrees.length === 0
        ? "Workspace unavailable"
        : isActiveTask(selection.task)
          ? "Active local workspace"
          : "Preserved local workspace";
    case "missing":
      return "In progress; workspace unavailable";
    case "ready":
      return "Eligible / ready";
    case "blocked":
      return `Blocked by ${selection.task.blockedBy.map((blocker) => blocker.naturalId).join(", ")}`;
  }
}

function worktreeDirtiness(worktree: GroundcrewStatusWorktree): string {
  switch (worktree.git.kind) {
    case "clean":
      return "Clean";
    case "unknown":
      return "Unknown";
    case "dirty":
      return `Dirty · ${worktree.git.modified} modified · ${worktree.git.untracked} untracked`;
  }
}

function selectionDirtiness(selection: StatusTaskSelection): string {
  if (selection.kind !== "local" || selection.task.worktrees.length === 0) {
    return "Unavailable without a local worktree";
  }
  if (selection.task.worktrees.length === 1) {
    const worktree = selection.task.worktrees[0];
    return worktree === undefined ? "Unavailable without a local worktree" : worktreeDirtiness(worktree);
  }
  return selection.task.worktrees
    .map((worktree) => `${worktree.repository}: ${worktreeDirtiness(worktree)}`)
    .join("; ");
}

function selectionPullRequests(selection: StatusTaskSelection) {
  return selection.kind === "local" ? selection.task.worktrees.flatMap((worktree) => worktree.pullRequests) : [];
}

function ambiguousPullRequestWorktrees(selection: StatusTaskSelection): GroundcrewStatusWorktree[] {
  return selection.kind === "local"
    ? selection.task.worktrees.filter((worktree) => worktree.pullRequests.length === 0)
    : [];
}

function ambiguousPullRequestSummary(worktree: GroundcrewStatusWorktree): string {
  return `${worktree.repository} (${worktree.branch}): No PR returned; legacy GitHub lookup may have failed`;
}

function pullRequestSummary(selection: StatusTaskSelection): string {
  const pullRequests = selectionPullRequests(selection);
  const ambiguousWorktrees = ambiguousPullRequestWorktrees(selection);
  const summaries = [
    ...pullRequests.map((pullRequest) => `#${pullRequest.number} · ${pullRequest.state} · ${pullRequest.title}`),
    ...ambiguousWorktrees.map(ambiguousPullRequestSummary),
  ];
  if (summaries.length > 0) {
    return summaries.join("; ");
  }
  return "Unavailable without a local worktree";
}

function selectionMarkdown(selection: StatusTaskSelection): string {
  if (selection.kind !== "local") {
    const explanation =
      selection.kind === "missing"
        ? "Groundcrew reports this task in progress, but no local workspace is available."
        : selection.kind === "ready"
          ? "Groundcrew reports this task as eligible for an available slot."
          : `Groundcrew reports this task blocked by ${selection.task.blockedBy
              .map((blocker) => `${blocker.naturalId} (${canonicalStatusTitle(blocker.status)})`)
              .join(", ")}.`;
    return [`# ${selectionTitle(selection)}`, "", explanation].join("\n");
  }

  const task = selection.task;
  const ambiguousWorktrees = ambiguousPullRequestWorktrees(selection);
  const pullRequestNote =
    ambiguousWorktrees.length === 0
      ? []
      : [
          "",
          "## Pull Request Lookup Limits",
          "",
          ...ambiguousWorktrees.map(
            (worktree) =>
              `- ${worktree.repository} (${worktree.branch}): No pull request was returned. The legacy status cannot distinguish no PR from a failed GitHub lookup.`,
          ),
        ];
  const operationalNotes = [
    task.reason === undefined ? undefined : `- **Reason:** ${task.reason}`,
    task.detail === undefined ? undefined : `- **Detail:** ${task.detail}`,
    task.hint === undefined ? undefined : `- **Hint:** ${task.hint}`,
    task.attachCommand === undefined ? undefined : `- **Attach:** \`${task.attachCommand}\``,
    task.flags.length === 0 ? undefined : `- **Flags:** ${task.flags.join(", ")}`,
  ].filter((line): line is string => line !== undefined);
  const recentLogs =
    task.recentLogLines.length === 0 ? [] : ["", "## Recent Output", "", "```text", ...task.recentLogLines, "```"];
  return [
    `# ${selectionTitle(selection)}`,
    ...(operationalNotes.length === 0 ? [] : ["", "## Operational Notes", "", ...operationalNotes]),
    ...pullRequestNote,
    ...recentLogs,
  ].join("\n");
}

function localWorktrees(selection: StatusTaskSelection): readonly GroundcrewStatusWorktree[] {
  const local = selection.kind === "local" ? selection.task : undefined;
  return (local?.worktrees ?? []).filter((worktree) => worktree.dir.trim().length > 0);
}

/** Workspace jump-in and copy actions (cmux, editor, attach, copies) for a local task. */
function StatusWorkspaceActions({ selection }: { selection: StatusTaskSelection }) {
  if (selection.kind !== "local") {
    return null;
  }
  const worktrees = localWorktrees(selection);
  if (worktrees.length === 0) {
    return null;
  }
  return (
    <WorkspaceActions
      worktrees={worktrees}
      taskId={selection.task.task}
      {...(selection.task.attachCommand === undefined ? {} : { attachCommand: selection.task.attachCommand })}
    />
  );
}

function TaskResourceActions({ selection }: { selection: StatusTaskSelection }) {
  const url = selectionUrl(selection);
  const pullRequests = selectionPullRequests(selection).filter((pullRequest) => pullRequest.url.trim().length > 0);
  const worktrees = localWorktrees(selection);
  return (
    <>
      {url === undefined ? null : <Action.OpenInBrowser title="Open Task" url={url} />}
      {pullRequests.map((pullRequest) => (
        <Action.OpenInBrowser
          key={`${pullRequest.number}:${pullRequest.url}`}
          title={`Open Pull Request #${pullRequest.number}`}
          url={pullRequest.url.trim()}
        />
      ))}
      {worktrees.map((worktree) => (
        <Action.Open
          key={worktree.dir}
          title={worktrees.length === 1 ? "Open Worktree in Finder" : `Open ${worktree.repository} Worktree in Finder`}
          icon={Icon.Finder}
          target={worktree.dir.trim()}
          application="Finder"
        />
      ))}
    </>
  );
}

function RefreshStatusAction({ onRefresh }: { onRefresh: () => Promise<void> }) {
  return (
    <Action
      title="Refresh Status"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}

function HealthRowActions({ onRefresh }: { onRefresh: () => Promise<void> }) {
  return (
    <ActionPanel>
      <RefreshStatusAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}

function TaskRowActions({
  canonicalTasks,
  cleanupAllAction,
  inventory,
  lifecycleController,
  onRefresh,
  selection,
}: {
  canonicalTasks: readonly GroundcrewTask[];
  cleanupAllAction?: ReactNode;
  inventory: GroundcrewStatusInventory;
  lifecycleController: LifecycleActionController;
  onRefresh: () => Promise<void>;
  selection: StatusTaskSelection;
}) {
  // Primary (Enter) action is state-aware: live tasks open the running cmux workspace;
  // preserved (idle/interrupted/exited) tasks lead with Resume via LifecycleActions.
  const isLive = selection.kind === "local" && selection.task.session === "live";
  const workspaceActions = <StatusWorkspaceActions selection={selection} />;
  return (
    <ActionPanel>
      {isLive ? workspaceActions : null}
      <LifecycleActions
        controller={lifecycleController}
        taskId={selectionTaskId(selection)}
        task={findCanonicalTask(canonicalTasks, selectionTaskId(selection))}
        status={selection}
      />
      {isLive ? null : workspaceActions}
      <Action.Push
        title="Show Task Details"
        icon={Icon.Sidebar}
        target={<StatusTaskDetail inventory={inventory} naturalTaskId={selectionTaskId(selection)} />}
      />
      {cleanupAllAction}
      <TaskResourceActions selection={selection} />
      <RefreshStatusAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}

export function StatusTaskDetail({
  inventory,
  naturalTaskId,
}: {
  inventory: GroundcrewStatusInventory;
  naturalTaskId: string;
}) {
  const selection = findStatusTask({ inventory, naturalTaskId });
  if (selection === undefined) {
    return (
      <Detail
        navigationTitle={naturalTaskId}
        markdown={`# Task Unavailable\n\n${naturalTaskId} is not present in the loaded Groundcrew inventory.`}
      />
    );
  }

  const localTask = selection.kind === "local" ? selection.task : undefined;
  const worktrees = localTask?.worktrees ?? [];
  const branches = worktrees.map((worktree) => worktree.branch).join(", ");
  const taskUrl = selectionUrl(selection);
  return (
    <Detail
      navigationTitle={selectionNaturalTaskId(selection)}
      markdown={selectionMarkdown(selection)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Task ID" text={selectionNaturalTaskId(selection)} />
          <Detail.Metadata.Label title="Lifecycle" text={selectionLifecycle(selection)} />
          <Detail.Metadata.Label
            title="Session"
            text={localTask === undefined ? "Not supplied by legacy status" : canonicalStatusTitle(localTask.session)}
          />
          <Detail.Metadata.Label title="Agent" text={selectionAgent(selection)} />
          <Detail.Metadata.Label title="Started" text={localTask?.startedAt ?? "Not supplied by legacy status"} />
          <Detail.Metadata.Label title="Updated" text={localTask?.updatedAt ?? "Not supplied by legacy status"} />
          <Detail.Metadata.Label title="Source Status" text={selectionSourceStatus(selection)} />
          <Detail.Metadata.Label title="Repository" text={selectionRepository(selection)} />
          <Detail.Metadata.Label title="Branch" text={branches || "Unavailable"} />
          <Detail.Metadata.Label title="Worktree Dirtiness" text={selectionDirtiness(selection)} />
          <Detail.Metadata.Label title="Blockers / Eligibility" text={selectionEligibility(selection)} />
          <Detail.Metadata.Label
            title="Workspace"
            text={
              worktrees.length === 0
                ? "Unavailable"
                : `Available · ${worktrees.length} ${worktrees.length === 1 ? "worktree" : "worktrees"}`
            }
          />
          <Detail.Metadata.Label title="Pull Requests" text={pullRequestSummary(selection)} />
          {taskUrl === undefined ? null : <Detail.Metadata.Link title="Task URL" target={taskUrl} text={taskUrl} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <StatusWorkspaceActions selection={selection} />
          <TaskResourceActions selection={selection} />
        </ActionPanel>
      }
    />
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Groundcrew failed without an error message.";
}

function errorPresentation(error: unknown): StatusErrorPresentation {
  const description = errorMessage(error);
  if (error instanceof GroundcrewClientError) {
    if (
      error.code === "INVALID_EXECUTABLE_PREFERENCE" ||
      error.code === "EXECUTABLE_NOT_FOUND" ||
      error.code === "EXECUTABLE_NOT_EXECUTABLE"
    ) {
      return { description, showPreferences: true, title: "Groundcrew Setup Required" };
    }
    if (
      error.code === "INCOMPATIBLE_VERSION" ||
      error.code === "MALFORMED_VERSION" ||
      error.code === "MALFORMED_JSON" ||
      error.code === "INVALID_JSON_SHAPE" ||
      error.code === "STATUS_SCHEMA_MISMATCH"
    ) {
      return { description, showPreferences: false, title: "Groundcrew CLI Is Incompatible" };
    }
  }
  return { description, showPreferences: false, title: "Couldn’t Load Groundcrew Status" };
}

function StatusActions({ onRefresh, showPreferences }: { onRefresh: () => Promise<void>; showPreferences: boolean }) {
  return (
    <ActionPanel>
      <RefreshStatusAction onRefresh={onRefresh} />
      {showPreferences ? (
        <>
          <Action.Push title="Run Doctor" icon={Icon.Stethoscope} target={<GroundcrewDoctor />} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Install Groundcrew CLI" icon={Icon.Download} url={GROUNDCREW_INSTALL_URL} />
        </>
      ) : null}
    </ActionPanel>
  );
}

export function StatusDashboard({ cleanupAllTasks, loadStatus, loadTasks, mutations }: StatusDashboardProps) {
  const {
    error,
    isLoading,
    reload,
    value: inventory,
  } = useAsyncValue(loadStatus, {
    cacheKey: "groundcrew.status",
    revalidateIntervalMs: 8000,
  });
  const { reload: reloadTasks, value: canonicalTasks } = useAsyncValue(loadTasks, {
    cacheKey: "groundcrew.tasks",
  });
  const reconcile = useCallback(
    async (taskId: string) => {
      const [statusResult, taskResult] = await Promise.all([reload(), reloadTasks()]);
      return {
        statusRefreshed: statusResult.kind === "success",
        ...(statusResult.kind === "success" ? { status: findLifecycleTask(statusResult.value, taskId) } : {}),
        taskRefreshed: taskResult.kind === "success",
        ...(taskResult.kind === "success" ? { task: findCanonicalTask(taskResult.value, taskId) } : {}),
      };
    },
    [reload, reloadTasks],
  );
  const lifecycleController = useLifecycleActionController({ mutations, reconcile });
  const refresh = useCallback(async () => {
    const result = await reload();
    if (result.kind === "failure") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn’t Refresh Groundcrew Status",
        message: errorMessage(result.error),
      });
    }
  }, [reload]);
  const presentation = error === undefined ? undefined : errorPresentation(error);
  const activeTasks = inventory?.tasks.filter(isActiveTask) ?? [];
  const preservedTasks = inventory?.tasks.filter((task) => task.worktrees.length > 0 && !isActiveTask(task)) ?? [];
  const missingLocalTasks = inventory?.tasks.filter((task) => task.worktrees.length === 0) ?? [];
  const cleanupAllAction =
    cleanupAllTasks !== undefined && preservedTasks.length > 0 ? (
      <CleanupAllWorkspacesAction cleanupAllTasks={cleanupAllTasks} count={preservedTasks.length} onRefresh={refresh} />
    ) : undefined;
  const degraded =
    inventory !== undefined &&
    (inventory.remote.lastAttemptStatus === "unavailable" ||
      inventory.workspaceProbe.status === "unavailable" ||
      inventory.orphanedSessions.length > 0);
  const hasTrackedWork =
    inventory !== undefined &&
    (inventory.tasks.length > 0 ||
      inventory.inProgressWithoutWorktree.length > 0 ||
      inventory.queueReady.length > 0 ||
      inventory.queueBlocked.length > 0);
  const showHealthyEmpty = inventory !== undefined && !hasTrackedWork && !degraded;

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search tasks, repositories, branches, or agents"
      actions={<StatusActions onRefresh={refresh} showPreferences={presentation?.showPreferences ?? false} />}
    >
      {inventory === undefined || showHealthyEmpty ? (
        <List.EmptyView
          title={inventory === undefined ? (presentation?.title ?? "Loading Groundcrew Status") : "No Groundcrew Work"}
          description={
            inventory === undefined
              ? (presentation?.description ?? "Loading local workspaces and the latest remote Groundcrew inventory.")
              : `${slotUsageText(inventory)}. Local captured ${inventory.localCapturedAt}; ${remoteSnapshotText(inventory)}.`
          }
          actions={<StatusActions onRefresh={refresh} showPreferences={presentation?.showPreferences ?? false} />}
        />
      ) : null}
      {inventory !== undefined && activeTasks.length > 0 ? (
        <List.Section title="Active Workspaces" subtitle={`${activeTasks.length}`}>
          {activeTasks.map((task) => (
            <LocalTaskRow
              key={localTaskId(task)}
              task={task}
              inventory={inventory}
              onRefresh={refresh}
              canonicalTasks={canonicalTasks ?? []}
              lifecycleController={lifecycleController}
            />
          ))}
        </List.Section>
      ) : null}
      {inventory !== undefined && preservedTasks.length > 0 ? (
        <List.Section title="Preserved Workspaces" subtitle={`${preservedTasks.length}`}>
          {preservedTasks.map((task) => (
            <LocalTaskRow
              key={localTaskId(task)}
              task={task}
              inventory={inventory}
              onRefresh={refresh}
              canonicalTasks={canonicalTasks ?? []}
              lifecycleController={lifecycleController}
              cleanupAllAction={cleanupAllAction}
            />
          ))}
        </List.Section>
      ) : null}
      {inventory !== undefined && (missingLocalTasks.length > 0 || inventory.inProgressWithoutWorktree.length > 0) ? (
        <List.Section
          title="Missing Workspaces"
          subtitle={`${missingLocalTasks.length + inventory.inProgressWithoutWorktree.length}`}
        >
          {missingLocalTasks.map((task) => (
            <LocalTaskRow
              key={localTaskId(task)}
              task={task}
              inventory={inventory}
              onRefresh={refresh}
              canonicalTasks={canonicalTasks ?? []}
              lifecycleController={lifecycleController}
              cleanupAllAction={cleanupAllAction}
            />
          ))}
          {inventory.inProgressWithoutWorktree.map((issue) => (
            <MissingWorkspaceRow
              key={issue.id}
              issue={issue}
              inventory={inventory}
              onRefresh={refresh}
              canonicalTasks={canonicalTasks ?? []}
              lifecycleController={lifecycleController}
              cleanupAllAction={cleanupAllAction}
            />
          ))}
        </List.Section>
      ) : null}
      {inventory !== undefined && !showHealthyEmpty ? (
        <List.Section
          title="Queue & Slot Health"
          subtitle={`${inventory.queueReady.length} ready · ${inventory.queueBlocked.length} blocked`}
        >
          <SlotHealthRow inventory={inventory} onRefresh={refresh} />
          {inventory.queueReady.map((issue) => (
            <QueueReadyRow
              key={issue.id}
              issue={issue}
              inventory={inventory}
              onRefresh={refresh}
              canonicalTasks={canonicalTasks ?? []}
              lifecycleController={lifecycleController}
            />
          ))}
          {inventory.queueBlocked.map((issue) => (
            <QueueBlockedRow
              key={issue.id}
              issue={issue}
              inventory={inventory}
              onRefresh={refresh}
              canonicalTasks={canonicalTasks ?? []}
              lifecycleController={lifecycleController}
            />
          ))}
        </List.Section>
      ) : null}
      {inventory !== undefined && degraded ? (
        <List.Section title="Degraded Probes">
          {inventory.remote.lastAttemptStatus === "unavailable" ? (
            <RemoteHealthRow inventory={inventory} onRefresh={refresh} />
          ) : null}
          {inventory.workspaceProbe.status === "unavailable" ? (
            <WorkspaceProbeRow inventory={inventory} onRefresh={refresh} />
          ) : null}
          {inventory.orphanedSessions.length > 0 ? (
            <OrphanedSessionsRow sessions={inventory.orphanedSessions} onRefresh={refresh} />
          ) : null}
        </List.Section>
      ) : null}
    </List>
  );
}
