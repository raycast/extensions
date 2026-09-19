import { useCallback, useEffect, useRef, useState } from "react";

import type { TaskMutationService } from "../application/TaskMutationService";
import { AmbiguousMutationError, NotFoundError, TickTickError, ValidationError } from "../domain/errors";
import type { Task, UpdateTaskInput } from "../domain/task";

export type TaskMutationKind = "complete" | "reopen" | "update" | "move";

export interface TaskMutationErrorState {
  title: string;
  message: string;
  canRetry: boolean;
  refreshRequired: boolean;
}

export interface UseTaskMutationOptions {
  onRefreshRequired?: () => void | Promise<void>;
}

export interface TaskMutationState {
  error?: TaskMutationErrorState;
  hasPending: boolean;
  isPending(task: Task, kind: TaskMutationKind): boolean;
  complete(task: Task): Promise<void>;
  reopen(task: Task): Promise<void>;
  update(task: Task, patch: UpdateTaskInput): Promise<Task>;
  move(task: Task, targetProjectId: string): Promise<Task>;
  retry(): Promise<Task | void | undefined>;
  clearError(): void;
}

type TaskMutationAction =
  | { kind: "complete"; task: Task }
  | { kind: "reopen"; task: Task }
  | { kind: "update"; task: Task; patch: UpdateTaskInput }
  | { kind: "move"; task: Task; targetProjectId: string };

interface MutationContext {
  service: TaskMutationService;
  accountKey: string;
  generation: number;
}

interface RetryRequest {
  context: MutationContext;
  action: TaskMutationAction;
}

interface MutationViewState {
  generation: number;
  pendingCounts: ReadonlyMap<string, number>;
  error?: TaskMutationErrorState;
}

interface ActiveTaskMutation {
  fingerprint: string;
  promise: Promise<Task | void>;
}

const EMPTY_PENDING_COUNTS: ReadonlyMap<string, number> = new Map();

export function useTaskMutation(
  service: TaskMutationService,
  accountKey: string,
  options: UseTaskMutationOptions = {}
): TaskMutationState {
  const mountedRef = useRef(true);
  const contextRef = useRef<MutationContext>({ service, accountKey, generation: 0 });
  const activeMutationsRef = useRef(new Map<string, ActiveTaskMutation>());
  const retryRequestRef = useRef<RetryRequest | undefined>(undefined);
  const refreshRequiredRef = useRef(options.onRefreshRequired);

  if (contextRef.current.service !== service || contextRef.current.accountKey !== accountKey) {
    contextRef.current = {
      service,
      accountKey,
      generation: contextRef.current.generation + 1,
    };
    retryRequestRef.current = undefined;
  }
  refreshRequiredRef.current = options.onRefreshRequired;

  const renderContext = contextRef.current;
  const generation = renderContext.generation;
  const [viewState, setViewState] = useState<MutationViewState>(() => ({
    generation,
    pendingCounts: EMPTY_PENDING_COUNTS,
  }));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    (action: TaskMutationAction): Promise<Task | void> => {
      const context = renderContext;
      const boundaryKey = taskBoundaryKey(service.backendId, accountKey, action.task);
      const fingerprint = actionFingerprint(action);
      const active = activeMutationsRef.current.get(boundaryKey);
      if (active) {
        if (active.fingerprint === fingerprint) return active.promise;
        return Promise.reject(new ValidationError("Another change to this task is already in progress."));
      }

      retryRequestRef.current = undefined;
      const pendingKey = pendingActionKey(service.backendId, accountKey, action.task, action.kind);
      if (isCurrentContext(mountedRef, contextRef, context)) {
        setViewState((previous) => ({
          generation: context.generation,
          pendingCounts: incrementPending(currentPending(previous, context.generation), pendingKey),
        }));
      }

      const operation = executeAction(service, accountKey, action);

      const mutation = operation
        .catch(async (cause: unknown) => {
          const presentation = mutationErrorState(cause);
          if (isCurrentContext(mountedRef, contextRef, context)) {
            retryRequestRef.current = presentation.canRetry ? { context, action } : undefined;
            setViewState((previous) => ({
              generation: context.generation,
              pendingCounts: currentPending(previous, context.generation),
              error: presentation,
            }));
            if (presentation.refreshRequired && isCurrentContext(mountedRef, contextRef, context)) {
              await invokeRefresh(refreshRequiredRef.current);
            }
          }
          throw cause;
        })
        .finally(() => {
          if (activeMutationsRef.current.get(boundaryKey)?.promise === mutation) {
            activeMutationsRef.current.delete(boundaryKey);
          }
          if (isCurrentContext(mountedRef, contextRef, context)) {
            setViewState((previous) => ({
              generation: context.generation,
              pendingCounts: decrementPending(currentPending(previous, context.generation), pendingKey),
              ...(previous.generation === context.generation && previous.error ? { error: previous.error } : {}),
            }));
          }
        });

      activeMutationsRef.current.set(boundaryKey, { fingerprint, promise: mutation });
      return mutation;
    },
    [accountKey, renderContext, service]
  );

  const complete = useCallback((task: Task): Promise<void> => run({ kind: "complete", task }) as Promise<void>, [run]);
  const reopen = useCallback((task: Task): Promise<void> => run({ kind: "reopen", task }) as Promise<void>, [run]);
  const update = useCallback(
    (task: Task, patch: UpdateTaskInput): Promise<Task> => run({ kind: "update", task, patch }) as Promise<Task>,
    [run]
  );
  const move = useCallback(
    (task: Task, targetProjectId: string): Promise<Task> =>
      run({ kind: "move", task, targetProjectId }) as Promise<Task>,
    [run]
  );
  const retry = useCallback((): Promise<Task | void | undefined> => {
    const request = retryRequestRef.current;
    const context = contextRef.current;
    if (!request || !sameContext(request.context, context)) {
      retryRequestRef.current = undefined;
      return Promise.resolve(undefined);
    }
    retryRequestRef.current = undefined;
    return run(request.action);
  }, [run]);
  const clearError = useCallback((): void => {
    retryRequestRef.current = undefined;
    const context = contextRef.current;
    if (!isCurrentContext(mountedRef, contextRef, context)) return;
    setViewState((previous) => ({
      generation: context.generation,
      pendingCounts: currentPending(previous, context.generation),
    }));
  }, []);

  const visiblePendingCounts = viewState.generation === generation ? viewState.pendingCounts : EMPTY_PENDING_COUNTS;
  const isPending = useCallback(
    (task: Task, kind: TaskMutationKind): boolean =>
      (visiblePendingCounts.get(pendingActionKey(service.backendId, accountKey, task, kind)) ?? 0) > 0,
    [accountKey, service, visiblePendingCounts]
  );

  return {
    ...(viewState.generation === generation && viewState.error ? { error: viewState.error } : {}),
    hasPending: visiblePendingCounts.size > 0,
    isPending,
    complete,
    reopen,
    update,
    move,
    retry,
    clearError,
  };
}

