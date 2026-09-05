import { Action, ActionPanel, Icon, List, useNavigation, type Keyboard } from "@raycast/api";
import { useEffect, useRef, type ReactElement, type ReactNode } from "react";

import { presentError, type ErrorPresentation } from "../application/errorPresentation";
import type { TaskMutationService } from "../application/TaskMutationService";
import type { TickTickService } from "../application/TickTickService";
import type { TaskViewQuery } from "../application/viewQuery";
import {
  INBOX_COMMAND,
  NEXT_SEVEN_COMMAND,
  SEARCH_COMMAND,
  TODAY_COMMAND,
  type TaskCommandConfig,
} from "../commands/taskCommandConfigs";
import { ProtocolError } from "../domain/errors";
import type { Task } from "../domain/task";
import { useTaskListFilters } from "../hooks/useTaskListFilters";
import { useTaskMutation, type TaskMutationKind, type TaskMutationState } from "../hooks/useTaskMutation";
import { useTaskQuery, type TaskQueryState } from "../hooks/useTaskQuery";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";
import { raycastTaskFilterStorage } from "../platform/RaycastTaskFilterStorage";
import CombinedTaskFilter from "./CombinedTaskFilter";
import ConnectionActions, { type ConnectionActionHandler } from "./ConnectionActions";
import DomainTaskItem from "./DomainTaskItem";
import { buildDomainTaskItemModel } from "./domainTaskItemModel";
import MoveTaskForm from "./MoveTaskForm";
import StaleDataWarning, { buildEmptyStateHealthDescription } from "./StaleDataWarning";
import { buildTaskListModel, type TaskListItemModel, type TaskListModel } from "./taskListModel";
import { buildStableTaskQuery } from "./taskListQueryModel";
import TaskForm from "./TaskForm";
import { buildEditTaskFormBaseline, planEditTaskSubmission, type EditTaskFormBaseline } from "./taskFormModel";
import type { TaskExactLinkStrategy } from "./taskActions";

export type TaskListRecoveryHandlers = Readonly<{
  onReconnect?: ConnectionActionHandler;
  onOpenPreferences?: ConnectionActionHandler;
  onRefresh?: ConnectionActionHandler;
  onRetry?: ConnectionActionHandler;
}>;

export type TaskListReadyRuntime = Readonly<{
  kind: "ready";
  accountKey: string;
  taskService: TickTickService;
  mutationService: TaskMutationService;
  capabilities: Readonly<BackendCapabilities>;
  uiTimeZone: string;
  exactLinkStrategy: TaskExactLinkStrategy;
  onReconnect?: ConnectionActionHandler;
  onOpenPreferences?: ConnectionActionHandler;
}>;

export type TaskListRuntime =
  | Readonly<{ kind: "loading" }>
  | Readonly<{
      kind: "error";
      presentation: ErrorPresentation;
      recovery?: TaskListRecoveryHandlers;
    }>
  | TaskListReadyRuntime;

export type TaskListViewProps = Readonly<{
  config: TaskCommandConfig;
  runtime: TaskListRuntime;
}>;

type ReadyTaskListViewProps = Readonly<{
  config: TaskCommandConfig;
  runtime: TaskListReadyRuntime;
  remoteQuery: Readonly<TaskViewQuery>;
}>;

type TaskActionCallbacks = Readonly<{
  complete(task: Task, statusCycle: TaskStatusCycle): Promise<void>;
  reopen(task: Task, statusCycle: TaskStatusCycle): Promise<void>;
  refresh(): Promise<void>;
  edit(task: Task, baseline: EditTaskFormBaseline, statusCycle: TaskStatusCycle): void;
  move(task: Task, statusCycle: TaskStatusCycle): void;
  statusCycle(task: Task): TaskStatusCycle | undefined;
}>;

type StatusMutationKind = "complete" | "reopen";

interface TaskStatusCycle {
  status: Task["status"];
  generation: number;
  confirmed?: StatusMutationKind;
}

interface TaskStatusCycleState {
  cycles: Map<string, TaskStatusCycle>;
  nextGeneration: number;
  authoritativeObserved: boolean;
}

interface ReadyExecutionScope {
  accountKey: string;
  backendId: TaskMutationService["backendId"];
  taskService: TickTickService;
  mutationService: TaskMutationService;
  view: TaskViewQuery["view"];
  status: TaskViewQuery["status"];
}

