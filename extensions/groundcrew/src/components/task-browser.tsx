import {
  Action,
  ActionPanel,
  Cache,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { GroundcrewClientError } from "../cli";
import type {
  GroundcrewCanonicalStatus,
  GroundcrewStatusInventory,
  GroundcrewTask,
  GroundcrewTaskBlocker,
} from "../types/groundcrew";
import { GroundcrewDoctor } from "./doctor";
import {
  findCanonicalTask,
  findLifecycleTask,
  LifecycleActions,
  type LifecycleActionController,
  type LifecycleMutations,
  useLifecycleActionController,
} from "./lifecycle-actions";

const GROUNDCREW_INSTALL_URL = "https://www.npmjs.com/package/@clipboard-health/groundcrew";

type TaskFilter = "all" | "ready" | "blocked" | GroundcrewCanonicalStatus;
type TaskGroup = "ready" | "in-progress" | "in-review" | "blocked" | "done" | "other";

interface TaskBrowserProps {
  loadTask: (taskId: string) => Promise<GroundcrewTask>;
  loadTasks: () => Promise<GroundcrewTask[]>;
  loadStatus: () => Promise<GroundcrewStatusInventory>;
  mutations: LifecycleMutations;
}

interface TaskDetailProps {
  loadTask: (taskId: string) => Promise<GroundcrewTask>;
  task: GroundcrewTask;
}

interface AsyncState<T> {
  error?: unknown;
  isLoading: boolean;
  value?: T;
}

type ReloadResult<T> = { kind: "success"; value: T } | { kind: "failure"; error: unknown } | { kind: "stale" };

interface ErrorPresentation {
  description: string;
  showPreferences: boolean;
  title: string;
}

const STATUS_PRESENTATION: Record<GroundcrewCanonicalStatus, { color: Color; icon: Icon; title: string }> = {
  todo: { color: Color.SecondaryText, icon: Icon.Circle, title: "Todo" },
  "in-progress": { color: Color.Blue, icon: Icon.CircleProgress, title: "In Progress" },
  "in-review": { color: Color.Purple, icon: Icon.Eye, title: "In Review" },
  done: { color: Color.Green, icon: Icon.CheckCircle, title: "Done" },
  other: { color: Color.SecondaryText, icon: Icon.Ellipsis, title: "Other" },
};

const GROUPS: readonly {
  key: TaskGroup;
  title: string;
}[] = [
  { key: "ready", title: "Ready Todo" },
  { key: "in-progress", title: "Active" },
  { key: "in-review", title: "In Review" },
  { key: "blocked", title: "Blocked" },
  { key: "done", title: "Completed" },
  { key: "other", title: "Other" },
];

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

interface UseAsyncValueOptions<T> {
  cacheKey?: string;
  initialValue?: T;
}

/** Loads a value, with optional stale-while-revalidate caching for instant first paint. */
function useAsyncValue<T>(loader: () => Promise<T>, options: UseAsyncValueOptions<T> = {}) {
  const { cacheKey, initialValue } = options;
  const seed = (cacheKey === undefined ? undefined : readCache<T>(cacheKey)) ?? initialValue;
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
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [reload]);

  return { ...state, reload };
}

function isBlocked(task: GroundcrewTask): boolean {
  return task.blockers.length > 0 || task.hasMoreBlockers;
}

function taskGroup(task: GroundcrewTask): TaskGroup {
  if (isBlocked(task)) {
    return "blocked";
  }
  return task.status === "todo" ? "ready" : task.status;
}

function compareTasks(left: GroundcrewTask, right: GroundcrewTask): number {
  const leftPriority = left.priority ?? Number.POSITIVE_INFINITY;
  const rightPriority = right.priority ?? Number.POSITIVE_INFINITY;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  const leftUpdatedAt = Date.parse(left.updatedAt);
  const rightUpdatedAt = Date.parse(right.updatedAt);
  if (Number.isFinite(leftUpdatedAt) && Number.isFinite(rightUpdatedAt)) {
    const updatedAtDifference = rightUpdatedAt - leftUpdatedAt;
    if (updatedAtDifference !== 0) {
      return updatedAtDifference;
    }
  }
  return left.id.localeCompare(right.id);
}

function matchesFilter(task: GroundcrewTask, filter: TaskFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "ready":
      return task.status === "todo" && !isBlocked(task);
    case "blocked":
      return isBlocked(task);
    default:
      return task.status === filter;
  }
}

function groupedTasks(tasks: readonly GroundcrewTask[], filter: TaskFilter) {
  const matchingTasks = tasks.filter((task) => matchesFilter(task, filter));
  return GROUPS.map((group) => ({
    ...group,
    tasks: matchingTasks.filter((task) => taskGroup(task) === group.key).sort(compareTasks),
  })).filter((group) => group.tasks.length > 0);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Groundcrew failed without an error message.";
}

function errorPresentation(error: unknown, subject: "list" | "detail"): ErrorPresentation {
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
      error.code === "INVALID_JSON_SHAPE"
    ) {
      return { description, showPreferences: false, title: "Groundcrew CLI Is Incompatible" };
    }
  }
  return {
    description,
    showPreferences: false,
    title: subject === "list" ? "Couldn’t Load Groundcrew Tasks" : "Couldn’t Load Task",
  };
}

