import { describe, expect, it, vi } from "vitest";

import { AmbiguousMutationError, NetworkError, NotFoundError, ProtocolError } from "../domain/errors";
import type { Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository, type TaskCacheScope } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { inboxProject, taskFixture, workProject } from "../test/fixtures/tasks";
import { TaskMutationService } from "./TaskMutationService";

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const accountKey = "oauth:00000000-0000-4000-8000-000000000001";

function backendFixture(overrides: Partial<TickTickBackend> = {}): TickTickBackend {
  return {
    id: "mcp",
    capabilities: () => ({
      create: true,
      update: true,
      complete: true,
      reopen: true,
      move: true,
      completedQuery: true,
      inboxQuery: true,
      exactTaskLink: true,
    }),
    accountIdentity: async () => "account-1",
    listProjects: async () => [inboxProject, workProject],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask: async (input) => taskFixture({ ...input, projectId: input.projectId ?? inboxProject.id }),
    updateTask: async (_ref, patch) => taskFixture(patch),
    completeTask: async () => undefined,
    reopenTask: async () => undefined,
    moveTask: async (ref, targetProjectId) =>
      taskFixture({ ...ref, projectId: targetProjectId, projectName: workProject.name }),
    ...overrides,
  };
}

function scope(snapshotKey: string): TaskCacheScope {
  return { backendId: "mcp", accountKey, snapshotKey };
}

function seed(repository: TaskRepository, tasks: Task[]): void {
  for (const snapshotKey of ["all", "inbox"]) {
    repository.refresh(scope(snapshotKey), {
      tasks,
      projects: [inboxProject, workProject],
      fetchedAt: 1_000_000,
      failedProjectIds: [],
    });
  }
}

function taskIn(repository: TaskRepository, snapshotKey: string, task: Task): Task | undefined {
  return repository
    .peek(scope(snapshotKey))
    ?.tasks.find((candidate) => candidate.id === task.id && candidate.projectId === task.projectId);
}