interface RefreshEvidenceGate {
  blocked: boolean;
  startedAttempt: number;
  requiredAttempt?: number;
  successfulAttempt?: number;
  observedError?: TaskMutationState["error"];
}

const MANUAL_REFRESH_SHORTCUT = platformShortcut("r");
const TASK_MUTATION_KINDS = Object.freeze([
  "complete",
  "reopen",
  "update",
  "move",
] as const satisfies readonly TaskMutationKind[]);

export function TaskListView({ config, runtime }: TaskListViewProps): ReactElement {
  if (runtime.kind === "loading") return <List filtering={false} isLoading />;
  if (runtime.kind === "error") return errorList(runtime.presentation, runtime.recovery);

  try {
    const configSnapshot = snapshotTaskCommandConfig(config);
    const remoteQuery = buildStableTaskQuery(configSnapshot, runtime.capabilities);
    return <ReadyTaskListView config={configSnapshot} runtime={runtime} remoteQuery={remoteQuery} />;
  } catch (error) {
    return errorList(presentError(error, "read"), {
      onReconnect: runtime.onReconnect,
      onOpenPreferences: runtime.onOpenPreferences,
    });
  }
}

function ReadyTaskListView({ config, runtime, remoteQuery }: ReadyTaskListViewProps): ReactElement {
  const navigation = useNavigation();
  const read = useTaskQuery(runtime.taskService, runtime.accountKey, remoteQuery);
  const isSearch = remoteQuery.view === "search";
  const filterState = useTaskListFilters({
    mode: isSearch ? "search" : "ephemeral",
    defaultStatus: "open",
    projects: read.data?.projects ?? [],
    catalogAuthoritative: read.data !== undefined,
    completedQuery: isSearch && runtime.capabilities.completedQuery,
    contextKey: JSON.stringify([runtime.mutationService.backendId, runtime.accountKey, remoteQuery.view]),
    storage: isSearch ? raycastTaskFilterStorage : undefined,
  });
  const scopeRef = useRef<ReadyExecutionScope | undefined>(undefined);
  const refreshGate = useRef<RefreshEvidenceGate>({ blocked: false, startedAttempt: 0 });
  const taskStatusCycles = useRef<TaskStatusCycleState>({
    cycles: new Map(),
    nextGeneration: 0,
    authoritativeObserved: false,
  });
  const candidateScope = readyExecutionScope(runtime, remoteQuery);
  if (!scopeRef.current || !sameReadyExecutionScope(scopeRef.current, candidateScope)) {
    scopeRef.current = candidateScope;
    refreshGate.current = { blocked: false, startedAttempt: 0 };
    taskStatusCycles.current = { cycles: new Map(), nextGeneration: 0, authoritativeObserved: false };
  }
  const renderScope = scopeRef.current;
  const isCurrentScope = (): boolean => scopeRef.current === renderScope;
  const isCurrentTask = (task: Task, cycle: TaskStatusCycle): boolean =>
    isCurrentScope() && activeTaskStatusCycle(taskStatusCycles.current, task) === cycle;
  const armRefreshGate = (): void => {
    if (!isCurrentScope()) return;
    const gate = refreshGate.current;
    if (gate.blocked) return;
    gate.blocked = true;
    gate.requiredAttempt = gate.startedAttempt + 1;
    gate.successfulAttempt = undefined;
  };
  const trackedRefresh = async (): Promise<void> => {
    if (!isCurrentScope()) return;
    const gate = refreshGate.current;
    const attempt = ++gate.startedAttempt;
    try {
      await read.revalidate();
      if (!isCurrentScope()) return;
      if (gate.blocked && attempt >= (gate.requiredAttempt ?? Number.POSITIVE_INFINITY)) {
        gate.successfulAttempt = attempt;
      }
    } catch (error) {
      if (!isCurrentScope()) return;
      if (gate.blocked && attempt >= (gate.requiredAttempt ?? Number.POSITIVE_INFINITY)) {
        gate.successfulAttempt = undefined;
        gate.requiredAttempt = gate.startedAttempt + 1;
      }
      throw error;
    }
  };
  const refreshAfterUnknownMutation = async (): Promise<void> => {
    armRefreshGate();
    await trackedRefresh();
  };
  const mutation = useTaskMutation(runtime.mutationService, runtime.accountKey, {
    onRefreshRequired: refreshAfterUnknownMutation,
  });
  const gate = refreshGate.current;
  if (mutation.error?.refreshRequired) {
    if (gate.observedError !== mutation.error) armRefreshGate();
    gate.observedError = mutation.error;
  } else if (!gate.blocked) {
    gate.observedError = undefined;
  }
  const model = buildTaskListModel({
    read,
    filtersReady: filterState.filtersReady,
    requestedFilters: filterState.filters,
    emptyTitle: config.emptyTitle,
    capabilities: runtime.capabilities,
  });
  const hasHealthyRead = isAuthoritativeTaskSnapshot(read);
  if (hasHealthyRead && read.data) reconcileTaskStatusCycles(taskStatusCycles.current, read.data.tasks);
  else seedTaskStatusCycles(taskStatusCycles.current, read.data?.tasks ?? []);

  const hasSettledRefreshEvidence =
    gate.blocked &&
    gate.requiredAttempt !== undefined &&
    gate.successfulAttempt !== undefined &&
    gate.successfulAttempt >= gate.requiredAttempt;
  const hasHealthyRefreshEvidence = hasSettledRefreshEvidence && hasHealthyRead;
  if (hasSettledRefreshEvidence && !hasHealthyRead) {
    gate.successfulAttempt = undefined;
    gate.requiredAttempt = gate.startedAttempt + 1;
  }
  const mutationsBlocked = gate.blocked && !hasHealthyRefreshEvidence;

  useEffect(() => {
    if (!hasHealthyRefreshEvidence || scopeRef.current !== renderScope) return;
    const current = refreshGate.current;
    current.blocked = false;
    current.requiredAttempt = undefined;
    current.successfulAttempt = undefined;
    mutation.clearError();
  }, [hasHealthyRefreshEvidence, mutation.clearError, renderScope]);

  const manualRefresh = async (): Promise<void> => {
    if (!isCurrentScope()) return;
    const requiresEvidence = refreshGate.current.blocked || mutation.error?.refreshRequired === true;
    if (mutation.error?.refreshRequired) armRefreshGate();
    await trackedRefresh();
    if (!isCurrentScope()) return;
    if (!requiresEvidence) mutation.clearError();
  };
  const afterConfirmedMutation = async (
    task: Task,
    kind: StatusMutationKind,
    statusCycle: TaskStatusCycle,
    operation: () => Promise<void>
  ): Promise<void> => {
    if (refreshGate.current.blocked || !isCurrentTask(task, statusCycle) || statusCycle.confirmed === kind) return;
    await operation();
    if (!isCurrentTask(task, statusCycle)) return;
    statusCycle.confirmed = kind;
    await bestEffort(() => mutation.clearError());
    if (!isCurrentScope()) return;
    await bestEffort(() => read.revalidate());
  };
  const callbacks: TaskActionCallbacks = {
    complete: (task, statusCycle) =>
      afterConfirmedMutation(task, "complete", statusCycle, () => mutation.complete(task)),
    reopen: (task, statusCycle) => afterConfirmedMutation(task, "reopen", statusCycle, () => mutation.reopen(task)),
    refresh: manualRefresh,
    edit: (task, baseline, statusCycle) => {
      if (!isCurrentTask(task, statusCycle)) return;
      let currentTask = task;
      let confirmed = false;
      let hasConfirmedMove = false;
      let activeTransaction: symbol | undefined;
      navigation.push(
        <TaskForm
          mode="edit"
          projects={read.data?.projects ?? []}
          initialValues={baseline.values}
          dateSemantics={baseline.dateSemantics}
          fieldAvailability={{ project: runtime.capabilities.move }}
          onSubmit={async (values) => {
            if (
              refreshGate.current.blocked ||
              confirmed ||
              activeTransaction !== undefined ||
              !isCurrentScope() ||
              (!hasConfirmedMove && !isCurrentTask(task, statusCycle))
            ) {
              return;
            }
            const transaction = Symbol("edit-transaction");
            activeTransaction = transaction;
            const isActiveTransaction = (): boolean => isCurrentScope() && activeTransaction === transaction;

            try {
              const safeValues = runtime.capabilities.move ? values : { ...values, projectId: currentTask.projectId };
              const plan = planEditTaskSubmission(currentTask, safeValues, runtime.uiTimeZone);
              if (!plan.move && !plan.update) {
                await bestEffort(() => navigation.pop());
                return;
              }

              if (plan.move) {
                const movedTask = await mutation.move(currentTask, plan.move.targetProjectId);
                if (!isActiveTransaction()) return;
                currentTask = movedTask;
                hasConfirmedMove = true;
              }
              if (plan.update) {
                const updatedTask = await mutation.update(currentTask, plan.update.patch);
                if (!isActiveTransaction()) return;
                currentTask = updatedTask;
              }
              confirmed = true;
              await bestEffort(() => mutation.clearError());
              if (!isActiveTransaction()) return;
              await bestEffort(() => read.revalidate());
              if (!isActiveTransaction()) return;
              await bestEffort(() => navigation.pop());
            } finally {
              if (activeTransaction === transaction) activeTransaction = undefined;
            }
          }}
        />
      );
    },
    move: (task, statusCycle) => {
      if (!isCurrentTask(task, statusCycle)) return;
      let confirmed = false;
      navigation.push(
        <MoveTaskForm
          currentProjectId={task.projectId}
          projects={read.data?.projects ?? []}
          onMove={async (targetProjectId) => {
            if (refreshGate.current.blocked || confirmed || !isCurrentTask(task, statusCycle)) return;
            await mutation.move(task, targetProjectId);
            if (!isCurrentScope()) return;
            confirmed = true;
            await bestEffort(() => mutation.clearError());
            if (!isCurrentScope()) return;
            await bestEffort(() => read.revalidate());
            if (!isCurrentScope()) return;
            await bestEffort(() => navigation.pop());
          }}
        />
      );
    },
    statusCycle: (task) => activeTaskStatusCycle(taskStatusCycles.current, task),
  };
  const hasResults = model.content.kind === "results";

  return (
    <List
      filtering={false}
      isLoading={model.isBusy || mutation.hasPending}
      isShowingDetail
      searchText={filterState.filters.searchText}
      searchBarPlaceholder={config.placeholder}
      onSearchTextChange={filterState.setSearchText}
      searchBarAccessory={
        isSearch ? (
          <CombinedTaskFilter model={filterState.combinedFilter} onSelection={filterState.selectCombinedFilter} />
        ) : undefined
      }
    >
      {mutation.error
        ? renderMutationErrorRow({
            error: mutation.error,
            mutation,
            onRefresh: manualRefresh,
            onRetryRefresh: trackedRefresh,
            isCurrent: isCurrentScope,
          })
        : null}
      {hasResults ? (
        <StaleDataWarning
          health={model.health}
          hasResults
          onReconnect={runtime.onReconnect}
          onOpenPreferences={runtime.onOpenPreferences}
          onRefresh={manualRefresh}
          onRetry={manualRefresh}
        />
      ) : null}
      {renderContent(model, read, mutation, runtime, callbacks, mutationsBlocked)}
    </List>
  );
}

