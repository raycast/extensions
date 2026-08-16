import { AmbiguousMutationError, NotFoundError, ProtocolError } from "../domain/errors";
import type { Task, TaskRef, UpdateTaskInput } from "../domain/task";
import type { BackendCapabilities, TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import type { TaskCacheScope, TaskRepository } from "../infrastructure/cache/TaskRepository";

export interface TaskMutationServiceDependencies {
  backend: TickTickBackend;
  repository: TaskRepository;
}

type MutationCapability = "complete" | "reopen" | "update" | "move";

const capabilityMessages: Record<MutationCapability, string> = {
  complete: "This TickTick backend cannot complete tasks.",
  reopen: "This TickTick backend cannot reopen tasks.",
  update: "This TickTick backend cannot update tasks.",
  move: "This TickTick backend cannot move tasks.",
};

export class TaskMutationService {
  private readonly backend: TickTickBackend;
  private readonly repository: TaskRepository;

  constructor(dependencies: TaskMutationServiceDependencies) {
    this.backend = dependencies.backend;
    this.repository = dependencies.repository;
  }

  get backendId(): TickTickBackend["id"] {
    return this.backend.id;
  }

  async complete(accountKey: string, task: Task): Promise<void> {
    this.assertCapability("complete");
    await this.changeStatus(accountKey, task, "completed", () => this.backend.completeTask(taskRef(task)));
  }

  async reopen(accountKey: string, task: Task): Promise<void> {
    this.assertCapability("reopen");
    await this.changeStatus(accountKey, task, "open", () => this.backend.reopenTask(taskRef(task)));
  }

  async update(accountKey: string, task: Task, patch: UpdateTaskInput): Promise<Task> {
    this.assertCapability("update");
    const ref = taskRef(task);
    try {
      const confirmed = await this.backend.updateTask(ref, patch);
      this.repository.mutateTask(this.backend.id, accountKey, ref, confirmed);
      return confirmed;
    } catch (error) {
      this.reconcileFailure(accountKey, ref, error);
      throw error;
    }
  }

  async move(accountKey: string, task: Task, targetProjectId: string): Promise<Task> {
    this.assertCapability("move");
    const ref = taskRef(task);
    try {
      const confirmed = await this.backend.moveTask(ref, targetProjectId);
      this.repository.mutateTask(this.backend.id, accountKey, ref, confirmed);
      // A dedicated Inbox query cannot be updated safely without authoritative
      // membership metadata, especially when a move changes the composite ref.
      this.repository.invalidate(this.scope(accountKey, "inbox"));
      return confirmed;
    } catch (error) {
      this.reconcileFailure(accountKey, ref, error);
      throw error;
    }
  }

  private async changeStatus(
    accountKey: string,
    task: Task,
    status: Task["status"],
    mutateRemote: () => Promise<void>
  ): Promise<void> {
    const ref = taskRef(task);
    const before = { ...task };
    const optimistic = { ...task, status };
    this.repository.mutateTask(this.backend.id, accountKey, ref, optimistic);

    try {
      await mutateRemote();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AmbiguousMutationError) {
        this.reconcileFailure(accountKey, ref, error);
      } else {
        this.repository.mutateTask(this.backend.id, accountKey, ref, before);
      }
      throw error;
    }
  }

  private reconcileFailure(accountKey: string, ref: TaskRef, error: unknown): void {
    if (error instanceof NotFoundError) {
      this.repository.invalidateTaskSnapshots(this.backend.id, accountKey, ref);
      this.repository.removeTask(this.backend.id, accountKey, ref);
      this.invalidateKnownSnapshots(accountKey);
    } else if (error instanceof AmbiguousMutationError) {
      this.repository.invalidateTaskSnapshots(this.backend.id, accountKey, ref);
      this.invalidateKnownSnapshots(accountKey);
    }
  }

  private invalidateKnownSnapshots(accountKey: string): void {
    this.repository.invalidate(this.scope(accountKey, "all"));
    this.repository.invalidate(this.scope(accountKey, "inbox"));
  }

  private assertCapability(capability: MutationCapability): void {
    const capabilities: BackendCapabilities = this.backend.capabilities();
    if (!capabilities[capability]) throw new ProtocolError(capabilityMessages[capability]);
  }

  private scope(accountKey: string, snapshotKey: string): TaskCacheScope {
    return { backendId: this.backend.id, accountKey, snapshotKey };
  }
}

function taskRef(task: Task): TaskRef {
  return { id: task.id, projectId: task.projectId };
}