async function showRefreshFailure(title: string, error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: errorMessage(error),
  });
}

function RefreshAction({ onRefresh, title }: { onRefresh: () => Promise<void>; title: string }) {
  return (
    <Action title={title} icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={onRefresh} />
  );
}

function EmptyStateActions({
  onRefresh,
  showPreferences,
}: {
  onRefresh: () => Promise<void>;
  showPreferences: boolean;
}) {
  return (
    <ActionPanel>
      <RefreshAction title="Refresh Tasks" onRefresh={onRefresh} />
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

function blockerTooltip(task: GroundcrewTask): string {
  const visible = task.blockers.map((blocker) => blocker.title).join(", ");
  if (visible.length === 0) {
    return "Groundcrew reports additional blockers.";
  }
  return task.hasMoreBlockers ? `${visible}, and additional blockers` : visible;
}

function taskUrl(task: GroundcrewTask): string | undefined {
  const url = task.url?.trim();
  return url === "" ? undefined : url;
}

function taskKeywords(task: GroundcrewTask): string[] {
  return [
    task.id,
    task.source,
    task.repository,
    task.agent,
    task.assignee,
    task.status,
    STATUS_PRESENTATION[task.status].title,
    isBlocked(task) ? "blocked" : "unblocked",
  ].filter((value): value is string => value !== undefined && value.length > 0);
}

function TaskRow({
  controller,
  loadTask,
  onRefresh,
  status: lifecycleStatus,
  task,
}: {
  controller: LifecycleActionController;
  loadTask: (taskId: string) => Promise<GroundcrewTask>;
  onRefresh: () => Promise<void>;
  status: ReturnType<typeof findLifecycleTask>;
  task: GroundcrewTask;
}) {
  const status = STATUS_PRESENTATION[task.status];
  const blocked = isBlocked(task);
  const url = taskUrl(task);
  return (
    <List.Item
      id={task.id}
      title={task.title}
      subtitle={`${task.id} · ${task.repository ?? "No repository"}`}
      icon={{
        source: blocked ? Icon.ExclamationMark : status.icon,
        tintColor: blocked ? Color.Red : status.color,
      }}
      keywords={taskKeywords(task)}
      accessories={[
        ...(blocked
          ? [
              {
                text: { value: "Blocked", color: Color.Red },
                icon: Icon.ExclamationMark,
                tooltip: blockerTooltip(task),
              } as List.Item.Accessory,
            ]
          : []),
        {
          text: task.agent ?? "No agent",
          icon: Icon.Person,
          tooltip: task.agent === undefined ? "No agent supplied by Groundcrew" : `Agent: ${task.agent}`,
        },
        { tag: { value: status.title, color: status.color } },
      ]}
      actions={
        <ActionPanel>
          <LifecycleActions controller={controller} taskId={task.id} task={task} status={lifecycleStatus} />
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<TaskDetail task={task} loadTask={loadTask} />}
          />
          {url === undefined ? null : <Action.OpenInBrowser title="Open Task" url={url} />}
          <RefreshAction title="Refresh Tasks" onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function StatusFilter({ value, onChange }: { value: TaskFilter; onChange: (value: TaskFilter) => void }) {
  return (
    <List.Dropdown tooltip="Filter by Status" value={value} onChange={(next) => onChange(next as TaskFilter)}>
      <List.Dropdown.Item title="All Tasks" value="all" />
      <List.Dropdown.Item title="Ready Todo" value="ready" />
      <List.Dropdown.Item title="Todo" value="todo" />
      <List.Dropdown.Item title="In Progress" value="in-progress" />
      <List.Dropdown.Item title="In Review" value="in-review" />
      <List.Dropdown.Item title="Blocked" value="blocked" />
      <List.Dropdown.Item title="Done" value="done" />
      <List.Dropdown.Item title="Other" value="other" />
    </List.Dropdown>
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, "\\$&");
}

function blockerDescription(blocker: GroundcrewTaskBlocker): string {
  const status = STATUS_PRESENTATION[blocker.status].title;
  const nativeStatus = blocker.nativeStatus === undefined ? "" : `; ${blocker.nativeStatus}`;
  const reason = blocker.statusReason === undefined ? "" : `; ${blocker.statusReason}`;
  return `- **${escapeMarkdown(blocker.id)}** — ${escapeMarkdown(blocker.title)} (${escapeMarkdown(`${status}${nativeStatus}${reason}`)})`;
}

function taskMarkdown(task: GroundcrewTask): string {
  const description = task.description.trim() || "_No description supplied by Groundcrew._";
  const visibleBlockers = task.blockers.map(blockerDescription);
  const moreBlockers = task.hasMoreBlockers
    ? ["", "_Groundcrew reports additional blockers that are not included in this response._"]
    : [];
  const blockerLines =
    visibleBlockers.length === 0 && !task.hasMoreBlockers
      ? ["No blockers supplied by Groundcrew."]
      : [...visibleBlockers, ...moreBlockers];

  return [
    `# ${escapeMarkdown(task.title)}`,
    "",
    "## Description",
    "",
    description,
    "",
    "## Blockers",
    "",
    ...blockerLines,
  ].join("\n");
}

export function TaskDetail({ task: summary, loadTask }: TaskDetailProps) {
  const loader = useCallback(() => loadTask(summary.id), [loadTask, summary.id]);
  const { error, isLoading, reload, value: task = summary } = useAsyncValue(loader, { initialValue: summary });
  const presentation = error === undefined ? undefined : errorPresentation(error, "detail");
  const url = taskUrl(task);
  const refresh = useCallback(async () => {
    const result = await reload();
    if (result.kind === "failure") {
      await showRefreshFailure("Couldn’t Refresh Task", result.error);
    }
  }, [reload]);
  const markdown =
    presentation === undefined
      ? taskMarkdown(task)
      : [
          `# ${escapeMarkdown(task.title)}`,
          "",
          `## ${presentation.title}`,
          "",
          escapeMarkdown(presentation.description),
        ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={task.id}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Task ID" text={task.id} />
          <Detail.Metadata.Label
            title="Status"
            text={{
              value: STATUS_PRESENTATION[task.status].title,
              color: STATUS_PRESENTATION[task.status].color,
            }}
          />
          <Detail.Metadata.Label title="Source" text={task.source} />
          <Detail.Metadata.Label title="Repository" text={task.repository ?? "Not provided"} />
          <Detail.Metadata.Label title="Agent" text={task.agent ?? "Not provided"} />
          <Detail.Metadata.Label
            title="Blockers"
            text={isBlocked(task) ? `${task.blockers.length}${task.hasMoreBlockers ? "+" : ""}` : "None"}
          />
          {task.priority === undefined ? null : <Detail.Metadata.Label title="Priority" text={String(task.priority)} />}
          {url === undefined ? null : <Detail.Metadata.Link title="Task URL" target={url} text={url} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {url === undefined ? null : <Action.OpenInBrowser title="Open Task" url={url} />}
          <RefreshAction title="Refresh Task" onRefresh={refresh} />
          {presentation?.showPreferences ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export function TaskBrowser({ loadTasks, loadTask, loadStatus, mutations }: TaskBrowserProps) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const {
    error,
    isLoading,
    reload,
    value: tasks,
  } = useAsyncValue(loadTasks, {
    cacheKey: "groundcrew.browse.tasks",
  });
  const { reload: reloadStatus, value: status } = useAsyncValue(loadStatus, {
    cacheKey: "groundcrew.browse.status",
  });
  const reconcile = useCallback(
    async (taskId: string) => {
      const [taskResult, statusResult] = await Promise.all([reload(), reloadStatus()]);
      return {
        taskRefreshed: taskResult.kind === "success",
        ...(taskResult.kind === "success" ? { task: findCanonicalTask(taskResult.value, taskId) } : {}),
        statusRefreshed: statusResult.kind === "success",
        ...(statusResult.kind === "success"
          ? {
              status: findLifecycleTask(
                statusResult.value,
                taskId,
                taskResult.kind === "success" ? taskResult.value : undefined,
              ),
            }
          : {}),
      };
    },
    [reload, reloadStatus],
  );
  const lifecycleController = useLifecycleActionController({ mutations, reconcile });
  const groups = groupedTasks(tasks ?? [], filter);
  const blockingError = error !== undefined && (tasks === undefined || tasks.length === 0);
  const presentation = blockingError ? errorPresentation(error, "list") : undefined;
  const refresh = useCallback(async () => {
    const result = await reload();
    if (result.kind === "failure") {
      await showRefreshFailure("Couldn’t Refresh Tasks", result.error);
    }
  }, [reload]);
  const emptyTitle =
    presentation?.title ??
    (isLoading && tasks === undefined
      ? "Loading Groundcrew Tasks"
      : tasks?.length === 0
        ? "No Groundcrew Tasks"
        : "No Tasks Match This Filter");
  const emptyDescription =
    presentation?.description ??
    (isLoading && tasks === undefined
      ? "Loading tasks from your configured Groundcrew sources."
      : tasks?.length === 0
        ? "Groundcrew did not return any tasks. Refresh after tasks are configured."
        : "Choose another canonical status or change your search.");

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search tasks, IDs, repositories, agents, or sources"
      searchBarAccessory={<StatusFilter value={filter} onChange={setFilter} />}
      actions={<EmptyStateActions onRefresh={refresh} showPreferences={presentation?.showPreferences ?? false} />}
    >
      {groups.map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={`${group.tasks.length}`}>
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              loadTask={loadTask}
              onRefresh={refresh}
              controller={lifecycleController}
              status={status === undefined ? undefined : findLifecycleTask(status, task.id, tasks)}
            />
          ))}
        </List.Section>
      ))}
      {groups.length === 0 ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          actions={<EmptyStateActions onRefresh={refresh} showPreferences={presentation?.showPreferences ?? false} />}
        />
      ) : null}
    </List>
  );
}