describe("TaskMutationService", () => {
  it("exposes the backend identity required for mutation serialization", () => {
    const backend = backendFixture();
    const service = new TaskMutationService({ backend, repository: new TaskRepository(new InMemoryCachePort()) });

    expect(service.backendId).toBe("mcp");
  });

  it("updates complete and reopen optimistically in every cached snapshot, then keeps the successful status", async () => {
    const completeGate = deferred<void>();
    const reopenGate = deferred<void>();
    const completeTask = vi.fn<TickTickBackend["completeTask"]>().mockReturnValue(completeGate.promise);
    const reopenTask = vi.fn<TickTickBackend["reopenTask"]>().mockReturnValue(reopenGate.promise);
    const backend = backendFixture({ completeTask, reopenTask });
    const repository = new TaskRepository(new InMemoryCachePort(), () => 1_000_000);
    const original = taskFixture({
      id: "optimistic",
      tags: ["before"],
      items: [{ id: "item", title: "Keep exactly", status: "open", sortOrder: 1 }],
    });
    seed(repository, [original]);
    const service = new TaskMutationService({ backend, repository });

    const completing = service.complete(accountKey, original);
    expect(taskIn(repository, "all", original)).toEqual({ ...original, status: "completed" });
    expect(taskIn(repository, "inbox", original)).toEqual({ ...original, status: "completed" });
    expect(completeTask).toHaveBeenCalledOnce();
    completeGate.resolve();
    await completing;
    expect(taskIn(repository, "all", original)?.status).toBe("completed");

    const completed = { ...original, status: "completed" as const };
    const reopening = service.reopen(accountKey, completed);
    expect(taskIn(repository, "all", original)).toEqual(original);
    expect(taskIn(repository, "inbox", original)).toEqual(original);
    expect(reopenTask).toHaveBeenCalledOnce();
    reopenGate.resolve();
    await reopening;
    expect(taskIn(repository, "all", original)?.status).toBe("open");
  });

  it.each([
    ["complete", new NetworkError("synthetic complete failure")],
    ["reopen", new NetworkError("synthetic reopen failure")],
  ] as const)("restores the exact previous task when %s fails and never retries", async (operation, failure) => {
    const original = taskFixture({
      id: `rollback-${operation}`,
      status: operation === "complete" ? "open" : "completed",
      title: "Exact prior title",
      content: "Exact prior content",
      description: "Exact prior description",
      startDate: "2026-08-14T12:00:00Z",
      dueDate: "2026-08-15T12:00:00Z",
      priority: 5,
      tags: ["one", "two"],
      kind: "CHECKLIST",
      isAllDay: true,
      isFloating: true,
      timeZone: "America/Denver",
      items: [{ id: "item", title: "Exact item", status: "completed", sortOrder: 7 }],
      exactUrl: "https://ticktick.com/webapp/#p/project/task/rollback",
    });
    const backendMethod = vi.fn().mockRejectedValue(failure);
    const backend = backendFixture(
      operation === "complete" ? { completeTask: backendMethod } : { reopenTask: backendMethod }
    );
    const repository = new TaskRepository(new InMemoryCachePort());
    seed(repository, [original]);
    const service = new TaskMutationService({ backend, repository });

    const mutation =
      operation === "complete" ? service.complete(accountKey, original) : service.reopen(accountKey, original);

    await expect(mutation).rejects.toBe(failure);
    expect(taskIn(repository, "all", original)).toEqual(original);
    expect(taskIn(repository, "inbox", original)).toEqual(original);
    expect(backendMethod).toHaveBeenCalledOnce();
  });

  it("waits for the confirmed update before replacing any cached task", async () => {
    const gate = deferred<Task>();
    const updateTask = vi.fn<TickTickBackend["updateTask"]>().mockReturnValue(gate.promise);
    const backend = backendFixture({ updateTask });
    const repository = new TaskRepository(new InMemoryCachePort());
    const original = taskFixture({ id: "update-confirmed" });
    const confirmed = { ...original, title: "Server-confirmed title", tags: ["confirmed"] };
    seed(repository, [original]);
    const service = new TaskMutationService({ backend, repository });

    const updating = service.update(accountKey, original, { title: "Requested title" });
    expect(taskIn(repository, "all", original)).toEqual(original);
    expect(taskIn(repository, "inbox", original)).toEqual(original);
    gate.resolve(confirmed);

    await expect(updating).resolves.toEqual(confirmed);
    expect(taskIn(repository, "all", original)).toEqual(confirmed);
    expect(taskIn(repository, "inbox", original)).toEqual(confirmed);
    expect(updateTask).toHaveBeenCalledWith(
      { id: original.id, projectId: original.projectId },
      { title: "Requested title" }
    );
    expect(updateTask).toHaveBeenCalledOnce();
  });

  it("waits for the confirmed move, replaces the exact old composite ref, and invalidates Inbox", async () => {
    const gate = deferred<Task>();
    const moveTask = vi.fn<TickTickBackend["moveTask"]>().mockReturnValue(gate.promise);
    const backend = backendFixture({ moveTask });
    const repository = new TaskRepository(new InMemoryCachePort());
    const original = taskFixture({ id: "project-scoped-id", projectId: inboxProject.id });
    const colliding = taskFixture({
      id: original.id,
      projectId: "project-other",
      projectName: "Other",
      title: "Same ID, different project",
    });
    const confirmed = { ...original, projectId: workProject.id, projectName: workProject.name };
    seed(repository, [original, colliding]);
    const service = new TaskMutationService({ backend, repository });

    const moving = service.move(accountKey, original, workProject.id);
    expect(repository.peek(scope("all"))?.tasks).toEqual([original, colliding]);
    expect(repository.peek(scope("inbox"))?.tasks).toEqual([original, colliding]);
    gate.resolve(confirmed);

    await expect(moving).resolves.toEqual(confirmed);
    expect(repository.peek(scope("all"))?.tasks).toEqual([confirmed, colliding]);
    expect(repository.peek(scope("inbox"))).toBeUndefined();
    expect(moveTask).toHaveBeenCalledWith({ id: original.id, projectId: original.projectId }, workProject.id);
    expect(moveTask).toHaveBeenCalledOnce();
  });

  it.each(["complete", "reopen", "update", "move"] as const)(
    "removes an exact stale task and propagates NotFound from %s without retrying",
    async (operation) => {
      const stale = taskFixture({
        id: "stale-collision",
        projectId: operation === "reopen" ? workProject.id : inboxProject.id,
        projectName: operation === "reopen" ? workProject.name : inboxProject.name,
        status: operation === "reopen" ? "completed" : "open",
      });
      const sameIdOtherProject = taskFixture({
        id: stale.id,
        projectId: "project-other",
        projectName: "Other",
        title: "Must survive",
      });
      const failure = new NotFoundError("The task no longer exists.");
      const method = vi.fn().mockRejectedValue(failure);
      const backend = backendFixture({
        ...(operation === "complete" ? { completeTask: method } : {}),
        ...(operation === "reopen" ? { reopenTask: method } : {}),
        ...(operation === "update" ? { updateTask: method } : {}),
        ...(operation === "move" ? { moveTask: method } : {}),
      });
      const repository = new TaskRepository(new InMemoryCachePort());
      seed(repository, [stale, sameIdOtherProject]);
      const arbitraryScope = scope("project:stale");
      const collisionOnlyScope = scope("project:collision-only");
      repository.refresh(arbitraryScope, {
        tasks: [stale, sameIdOtherProject],
        projects: [inboxProject, workProject],
        fetchedAt: 1_000_000,
        failedProjectIds: [],
      });
      repository.refresh(collisionOnlyScope, {
        tasks: [sameIdOtherProject],
        projects: [inboxProject, workProject],
        fetchedAt: 1_000_000,
        failedProjectIds: [],
      });
      const removeTask = vi.spyOn(repository, "removeTask");
      const invalidateTaskSnapshots = vi.spyOn(repository, "invalidateTaskSnapshots");
      const service = new TaskMutationService({ backend, repository });

      const mutation =
        operation === "complete"
          ? service.complete(accountKey, stale)
          : operation === "reopen"
          ? service.reopen(accountKey, stale)
          : operation === "update"
          ? service.update(accountKey, stale, { title: "Never confirmed" })
          : service.move(accountKey, stale, workProject.id);

      await expect(mutation).rejects.toBe(failure);
      for (const snapshotKey of ["all", "inbox"]) {
        expect(repository.peek(scope(snapshotKey))).toBeUndefined();
      }
      expect(repository.peek(arbitraryScope)).toBeUndefined();
      expect(repository.peek(collisionOnlyScope)?.tasks).toEqual([sameIdOtherProject]);
      expect(removeTask).toHaveBeenCalledWith("mcp", accountKey, {
        id: stale.id,
        projectId: stale.projectId,
      });
      expect(removeTask).toHaveBeenCalledOnce();
      expect(invalidateTaskSnapshots).toHaveBeenCalledWith("mcp", accountKey, {
        id: stale.id,
        projectId: stale.projectId,
      });
      expect(invalidateTaskSnapshots).toHaveBeenCalledOnce();
      expect(method).toHaveBeenCalledOnce();
    }
  );

  it.each(["complete", "reopen", "update", "move"] as const)(
    "invalidates every containing snapshot after an ambiguous %s outcome and never retries",
    async (operation) => {
      const failure = new AmbiguousMutationError("The task update outcome is unknown.");
      const method = vi.fn().mockRejectedValue(failure);
      const backend = backendFixture({
        ...(operation === "complete" ? { completeTask: method } : {}),
        ...(operation === "reopen" ? { reopenTask: method } : {}),
        ...(operation === "update" ? { updateTask: method } : {}),
        ...(operation === "move" ? { moveTask: method } : {}),
      });
      const repository = new TaskRepository(new InMemoryCachePort());
      const original = taskFixture({ id: "ambiguous", status: operation === "reopen" ? "completed" : "open" });
      seed(repository, [original]);
      const arbitraryScope = scope("future:arbitrary");
      repository.refresh(arbitraryScope, {
        tasks: [original],
        projects: [inboxProject, workProject],
        fetchedAt: 1_000_000,
        failedProjectIds: [],
      });
      const service = new TaskMutationService({ backend, repository });

      const mutation =
        operation === "complete"
          ? service.complete(accountKey, original)
          : operation === "reopen"
          ? service.reopen(accountKey, original)
          : operation === "update"
          ? service.update(accountKey, original, { title: "Unknown" })
          : service.move(accountKey, original, workProject.id);

      await expect(mutation).rejects.toBe(failure);
      expect(repository.peek(scope("all"))).toBeUndefined();
      expect(repository.peek(scope("inbox"))).toBeUndefined();
      expect(repository.peek(arbitraryScope)).toBeUndefined();
      expect(method).toHaveBeenCalledOnce();
    }
  );

  it.each([
    ["complete", "complete"],
    ["reopen", "reopen"],
    ["update", "update"],
    ["move", "move"],
  ] as const)("guards the %s capability before invoking the backend", async (operation, capability) => {
    const completeTask = vi.fn<TickTickBackend["completeTask"]>();
    const reopenTask = vi.fn<TickTickBackend["reopenTask"]>();
    const updateTask = vi.fn<TickTickBackend["updateTask"]>();
    const moveTask = vi.fn<TickTickBackend["moveTask"]>();
    const backend = backendFixture({
      capabilities: () => ({
        create: true,
        update: capability !== "update",
        complete: capability !== "complete",
        reopen: capability !== "reopen",
        move: capability !== "move",
        completedQuery: true,
        inboxQuery: true,
        exactTaskLink: true,
      }),
      completeTask,
      reopenTask,
      updateTask,
      moveTask,
    });
    const repository = new TaskRepository(new InMemoryCachePort());
    const original = taskFixture({ status: operation === "reopen" ? "completed" : "open" });
    seed(repository, [original]);
    const service = new TaskMutationService({ backend, repository });

    const mutation =
      operation === "complete"
        ? service.complete(accountKey, original)
        : operation === "reopen"
        ? service.reopen(accountKey, original)
        : operation === "update"
        ? service.update(accountKey, original, { title: "Blocked" })
        : service.move(accountKey, original, workProject.id);

    await expect(mutation).rejects.toBeInstanceOf(ProtocolError);
    expect(completeTask).not.toHaveBeenCalled();
    expect(reopenTask).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
    expect(moveTask).not.toHaveBeenCalled();
    expect(repository.peek(scope("all"))?.tasks).toEqual([original]);
    expect(repository.peek(scope("inbox"))?.tasks).toEqual([original]);
  });
});
