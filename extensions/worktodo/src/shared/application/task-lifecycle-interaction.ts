import type { Task } from "../domain/model";
import type { GuardedTaskLifecycleResult, TaskLifecycleOperation, TaskLifecycleRevision } from "../domain/task-service";

export const TASK_COMPLETION_ACKNOWLEDGEMENT_DURATION_MS = 1_000;
export const TASK_LIFECYCLE_HISTORY_DURATION_MS = 10_000;

export const DELAYED_COMPLETION_POLICY = { completion: "delayed" } as const;
export const IMMEDIATE_COMPLETION_POLICY = { completion: "immediate" } as const;

export type TaskLifecyclePolicy = typeof DELAYED_COMPLETION_POLICY | typeof IMMEDIATE_COMPLETION_POLICY;
export type TaskLifecycleMutationKind = TaskLifecycleOperation;
export type TaskLifecycleHistoryKind = "complete" | "trash";
export type TaskLifecycleHistoryDirection = "undo" | "redo";

export type TaskLifecycleHistoryState = {
  direction: TaskLifecycleHistoryDirection;
  kind: TaskLifecycleHistoryKind;
  taskId: string;
  taskTitle: string;
  revision: TaskLifecycleRevision;
};

export type TaskLifecycleMutations = {
  completeTask(taskId: string): Task;
  reopenTask(taskId: string): Task;
  trashTask(taskId: string): Task;
  restoreTask(taskId: string): Task;
  applyTaskLifecycleHistory(
    taskId: string,
    operation: TaskLifecycleMutationKind,
    expected: TaskLifecycleRevision,
  ): GuardedTaskLifecycleResult;
};

export type TaskLifecycleRefreshAdapter = {
  refreshView(): void;
  refreshRelated?(): void;
};

export type TaskLifecycleScheduler = {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
};

export type TaskLifecycleRefreshEffect = {
  view: "immediate" | "afterAcknowledgement";
  related: "immediate" | "none";
};

export type TaskLifecycleSuccess<History extends TaskLifecycleHistoryState | null = TaskLifecycleHistoryState | null> =
  {
    status: "succeeded";
    operation: TaskLifecycleMutationKind;
    task: Task;
    history: History;
    refresh: TaskLifecycleRefreshEffect;
  };

export type TaskLifecycleFailure = {
  status: "failed";
  operation: TaskLifecycleMutationKind;
  error: unknown;
};

export type TaskLifecycleDuplicate = {
  status: "duplicate";
  task: Task;
  history: TaskLifecycleHistoryState | null;
};

export type TaskLifecycleUnavailable = {
  status: "unavailable";
  history: TaskLifecycleHistoryState;
};

export type TaskLifecycleMutationAttempt = TaskLifecycleSuccess | TaskLifecycleFailure | TaskLifecycleDuplicate;
export type TaskLifecycleHistoryAttempt =
  | TaskLifecycleSuccess<TaskLifecycleHistoryState>
  | TaskLifecycleFailure
  | TaskLifecycleDuplicate
  | TaskLifecycleUnavailable;

type PendingCompletion = {
  task: Task;
  timer: unknown;
};

type HistoryEntry = {
  state: TaskLifecycleHistoryState;
  timer: unknown;
};

export type TaskLifecycleInteractionOptions = {
  mutations: TaskLifecycleMutations;
  policy: TaskLifecyclePolicy;
  refresh: TaskLifecycleRefreshAdapter;
  onAcknowledgementsChanged?: (tasks: ReadonlyMap<string, Task>) => void;
  onHistoryChanged?: (state: TaskLifecycleHistoryState | null) => void;
  scheduler?: TaskLifecycleScheduler;
};

type OperationScopedSession = {
  service: TaskLifecycleMutations;
  close(): void;
};