function renderContent(
  model: TaskListModel,
  read: TaskQueryState,
  mutation: TaskMutationState,
  runtime: TaskListReadyRuntime,
  callbacks: TaskActionCallbacks,
  mutationsBlocked: boolean
): ReactNode {
  switch (model.content.kind) {
    case "loading":
      return null;
    case "error":
      return (
        <List.EmptyView
          title={model.content.error.title}
          description={model.content.error.message}
          actions={recoveryPanel(model.content.error, {
            onReconnect: runtime.onReconnect,
            onOpenPreferences: runtime.onOpenPreferences,
            onRefresh: callbacks.refresh,
            onRetry: callbacks.refresh,
          })}
        />
      );
    case "empty":
      return (
        <List.EmptyView
          title={model.content.title}
          description={buildEmptyStateHealthDescription(model.health)}
          actions={
            model.health.readError ? (
              recoveryPanel(model.health.readError, {
                onReconnect: runtime.onReconnect,
                onOpenPreferences: runtime.onOpenPreferences,
                onRefresh: callbacks.refresh,
                onRetry: callbacks.refresh,
              })
            ) : (
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  shortcut={MANUAL_REFRESH_SHORTCUT}
                  onAction={callbacks.refresh}
                />
              </ActionPanel>
            )
          }
        />
      );
    case "results":
      return model.content.sections.map((section) => (
        <List.Section key={section.id} title={section.title}>
          {section.items.map((item) => renderTaskItem(item, read, mutation, runtime, callbacks, mutationsBlocked))}
        </List.Section>
      ));
  }
}

