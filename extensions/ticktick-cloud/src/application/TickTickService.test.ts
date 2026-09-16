import { describe, expect, it, vi } from "vitest";

import { NetworkError, ProtocolError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository, type TaskCacheScope, type TaskSnapshot } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { inboxProject, taskFixture, workProject } from "../test/fixtures/tasks";
import { selectInbox, searchTasks } from "./taskSelectors";
import { selectNext7Days, selectToday } from "./taskSections";
import { TickTickService, type TaskSelectorSet } from "./TickTickService";
import type { TaskViewQuery } from "./viewQuery";

const accountKey = "oauth:00000000-0000-4000-8000-000000000001";
const initialNow = Date.parse("2026-08-14T18:00:00.000Z");
const todayTask = taskFixture({ id: "today", dueDate: "2026-08-14T15:00:00-06:00" });
const tomorrowTask = taskFixture({ id: "tomorrow", title: "Tomorrow", dueDate: "2026-08-15T15:00:00-06:00" });
const closedProject: Project = { id: "project-closed", name: "Closed", kind: "project", closed: true };

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve(value: Value): void;
}

function deferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
}

const queries = {
  today: { view: "today", status: "open" },
  next7Days: { view: "next7Days", status: "open" },
  inbox: { view: "inbox", status: "open" },
  search: { view: "search", status: "open" },
} satisfies Record<TaskViewQuery["view"], TaskViewQuery>;

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
    queryTasks: async () => ({ tasks: [todayTask, tomorrowTask], failedProjectIds: [] }),
    createTask: async (input) => taskFixture({ ...input, projectId: input.projectId ?? inboxProject.id }),
    updateTask: async (_ref, patch) => taskFixture(patch),
    completeTask: async () => undefined,
    reopenTask: async () => undefined,
    moveTask: async (_ref, targetProjectId) => taskFixture({ projectId: targetProjectId }),
    ...overrides,
  };
}

function allScope(backend: TickTickBackend = backendFixture()): TaskCacheScope {
  return { backendId: backend.id, accountKey, snapshotKey: "all" };
}

function snapshot(fetchedAt: number, overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    projects: [inboxProject, workProject],
    tasks: [todayTask, tomorrowTask],
    fetchedAt,
    failedProjectIds: [],
    ...overrides,
  };
}

function serviceFixture(
  backend: TickTickBackend,
  repository: TaskRepository,
  now: () => number,
  overrides: Partial<ConstructorParameters<typeof TickTickService>[0]> = {}
): TickTickService {
  return new TickTickService({
    backend,
    repository,
    now,
    timeZone: () => "America/Denver",
    sleep: async () => undefined,
    ...overrides,
  });
}