const systemScheduler: TaskLifecycleScheduler = {
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function taskLifecycleActionKindForViewKind(viewKind: string): Exclude<TaskLifecycleMutationKind, "trash"> {
  if (viewKind === "trash") {
    return "restore";
  }
  return viewKind === "completed" ? "reopen" : "complete";
}

export function createOperationScopedTaskLifecycleMutations(
  openSession: () => OperationScopedSession,
): TaskLifecycleMutations {
  const run = (operation: TaskLifecycleMutationKind, taskId: string): Task => {
    const session = openSession();
    try {
      return invokeMutation(session.service, operation, taskId);
    } finally {
      session.close();
    }
  };

  return {
    completeTask: (taskId) => run("complete", taskId),
    reopenTask: (taskId) => run("reopen", taskId),
    trashTask: (taskId) => run("trash", taskId),
    restoreTask: (taskId) => run("restore", taskId),
    applyTaskLifecycleHistory: (taskId, operation, expected) => {
      const session = openSession();
      try {
        return session.service.applyTaskLifecycleHistory(taskId, operation, expected);
      } finally {
        session.close();
      }
    },
  };
}

export class TaskLifecycleInteraction {
  private readonly pendingCompletions = new Map<string, PendingCompletion>();
  private historyEntry: HistoryEntry | null = null;
  private readonly scheduler: TaskLifecycleScheduler;

  constructor(private readonly options: TaskLifecycleInteractionOptions) {
    this.scheduler = options.scheduler ?? systemScheduler;
  }

  get historyState(): TaskLifecycleHistoryState | null {
    return this.historyEntry?.state ?? null;
  }

  get acknowledgedTasks(): ReadonlyMap<string, Task> {
    return new Map([...this.pendingCompletions].map(([taskId, pending]) => [taskId, pending.task]));
  }

  runMutation(operation: TaskLifecycleMutationKind, taskId: string): TaskLifecycleMutationAttempt {
    const duplicate = operation === "complete" ? this.pendingCompletions.get(taskId) : undefined;
    if (duplicate) {
      return { status: "duplicate", task: duplicate.task, history: this.historyState };
    }

    const mutation = this.mutate(operation, taskId);
    if (mutation.status === "failed") {
      return mutation;
    }

    const task = mutation.task;
    if (operation === "complete" || operation === "trash") {
      if (operation === "complete" && this.options.policy.completion === "delayed") {
        this.acknowledgeCompletion(task);
      } else {
        this.clearAcknowledgements();
      }
      const history = this.replaceHistory({
        direction: "undo",
        kind: operation,
        taskId: task.id,
        taskTitle: task.title,
        revision: lifecycleRevision(task),
      });
      if (operation !== "complete" || this.options.policy.completion === "immediate") {
        this.refreshImmediately();
      }
      return this.success(operation, task, history);
    }

    this.clearHistory();
    this.clearAcknowledgements();
    this.refreshImmediately();
    return this.success(operation, task, null);
  }

  runHistory(expected: TaskLifecycleHistoryState): TaskLifecycleHistoryAttempt {
    const current = this.historyEntry;
    if (!current || !sameHistoryState(current.state, expected)) {
      return { status: "unavailable", history: expected };
    }

    const operation = historyOperation(expected);
    const duplicate = operation === "complete" ? this.pendingCompletions.get(expected.taskId) : undefined;
    if (duplicate) {
      return { status: "duplicate", task: duplicate.task, history: this.historyState };
    }

    let mutation: GuardedTaskLifecycleResult;
    try {
      mutation = this.options.mutations.applyTaskLifecycleHistory(expected.taskId, operation, expected.revision);
    } catch (error) {
      return { status: "failed", operation, error };
    }
    if (mutation.status === "stale") {
      this.refreshAfterExternalMutation();
      return { status: "unavailable", history: expected };
    }

    if (operation === "complete" && this.options.policy.completion === "delayed") {
      this.acknowledgeCompletion(mutation.task);
    } else {
      this.clearAcknowledgements();
    }
    const history = this.replaceHistory({
      ...current.state,
      direction: current.state.direction === "undo" ? "redo" : "undo",
      revision: lifecycleRevision(mutation.task),
    });
    if (operation !== "complete" || this.options.policy.completion === "immediate") {
      this.refreshImmediately();
    }
    return this.success(operation, mutation.task, history);
  }

  clearAcknowledgements(): void {
    if (this.pendingCompletions.size === 0) {
      return;
    }
    for (const { timer } of this.pendingCompletions.values()) {
      this.scheduler.cancel(timer);
    }
    this.pendingCompletions.clear();
    this.emitAcknowledgements();
  }

  clearHistory(): void {
    if (!this.historyEntry) {
      return;
    }
    this.scheduler.cancel(this.historyEntry.timer);
    this.historyEntry = null;
    this.options.onHistoryChanged?.(null);
  }

  refreshAfterExternalMutation(): void {
    this.clearHistory();
    this.clearAcknowledgements();
    this.refreshImmediately();
  }

  dispose(): void {
    for (const { timer } of this.pendingCompletions.values()) {
      this.scheduler.cancel(timer);
    }
    this.pendingCompletions.clear();
    if (this.historyEntry) {
      this.scheduler.cancel(this.historyEntry.timer);
      this.historyEntry = null;
    }
  }

  private mutate(
    operation: TaskLifecycleMutationKind,
    taskId: string,
  ): { status: "succeeded"; task: Task } | TaskLifecycleFailure {
    try {
      return { status: "succeeded", task: invokeMutation(this.options.mutations, operation, taskId) };
    } catch (error) {
      return { status: "failed", operation, error };
    }
  }

  private success<History extends TaskLifecycleHistoryState | null>(
    operation: TaskLifecycleMutationKind,
    task: Task,
    history: History,
  ): TaskLifecycleSuccess<History> {
    const delayedCompletion = operation === "complete" && this.options.policy.completion === "delayed";
    return {
      status: "succeeded",
      operation,
      task,
      history,
      refresh: {
        view: delayedCompletion ? "afterAcknowledgement" : "immediate",
        related: this.options.refresh.refreshRelated ? "immediate" : "none",
      },
    };
  }

  private acknowledgeCompletion(task: Task): void {
    const pending: PendingCompletion = { task, timer: undefined };
    this.pendingCompletions.set(task.id, pending);
    this.emitAcknowledgements();
    this.options.refresh.refreshRelated?.();
    pending.timer = this.scheduler.schedule(() => {
      if (this.pendingCompletions.get(task.id) !== pending) {
        return;
      }
      this.pendingCompletions.delete(task.id);
      this.emitAcknowledgements();
      this.options.refresh.refreshView();
    }, TASK_COMPLETION_ACKNOWLEDGEMENT_DURATION_MS);
  }

  private replaceHistory(state: TaskLifecycleHistoryState): TaskLifecycleHistoryState {
    if (this.historyEntry) {
      this.scheduler.cancel(this.historyEntry.timer);
    }
    const entry: HistoryEntry = { state, timer: undefined };
    this.historyEntry = entry;
    entry.timer = this.scheduler.schedule(() => {
      if (this.historyEntry !== entry) {
        return;
      }
      this.historyEntry = null;
      this.options.onHistoryChanged?.(null);
    }, TASK_LIFECYCLE_HISTORY_DURATION_MS);
    this.options.onHistoryChanged?.(state);
    return state;
  }

  private refreshImmediately(): void {
    this.options.refresh.refreshView();
    this.options.refresh.refreshRelated?.();
  }

  private emitAcknowledgements(): void {
    this.options.onAcknowledgementsChanged?.(this.acknowledgedTasks);
  }
}

function historyOperation(state: TaskLifecycleHistoryState): TaskLifecycleMutationKind {
  if (state.kind === "complete") {
    return state.direction === "undo" ? "reopen" : "complete";
  }
  return state.direction === "undo" ? "restore" : "trash";
}

function invokeMutation(mutations: TaskLifecycleMutations, operation: TaskLifecycleMutationKind, taskId: string): Task {
  switch (operation) {
    case "complete":
      return mutations.completeTask(taskId);
    case "reopen":
      return mutations.reopenTask(taskId);
    case "trash":
      return mutations.trashTask(taskId);
    case "restore":
      return mutations.restoreTask(taskId);
  }
}

function sameHistoryState(left: TaskLifecycleHistoryState, right: TaskLifecycleHistoryState): boolean {
  return (
    left.direction === right.direction &&
    left.kind === right.kind &&
    left.taskId === right.taskId &&
    left.taskTitle === right.taskTitle &&
    left.revision.updatedAtMs === right.revision.updatedAtMs &&
    left.revision.completedAtMs === right.revision.completedAtMs &&
    left.revision.trashedAtMs === right.revision.trashedAtMs
  );
}

function lifecycleRevision(task: Task): TaskLifecycleRevision {
  return { updatedAtMs: task.updatedAtMs, completedAtMs: task.completedAtMs, trashedAtMs: task.trashedAtMs };
}