function executeAction(
  service: TaskMutationService,
  accountKey: string,
  action: TaskMutationAction
): Promise<Task | void> {
  switch (action.kind) {
    case "complete":
      return service.complete(accountKey, action.task);
    case "reopen":
      return service.reopen(accountKey, action.task);
    case "update":
      return service.update(accountKey, action.task, action.patch);
    case "move":
      return service.move(accountKey, action.task, action.targetProjectId);
  }
}

function mutationErrorState(error: unknown): TaskMutationErrorState {
  if (error instanceof AmbiguousMutationError) {
    return {
      title: "Task Update Status Unknown",
      message: "TickTick may have applied this change. Refresh before trying again.",
      canRetry: false,
      refreshRequired: true,
    };
  }
  if (error instanceof NotFoundError) {
    return {
      title: "Task No Longer Available",
      message: "This task no longer exists in TickTick. Refresh to update the list.",
      canRetry: false,
      refreshRequired: true,
    };
  }
  return {
    title: "Couldn't Update Task",
    message: error instanceof TickTickError ? error.message : "TickTick couldn't update this task.",
    canRetry: error instanceof TickTickError && error.retryable,
    refreshRequired: false,
  };
}

function taskBoundaryKey(backendId: TaskMutationService["backendId"], accountKey: string, task: Task): string {
  return JSON.stringify([backendId, accountKey, task.projectId, task.id]);
}

function pendingActionKey(
  backendId: TaskMutationService["backendId"],
  accountKey: string,
  task: Task,
  kind: TaskMutationKind
): string {
  return JSON.stringify([backendId, accountKey, task.projectId, task.id, kind]);
}

function actionFingerprint(action: TaskMutationAction): string {
  switch (action.kind) {
    case "complete":
    case "reopen":
      return action.kind;
    case "update":
      return `update:${stableSerialize(action.patch)}`;
    case "move":
      return `move:${stableSerialize(action.targetProjectId)}`;
  }
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "number") return `number:${Object.is(value, -0) ? "-0" : String(value)}`;
  if (typeof value === "boolean") return `boolean:${String(value)}`;
  if (Array.isArray(value)) return `array:[${value.map(stableSerialize).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `object:{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(",")}}`;
  }
  return `${typeof value}:${String(value)}`;
}

function currentPending(state: MutationViewState, generation: number): ReadonlyMap<string, number> {
  return state.generation === generation ? state.pendingCounts : EMPTY_PENDING_COUNTS;
}

function incrementPending(previous: ReadonlyMap<string, number>, key: string): ReadonlyMap<string, number> {
  const next = new Map(previous);
  next.set(key, (next.get(key) ?? 0) + 1);
  return next;
}

function decrementPending(previous: ReadonlyMap<string, number>, key: string): ReadonlyMap<string, number> {
  const count = previous.get(key) ?? 0;
  if (count === 0) return previous;
  const next = new Map(previous);
  if (count === 1) next.delete(key);
  else next.set(key, count - 1);
  return next;
}

function isCurrentContext(
  mountedRef: { current: boolean },
  contextRef: { current: MutationContext },
  expected: MutationContext
): boolean {
  return mountedRef.current && sameContext(contextRef.current, expected);
}

function sameContext(left: MutationContext, right: MutationContext): boolean {
  return left.generation === right.generation && left.service === right.service && left.accountKey === right.accountKey;
}

async function invokeRefresh(callback: UseTaskMutationOptions["onRefreshRequired"]): Promise<void> {
  if (!callback) return;
  try {
    await callback();
  } catch {
    // Revalidation is best-effort and must not replace the mutation failure.
  }
}