function renderTaskItem(
  item: TaskListItemModel,
  read: TaskQueryState,
  mutation: TaskMutationState,
  runtime: TaskListReadyRuntime,
  callbacks: TaskActionCallbacks,
  mutationsBlocked: boolean
): ReactElement {
  const task = item.task;
  const baseline = runtime.capabilities.update ? safeEditBaseline(task, runtime.uiTimeZone) : undefined;
  const model = buildDomainTaskItemModel(
    task,
    read.data?.projects ?? [],
    runtime.capabilities,
    runtime.exactLinkStrategy,
    runtime.uiTimeZone
  );
  const anyMutationPending = TASK_MUTATION_KINDS.some((kind) => mutation.isPending(task, kind));
  const statusCycle = callbacks.statusCycle(task);
  const canMutate = !mutationsBlocked && !anyMutationPending && statusCycle !== undefined;

  return (
    <DomainTaskItem
      key={model.rowId}
      model={model}
      onComplete={
        item.statusAction === "complete" && canMutate && statusCycle
          ? () => callbacks.complete(task, statusCycle)
          : undefined
      }
      onReopen={
        item.statusAction === "reopen" && canMutate && statusCycle
          ? () => callbacks.reopen(task, statusCycle)
          : undefined
      }
      onEdit={
        runtime.capabilities.update && baseline && canMutate && statusCycle
          ? () => callbacks.edit(task, baseline, statusCycle)
          : undefined
      }
      onMove={
        runtime.capabilities.move && canMutate && statusCycle ? () => callbacks.move(task, statusCycle) : undefined
      }
      onRefresh={callbacks.refresh}
    />
  );
}