describe("TickTickService", () => {
  it("uses a backend/account-scoped cache through the inclusive 60-second freshness boundary", async () => {
    let now = initialNow;
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockRejectedValue(new Error("must stay offline"));
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockRejectedValue(new Error("must stay offline"));
    const backend = backendFixture({ listProjects, queryTasks });
    repository.refresh(allScope(backend), snapshot(now));
    now += 60_000;

    const result = await serviceFixture(backend, repository, () => now).query(accountKey, {
      ...queries.search,
      searchText: "tomorrow",
    });

    expect(result).toMatchObject({ freshness: "fresh", fetchedAt: initialNow, tasks: [{ id: "tomorrow" }] });
    expect(listProjects).not.toHaveBeenCalled();
    expect(queryTasks).not.toHaveBeenCalled();
  });

  it("refreshes a snapshot after 60 seconds and hydrates projects before every task page", async () => {
    let now = initialNow;
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    const refreshedTask = taskFixture({ id: "refreshed", title: "Refreshed" });
    const listProjects = vi
      .fn<TickTickBackend["listProjects"]>()
      .mockResolvedValue([inboxProject, workProject, closedProject]);
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockResolvedValue({ tasks: [refreshedTask], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    repository.refresh(allScope(backend), snapshot(now));
    now += 60_001;

    const service = serviceFixture(backend, repository, () => now);
    const stale = await service.query(accountKey, queries.search);
    const result = await service.query(accountKey, queries.search, true);

    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
    const hydrationSignal = listProjects.mock.calls[0][0];
    expect(queryTasks).toHaveBeenCalledWith(
      { scope: "snapshot", status: "all", projectIds: [inboxProject.id, workProject.id, closedProject.id] },
      hydrationSignal
    );
    expect(listProjects.mock.invocationCallOrder[0]).toBeLessThan(queryTasks.mock.invocationCallOrder[0]);
    expect(stale).toMatchObject({ freshness: "stale", tasks: [todayTask, tomorrowTask] });
    expect(result).toMatchObject({ freshness: "fresh", fetchedAt: now, tasks: [refreshedTask] });
  });

  it("forces a refresh even while the cached snapshot is fresh", async () => {
    const now = () => initialNow;
    const repository = new TaskRepository(new InMemoryCachePort(), now);
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockResolvedValue([inboxProject]);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockResolvedValue({ tasks: [], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    repository.refresh(allScope(backend), snapshot(initialNow));

    const result = await serviceFixture(backend, repository, now).query(accountKey, queries.search, true);

    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
    expect(result.tasks).toEqual([]);
  });

  it("returns stale cached data indefinitely when refresh fails", async () => {
    let now = initialNow;
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    const failure = new ProtocolError("synthetic refresh failure");
    const backend = backendFixture({ listProjects: vi.fn().mockRejectedValue(failure) });
    repository.refresh(allScope(backend), snapshot(now));
    now += 61_000;

    const result = await serviceFixture(backend, repository, () => now).query(accountKey, queries.search, true);

    expect(result).toMatchObject({ freshness: "stale", fetchedAt: initialNow, tasks: [todayTask, tomorrowTask] });
    expect(result.warning).toMatch(/cached/i);
  });

  it("marks a failed forced refresh stale even when the fallback cache is younger than 60 seconds", async () => {
    const now = () => initialNow;
    const repository = new TaskRepository(new InMemoryCachePort(), now);
    const backend = backendFixture({ listProjects: vi.fn().mockRejectedValue(new ProtocolError("offline")) });
    repository.refresh(allScope(backend), snapshot(initialNow));

    const result = await serviceFixture(backend, repository, now).query(accountKey, queries.search, true);

    expect(result.freshness).toBe("stale");
    expect(result.warning).toMatch(/cached/i);
  });

  it("throws the refresh failure when no cached snapshot exists", async () => {
    const failure = new ProtocolError("synthetic refresh failure");
    const backend = backendFixture({ listProjects: vi.fn().mockRejectedValue(failure) });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);

    await expect(serviceFixture(backend, repository, () => initialNow).query(accountKey, queries.search)).rejects.toBe(
      failure
    );
  });

  it("retains cached tasks for failed projects and reports the partial project IDs", async () => {
    let now = initialNow;
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    const failedProjectTask = taskFixture({
      id: "failed-project-task",
      projectId: workProject.id,
      projectName: workProject.name,
    });
    const updatedInboxTask = taskFixture({ id: "updated-inbox", title: "Updated inbox" });
    const backend = backendFixture({
      listProjects: vi.fn().mockResolvedValue([inboxProject]),
      queryTasks: vi.fn().mockResolvedValue({ tasks: [updatedInboxTask], failedProjectIds: [workProject.id] }),
    });
    repository.refresh(
      allScope(backend),
      snapshot(now, { tasks: [todayTask, failedProjectTask], projects: [inboxProject, workProject] })
    );
    now += 60_001;

    const result = await serviceFixture(backend, repository, () => now).query(accountKey, queries.search, true);

    expect(result).toMatchObject({
      tasks: [updatedInboxTask, failedProjectTask],
      projects: [inboxProject, workProject],
      freshness: "fresh",
      isPartial: true,
      failedProjectIds: [workProject.id],
    });
    expect(result.warning).toMatch(/some projects/i);
  });

  it("forwards one service-owned AbortSignal through project and task hydration", async () => {
    const controller = new AbortController();
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockResolvedValue([inboxProject]);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockResolvedValue({ tasks: [], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);

    await serviceFixture(backend, repository, () => initialNow).query(
      accountKey,
      queries.search,
      false,
      controller.signal
    );

    const hydrationSignal = listProjects.mock.calls[0][0];
    expect(hydrationSignal).toBeInstanceOf(AbortSignal);
    expect(hydrationSignal).not.toBe(controller.signal);
    expect(queryTasks).toHaveBeenCalledWith(expect.any(Object), hydrationSignal);
  });

  it("applies only the selector for the requested view, exactly once", async () => {
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const backend = backendFixture();
    repository.refresh(allScope(backend), snapshot(initialNow));
    const selectors: TaskSelectorSet = {
      selectToday: vi.fn(selectToday),
      selectNext7Days: vi.fn(selectNext7Days),
      selectInbox: vi.fn(selectInbox),
      searchTasks: vi.fn(searchTasks),
    };

    await serviceFixture(backend, repository, () => initialNow, { selectors }).query(accountKey, queries.today);

    expect(selectors.selectToday).toHaveBeenCalledOnce();
    expect(selectors.selectNext7Days).not.toHaveBeenCalled();
    expect(selectors.selectInbox).not.toHaveBeenCalled();
    expect(selectors.searchTasks).not.toHaveBeenCalled();
  });

  it("filters each search edit locally without another backend request", async () => {
    const needle = taskFixture({ id: "needle", title: "Needle" });
    const haystack = taskFixture({ id: "haystack", title: "Haystack" });
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockResolvedValue([inboxProject]);
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockResolvedValue({ tasks: [needle, haystack], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);

    const first = await service.query(accountKey, { ...queries.search, searchText: "needle" });
    const second = await service.query(accountKey, { ...queries.search, searchText: "hay" });

    expect(first.tasks).toEqual([needle]);
    expect(second.tasks).toEqual([haystack]);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
  });

  it("coalesces concurrent cold search edits into one hydration and selects each result locally", async () => {
    const projects = deferred<Project[]>();
    const taskResult = deferred<{ tasks: Task[]; failedProjectIds: string[] }>();
    const needle = taskFixture({ id: "needle", title: "Needle" });
    const haystack = taskFixture({ id: "haystack", title: "Haystack" });
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockReturnValue(projects.promise);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockReturnValue(taskResult.promise);
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);
    const signal = new AbortController().signal;

    const first = service.query(accountKey, { ...queries.search, searchText: "needle" }, false, signal);
    const second = service.query(accountKey, { ...queries.search, searchText: "hay" }, false, signal);
    await flushMicrotasks();

    expect(listProjects).toHaveBeenCalledOnce();
    projects.resolve([inboxProject]);
    await flushMicrotasks();
    expect(queryTasks).toHaveBeenCalledOnce();
    taskResult.resolve({ tasks: [needle, haystack], failedProjectIds: [] });

    await expect(first).resolves.toMatchObject({ tasks: [needle] });
    await expect(second).resolves.toMatchObject({ tasks: [haystack] });
  });

  it("lets distinct consumers share hydration while one consumer aborts independently", async () => {
    const projects = deferred<Project[]>();
    let backendSignal: AbortSignal | undefined;
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockImplementation((signal) => {
      backendSignal = signal;
      return projects.promise;
    });
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockResolvedValue({ tasks: [todayTask], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);
    const firstController = new AbortController();
    const secondController = new AbortController();

    const first = service.query(accountKey, queries.search, false, firstController.signal);
    const second = service.query(accountKey, queries.search, false, secondController.signal);
    await flushMicrotasks();
    expect(listProjects).toHaveBeenCalledOnce();
    expect(backendSignal).not.toBe(firstController.signal);
    expect(backendSignal).not.toBe(secondController.signal);

    firstController.abort();
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    expect(backendSignal?.aborted).toBe(false);

    projects.resolve([inboxProject]);
    await expect(second).resolves.toMatchObject({ tasks: [todayTask] });
    expect(queryTasks).toHaveBeenCalledOnce();
    expect(repository.peek(allScope(backend))?.tasks).toEqual([todayTask]);
  });

  it("cancels service-owned hydration when every consumer has aborted", async () => {
    const projects = deferred<Project[]>();
    let backendSignal: AbortSignal | undefined;
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockImplementation((signal) => {
      backendSignal = signal;
      return projects.promise;
    });
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockResolvedValue({ tasks: [todayTask], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);
    const firstController = new AbortController();
    const secondController = new AbortController();

    const first = service.query(accountKey, queries.search, false, firstController.signal);
    const second = service.query(accountKey, queries.search, false, secondController.signal);
    await flushMicrotasks();
    firstController.abort();
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    expect(backendSignal?.aborted).toBe(false);

    secondController.abort();
    await expect(second).rejects.toMatchObject({ name: "AbortError" });
    expect(backendSignal?.aborted).toBe(true);

    projects.resolve([inboxProject]);
    await flushMicrotasks();
    expect(queryTasks).not.toHaveBeenCalled();
    expect(repository.peek(allScope(backend))).toBeUndefined();
  });

  it("returns stale data immediately while a forced read joins one background revalidation", async () => {
    let now = initialNow;
    const projects = deferred<Project[]>();
    const taskResult = deferred<{ tasks: Task[]; failedProjectIds: string[] }>();
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockReturnValue(projects.promise);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockReturnValue(taskResult.promise);
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    repository.refresh(allScope(backend), snapshot(now));
    now += 60_001;
    const service = serviceFixture(backend, repository, () => now);
    let stale: Awaited<ReturnType<TickTickService["query"]>> | undefined;

    void service.query(accountKey, { ...queries.search, searchText: "tomorrow" }).then((result) => {
      stale = result;
    });
    await flushMicrotasks();

    expect(stale).toMatchObject({ freshness: "stale", tasks: [tomorrowTask] });
    expect(listProjects).toHaveBeenCalledOnce();

    const refreshed = service.query(accountKey, { ...queries.search, searchText: "fresh" }, true);
    await flushMicrotasks();
    expect(listProjects).toHaveBeenCalledOnce();

    const freshTask = taskFixture({ id: "fresh", title: "Fresh" });
    projects.resolve([inboxProject]);
    await flushMicrotasks();
    expect(queryTasks).toHaveBeenCalledOnce();
    taskResult.resolve({ tasks: [freshTask], failedProjectIds: [] });
    await expect(refreshed).resolves.toMatchObject({ freshness: "fresh", tasks: [freshTask] });
  });

  it("makes a fresh-cache query join an in-flight forced refresh before applying its latest filter", async () => {
    const projects = deferred<Project[]>();
    const taskResult = deferred<{ tasks: Task[]; failedProjectIds: string[] }>();
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockReturnValue(projects.promise);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockReturnValue(taskResult.promise);
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    repository.refresh(allScope(backend), snapshot(initialNow));
    const service = serviceFixture(backend, repository, () => initialNow);
    const force = service.query(accountKey, queries.search, true, new AbortController().signal);
    await flushMicrotasks();
    let latest: Awaited<ReturnType<TickTickService["query"]>> | undefined;

    expect(service.peek(accountKey, { ...queries.search, searchText: "tomorrow" })).toMatchObject({
      freshness: "fresh",
      tasks: [tomorrowTask],
    });

    void service
      .query(accountKey, { ...queries.search, searchText: "fresh" }, false, new AbortController().signal)
      .then((result) => {
        latest = result;
      });
    await flushMicrotasks();

    expect(latest).toBeUndefined();
    expect(listProjects).toHaveBeenCalledOnce();
    projects.resolve([inboxProject]);
    await flushMicrotasks();
    const freshTask = taskFixture({ id: "fresh-filtered", title: "Fresh result" });
    taskResult.resolve({ tasks: [freshTask], failedProjectIds: [] });

    await expect(force).resolves.toMatchObject({ freshness: "fresh" });
    await flushMicrotasks();
    expect(latest).toMatchObject({ freshness: "fresh", tasks: [freshTask] });
    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
  });

  it("stops after project hydration when the request is aborted", async () => {
    const controller = new AbortController();
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockImplementation(async () => {
      controller.abort();
      return [inboxProject];
    });
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockResolvedValue({ tasks: [todayTask], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);

    await expect(
      serviceFixture(backend, repository, () => initialNow).query(accountKey, queries.search, false, controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(queryTasks).not.toHaveBeenCalled();
    expect(repository.peek(allScope(backend))).toBeUndefined();
  });

  it("checks abort again before committing hydrated tasks to cache", async () => {
    const controller = new AbortController();
    const backend = backendFixture({
      queryTasks: vi.fn().mockImplementation(async () => {
        controller.abort();
        return { tasks: [todayTask], failedProjectIds: [] };
      }),
    });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);

    await expect(
      serviceFixture(backend, repository, () => initialNow).query(accountKey, queries.search, false, controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(repository.peek(allScope(backend))).toBeUndefined();
  });

  it("prevents an older ignored-abort hydration from overwriting a newer scope generation", async () => {
    const oldProjects = deferred<Project[]>();
    const oldTask = taskFixture({ id: "old", title: "Old" });
    const newTask = taskFixture({ id: "new", title: "New" });
    const listProjects = vi
      .fn<TickTickBackend["listProjects"]>()
      .mockReturnValueOnce(oldProjects.promise)
      .mockResolvedValueOnce([inboxProject]);
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockResolvedValueOnce({ tasks: [newTask], failedProjectIds: [] })
      .mockResolvedValueOnce({ tasks: [oldTask], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);
    const oldController = new AbortController();
    const newController = new AbortController();

    const oldRead = service.query(accountKey, queries.search, false, oldController.signal);
    await flushMicrotasks();
    oldController.abort();
    const newRead = service.query(accountKey, queries.search, false, newController.signal);
    await expect(newRead).resolves.toMatchObject({ tasks: [newTask] });

    oldProjects.resolve([workProject]);
    await expect(oldRead).rejects.toMatchObject({ name: "AbortError" });
    expect(repository.peek(allScope(backend))?.tasks).toEqual([newTask]);
  });

  it("makes a 15-minute pending refresh prominent without claiming it failed", async () => {
    let now = initialNow;
    const projects = deferred<Project[]>();
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    const backend = backendFixture({ listProjects: vi.fn().mockReturnValue(projects.promise) });
    repository.refresh(allScope(backend), snapshot(now));
    now += 900_000;

    const result = await serviceFixture(backend, repository, () => now).query(accountKey, queries.search);

    expect(result.freshness).toBe("stale");
    expect(result.warning).toMatch(/^Warning:/);
    expect(result.warning).toMatch(/15 minutes/i);
    expect(result.warning).toMatch(/refresh/i);
    expect(result.warning).not.toMatch(/failed/i);

    projects.resolve([inboxProject]);
    await flushMicrotasks();
  });

  it("reserves the 15-minute refresh-failed warning for a confirmed failure", async () => {
    let now = initialNow;
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    const backend = backendFixture({ listProjects: vi.fn().mockRejectedValue(new ProtocolError("offline")) });
    repository.refresh(allScope(backend), snapshot(now));
    now += 900_000;

    const result = await serviceFixture(backend, repository, () => now).query(accountKey, queries.search, true);

    expect(result.freshness).toBe("stale");
    expect(result.warning).toMatch(/^Warning:/);
    expect(result.warning).toMatch(/because refresh failed/i);
  });

  it("uses Project.kind for Inbox and never substitutes a project merely named Inbox", async () => {
    const fakeInbox: Project = { id: "not-inbox", name: "Inbox", kind: "project", closed: false };
    const backend = backendFixture({
      capabilities: () => ({
        create: true,
        update: true,
        complete: true,
        reopen: true,
        move: true,
        completedQuery: true,
        inboxQuery: false,
        exactTaskLink: true,
      }),
    });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    repository.refresh(
      allScope(backend),
      snapshot(initialNow, {
        projects: [fakeInbox],
        tasks: [taskFixture({ projectId: fakeInbox.id, projectName: fakeInbox.name })],
      })
    );
    const service = serviceFixture(backend, repository, () => initialNow);

    await expect(service.query(accountKey, queries.inbox)).rejects.toMatchObject({
      name: "ProtocolError",
      code: "protocol",
    });
    await expect(service.query(accountKey, queries.today)).resolves.toBeDefined();
  });

  it("uses and caches the explicit Inbox query when Inbox is not exposed as a project", async () => {
    const inboxTask = taskFixture({ id: "fallback-inbox" });
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockImplementation(async (query) =>
        query.scope === "inbox"
          ? { tasks: [inboxTask], failedProjectIds: [] }
          : { tasks: [tomorrowTask], failedProjectIds: [] }
      );
    const backend = backendFixture({ listProjects: vi.fn().mockResolvedValue([workProject]), queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);

    const first = await service.query(accountKey, queries.inbox);
    const second = await service.query(accountKey, { ...queries.inbox, status: "all" });

    expect(first.tasks).toEqual([inboxTask]);
    expect(second.tasks).toEqual([inboxTask]);
    expect(queryTasks.mock.calls.map(([query]) => query.scope)).toEqual(["snapshot", "inbox"]);
    expect(queryTasks.mock.calls[1][0]).toEqual({ scope: "inbox", status: "all" });
  });

  it("returns non-closed projects and the real Inbox from the shared snapshot", async () => {
    const actualInbox = { ...inboxProject, name: "Unfiled" };
    const listProjects = vi
      .fn<TickTickBackend["listProjects"]>()
      .mockResolvedValue([workProject, closedProject, actualInbox]);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockResolvedValue({ tasks: [], failedProjectIds: [] });
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);

    const first = await service.listProjects(accountKey);
    const second = await service.listProjects(accountKey);

    expect(first).toEqual([workProject, actualInbox]);
    expect(second).toEqual(first);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
  });

  it("rejects project lists that omit authoritative Inbox metadata even when direct Inbox reads exist", async () => {
    const backend = backendFixture({ listProjects: vi.fn().mockResolvedValue([workProject]) });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);

    await expect(serviceFixture(backend, repository, () => initialNow).listProjects(accountKey)).rejects.toMatchObject({
      name: "ProtocolError",
      code: "protocol",
      message: expect.stringMatching(/Inbox project metadata/i),
    });
  });

  it("uses an open snapshot and rejects completed filters when the backend cannot query completed tasks", async () => {
    const queryTasks = vi
      .fn<TickTickBackend["queryTasks"]>()
      .mockResolvedValue({ tasks: [todayTask], failedProjectIds: [] });
    const backend = backendFixture({
      capabilities: () => ({
        create: true,
        update: true,
        complete: true,
        reopen: false,
        move: true,
        completedQuery: false,
        inboxQuery: true,
        exactTaskLink: true,
      }),
      queryTasks,
    });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);
    const service = serviceFixture(backend, repository, () => initialNow);

    await expect(service.query(accountKey, queries.search)).resolves.toMatchObject({ tasks: [todayTask] });
    expect(queryTasks).toHaveBeenCalledWith(
      { scope: "snapshot", status: "open", projectIds: [inboxProject.id, workProject.id] },
      expect.any(AbortSignal)
    );
    await expect(service.query(accountKey, { ...queries.search, status: "completed" })).rejects.toMatchObject({
      name: "ProtocolError",
      code: "protocol",
    });
    await expect(service.query(accountKey, { ...queries.search, status: "all" })).rejects.toMatchObject({
      name: "ProtocolError",
      code: "protocol",
    });
    expect(queryTasks).toHaveBeenCalledOnce();
  });

  it("retries retryable hydration reads once without applying mutation semantics", async () => {
    const listProjects = vi
      .fn<TickTickBackend["listProjects"]>()
      .mockRejectedValueOnce(new NetworkError("temporary"))
      .mockResolvedValue([inboxProject]);
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
    const backend = backendFixture({ listProjects });
    const repository = new TaskRepository(new InMemoryCachePort(), () => initialNow);

    await serviceFixture(backend, repository, () => initialNow, { sleep }).query(accountKey, queries.search);

    expect(listProjects).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });
});