function renderMutationErrorRow({
  error,
  mutation,
  onRefresh,
  onRetryRefresh,
  isCurrent,
}: Readonly<{
  error: NonNullable<TaskMutationState["error"]>;
  mutation: TaskMutationState;
  onRefresh: () => Promise<void>;
  onRetryRefresh: () => Promise<void>;
  isCurrent: () => boolean;
}>): ReactElement {
  const retry = async (): Promise<void> => {
    if (!isCurrent()) return;
    await mutation.retry();
    if (!isCurrent()) return;
    mutation.clearError();
    if (!isCurrent()) return;
    await bestEffort(onRetryRefresh);
  };

  return (
    <List.Item
      id="ticktick-mutation-error"
      title={error.title}
      subtitle={error.message}
      icon={Icon.ExclamationMark}
      actions={
        error.canRetry || error.refreshRequired ? (
          <ActionPanel>
            {error.canRetry ? (
              <Action title="Retry" icon={Icon.RotateClockwise} shortcut={MANUAL_REFRESH_SHORTCUT} onAction={retry} />
            ) : null}
            {error.refreshRequired ? (
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={MANUAL_REFRESH_SHORTCUT}
                onAction={onRefresh}
              />
            ) : null}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function safeEditBaseline(task: Task, uiTimeZone: string): EditTaskFormBaseline | undefined {
  try {
    return buildEditTaskFormBaseline(task, uiTimeZone);
  } catch {
    return undefined;
  }
}

function taskIdentityKey(task: Task): string {
  return JSON.stringify([task.projectId, task.id]);
}

function reconcileTaskStatusCycles(state: TaskStatusCycleState, tasks: readonly Task[]): void {
  const presentKeys = new Set(tasks.map(taskIdentityKey));
  for (const key of state.cycles.keys()) {
    if (!presentKeys.has(key)) state.cycles.delete(key);
  }
  for (const task of tasks) ensureTaskStatusCycle(state, task, true);
  state.authoritativeObserved = true;
}

function seedTaskStatusCycles(state: TaskStatusCycleState, tasks: readonly Task[]): void {
  if (state.authoritativeObserved) return;
  for (const task of tasks) ensureTaskStatusCycle(state, task, false);
}

function ensureTaskStatusCycle(state: TaskStatusCycleState, task: Task, replaceChangedStatus: boolean): void {
  const key = taskIdentityKey(task);
  const current = state.cycles.get(key);
  if (!current) {
    state.cycles.set(key, { status: task.status, generation: state.nextGeneration++ });
    return;
  }
  if (current.status === task.status || !replaceChangedStatus) return;

  state.cycles.set(key, { status: task.status, generation: state.nextGeneration++ });
}

function activeTaskStatusCycle(state: TaskStatusCycleState, task: Task): TaskStatusCycle | undefined {
  const cycle = state.cycles.get(taskIdentityKey(task));
  return cycle?.status === task.status ? cycle : undefined;
}

function isAuthoritativeTaskSnapshot(read: TaskQueryState): boolean {
  return (
    read.data !== undefined &&
    read.error === undefined &&
    !read.isLoading &&
    !read.isRefreshing &&
    read.data.freshness === "fresh" &&
    !read.data.isPartial
  );
}

function readyExecutionScope(runtime: TaskListReadyRuntime, query: Readonly<TaskViewQuery>): ReadyExecutionScope {
  return {
    accountKey: runtime.accountKey,
    backendId: runtime.mutationService.backendId,
    taskService: runtime.taskService,
    mutationService: runtime.mutationService,
    view: query.view,
    status: query.status,
  };
}

function sameReadyExecutionScope(left: ReadyExecutionScope, right: ReadyExecutionScope): boolean {
  return (
    left.accountKey === right.accountKey &&
    left.backendId === right.backendId &&
    left.taskService === right.taskService &&
    left.mutationService === right.mutationService &&
    left.view === right.view &&
    left.status === right.status
  );
}

async function bestEffort(operation: () => void | Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch {
    // The remote mutation is already confirmed. Follow-up UI and refresh effects cannot make it retryable.
  }
}

function errorList(presentation: ErrorPresentation, recovery: TaskListRecoveryHandlers = {}): ReactElement {
  return (
    <List filtering={false}>
      <List.EmptyView
        title={presentation.title}
        description={presentation.message}
        actions={recoveryPanel(presentation, recovery)}
      />
    </List>
  );
}

function recoveryPanel(presentation: ErrorPresentation, recovery: TaskListRecoveryHandlers): ReactElement {
  return (
    <ActionPanel>
      <ConnectionActions presentation={presentation} {...recovery} />
    </ActionPanel>
  );
}

function platformShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  const macOSModifiers: Keyboard.KeyModifier[] = ["cmd"];
  const windowsModifiers: Keyboard.KeyModifier[] = ["ctrl"];
  const shortcut = {
    macOS: { modifiers: macOSModifiers, key },
    Windows: { modifiers: windowsModifiers, key },
  } satisfies Keyboard.Shortcut;

  Object.freeze(macOSModifiers);
  Object.freeze(windowsModifiers);
  Object.freeze(shortcut.macOS);
  Object.freeze(shortcut.Windows);
  return Object.freeze(shortcut);
}

function snapshotTaskCommandConfig(source: TaskCommandConfig): Readonly<TaskCommandConfig> {
  try {
    const candidate: unknown = source;
    if (!isRecord(candidate)) return invalidCommandConfig();

    const queryCandidate = candidate.query;
    const placeholder = candidate.placeholder;
    const emptyTitle = candidate.emptyTitle;
    if (!isRecord(queryCandidate)) return invalidCommandConfig();

    const view = queryCandidate.view;
    const status = queryCandidate.status;
    const canonical = canonicalCommandConfig(view, status);
    if (!canonical || placeholder !== canonical.placeholder || emptyTitle !== canonical.emptyTitle) {
      return invalidCommandConfig();
    }

    return Object.freeze({
      query: Object.freeze({ view, status } as TaskViewQuery),
      placeholder: canonical.placeholder,
      emptyTitle: canonical.emptyTitle,
    });
  } catch {
    return invalidCommandConfig();
  }
}

function canonicalCommandConfig(view: unknown, status: unknown): TaskCommandConfig | undefined {
  if (view === "today" && status === "open") return TODAY_COMMAND;
  if (view === "next7Days" && status === "open") return NEXT_SEVEN_COMMAND;
  if (view === "inbox" && status === "open") return INBOX_COMMAND;
  if (view === "search" && (status === "open" || status === "all")) return SEARCH_COMMAND;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidCommandConfig(): never {
  throw new ProtocolError("The task command configuration is invalid.");
}

export default TaskListView;
