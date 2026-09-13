import { ProtocolError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import type { CachedTaskState, TaskCacheScope, TaskRepository } from "../infrastructure/cache/TaskRepository";
import { executeRead, throwIfAborted } from "./readPolicy";
import { selectInbox, searchTasks } from "./taskSelectors";
import { selectNext7Days, selectToday } from "./taskSections";
import type { TaskViewQuery, SelectionContext, TaskSection } from "./viewQuery";

export interface TaskReadModel {
  projects: Project[];
  tasks: Task[];
  sections: TaskSection[];
  freshness: "fresh" | "stale";
  fetchedAt: number;
  isPartial: boolean;
  failedProjectIds: string[];
  warning?: string;
}

export interface TaskSelectorSet {
  selectToday(tasks: Task[], context: SelectionContext): TaskSection[];
  selectNext7Days(tasks: Task[], context: SelectionContext): TaskSection[];
  selectInbox(tasks: Task[], projects: Project[], status: TaskViewQuery["status"]): Task[];
  searchTasks(tasks: Task[], query: TaskViewQuery): Task[];
}

export interface TickTickServiceDependencies {
  backend: TickTickBackend;
  repository: TaskRepository;
  now?: () => number;
  timeZone?: () => string;
  sleep?: (ms: number) => Promise<void>;
  selectors?: TaskSelectorSet;
}

interface SnapshotRead {
  state: CachedTaskState;
  refreshFailed: boolean;
}

interface InFlightHydration {
  generation: number;
  controller: AbortController;
  consumers: Set<symbol>;
  promise: Promise<CachedTaskState>;
}

const defaultSelectors: TaskSelectorSet = { selectToday, selectNext7Days, selectInbox, searchTasks };

async function defaultSleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class TickTickService {
  private readonly backend: TickTickBackend;
  private readonly repository: TaskRepository;
  private readonly now: () => number;
  private readonly timeZone: () => string;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly selectors: TaskSelectorSet;
  private readonly hydrations = new Map<string, InFlightHydration>();
  private readonly hydrationGenerations = new Map<string, number>();

  constructor(dependencies: TickTickServiceDependencies) {
    this.backend = dependencies.backend;
    this.repository = dependencies.repository;
    this.now = dependencies.now ?? Date.now;
    this.timeZone = dependencies.timeZone ?? (() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    this.sleep = dependencies.sleep ?? defaultSleep;
    this.selectors = dependencies.selectors ?? defaultSelectors;
  }

  peek(accountKey: string, viewQuery: TaskViewQuery): TaskReadModel | undefined {
    if (!this.backend.capabilities().completedQuery && viewQuery.status !== "open") return undefined;

    const all = this.repository.peek(this.scope(accountKey, "all"));
    if (!all) return undefined;

    if (viewQuery.view === "inbox" && !all.projects.some((project) => project.kind === "inbox")) {
      if (!this.backend.capabilities().inboxQuery) return undefined;
      const inbox = this.repository.peek(this.scope(accountKey, "inbox"));
      if (!inbox) return undefined;

      const localQuery: TaskViewQuery = { view: "search", status: viewQuery.status };
      const tasks = this.selectors.searchTasks(inbox.tasks, localQuery);
      return this.createModel(
        {
          state: {
            ...inbox,
            projects: all.projects,
            fetchedAt: Math.min(all.fetchedAt, inbox.fetchedAt),
            failedProjectIds: [...new Set([...all.failedProjectIds, ...inbox.failedProjectIds])],
          },
          refreshFailed: false,
        },
        tasks,
        singleSection("inbox", "Inbox", tasks)
      );
    }

    const selection = this.selectTasks(all, viewQuery);
    return this.createModel({ state: all, refreshFailed: false }, selection.tasks, selection.sections);
  }

  async query(
    accountKey: string,
    viewQuery: TaskViewQuery,
    force = false,
    signal?: AbortSignal
  ): Promise<TaskReadModel> {
    throwIfAborted(signal);
    if (!this.backend.capabilities().completedQuery && viewQuery.status !== "open") {
      throw new ProtocolError("This TickTick backend cannot query completed tasks.");
    }

    const all = await this.readAllSnapshot(accountKey, force, signal);
    throwIfAborted(signal);

    if (viewQuery.view === "inbox" && !all.state.projects.some((project) => project.kind === "inbox")) {
      if (!this.backend.capabilities().inboxQuery) {
        throw new ProtocolError("This TickTick backend does not expose Inbox tasks.");
      }

      const inbox = await this.readInboxSnapshot(accountKey, all.state.projects, force, signal);
      throwIfAborted(signal);
      const localQuery: TaskViewQuery = { view: "search", status: viewQuery.status };
      const tasks = this.selectors.searchTasks(inbox.state.tasks, localQuery);
      return this.createModel(
        {
          ...inbox,
          state: {
            ...inbox.state,
            projects: all.state.projects,
            fetchedAt: Math.min(all.state.fetchedAt, inbox.state.fetchedAt),
            failedProjectIds: [...new Set([...all.state.failedProjectIds, ...inbox.state.failedProjectIds])],
          },
          refreshFailed: all.refreshFailed || inbox.refreshFailed,
        },
        tasks,
        singleSection("inbox", "Inbox", tasks)
      );
    }

    const selection = this.selectTasks(all.state, viewQuery);
    return this.createModel(all, selection.tasks, selection.sections);
  }

  async listProjects(accountKey: string, force = false, signal?: AbortSignal): Promise<Project[]> {
    const snapshot = await this.readAllSnapshot(accountKey, force, signal);
    throwIfAborted(signal);
    const projects = snapshot.state.projects.filter((project) => !project.closed);
    if (!projects.some((project) => project.kind === "inbox")) {
      throw new ProtocolError("This TickTick backend does not expose authoritative Inbox project metadata.");
    }
    return projects;
  }

  private async readAllSnapshot(accountKey: string, force: boolean, signal?: AbortSignal): Promise<SnapshotRead> {
    throwIfAborted(signal);
    const scope = this.scope(accountKey, "all");
    const cached = this.repository.peek(scope);
    const hydrationInFlight = this.hasActiveHydration(scope);
    if (cached?.freshness === "fresh" && !force && !hydrationInFlight) {
      return { state: cached, refreshFailed: false };
    }

    if (cached?.freshness === "stale" && !force && !hydrationInFlight) {
      void this.refreshAllSnapshot(scope, signal).catch(() => undefined);
      return { state: cached, refreshFailed: false };
    }

    try {
      const state = await this.refreshAllSnapshot(scope, signal);
      throwIfAborted(signal);
      return { state, refreshFailed: false };
    } catch (error) {
      throwIfAborted(signal);
      if (isAbortError(error)) throw error;
      if (cached) return { state: cached, refreshFailed: true };
      throw error;
    }
  }

  private refreshAllSnapshot(scope: TaskCacheScope, signal?: AbortSignal): Promise<CachedTaskState> {
    return this.coalesceHydration(scope, signal, async (generation, hydrationSignal) => {
      const projects = await executeRead(() => this.backend.listProjects(hydrationSignal), this.sleep, hydrationSignal);
      throwIfAborted(hydrationSignal);
      const taskResult = await executeRead(
        () =>
          this.backend.queryTasks(
            {
              scope: "snapshot",
              status: this.backend.capabilities().completedQuery ? "all" : "open",
              projectIds: projects.map((project) => project.id),
            },
            hydrationSignal
          ),
        this.sleep,
        hydrationSignal
      );
      this.assertHydrationCanCommit(scope, generation, hydrationSignal);
      return this.repository.refresh(scope, {
        projects,
        tasks: taskResult.tasks,
        fetchedAt: this.now(),
        failedProjectIds: taskResult.failedProjectIds,
      });
    });
  }

  private async readInboxSnapshot(
    accountKey: string,
    projects: Project[],
    force: boolean,
    signal?: AbortSignal
  ): Promise<SnapshotRead> {
    throwIfAborted(signal);
    const scope = this.scope(accountKey, "inbox");
    const cached = this.repository.peek(scope);
    const hydrationInFlight = this.hasActiveHydration(scope);
    if (cached?.freshness === "fresh" && !force && !hydrationInFlight) {
      return { state: cached, refreshFailed: false };
    }

    if (cached?.freshness === "stale" && !force && !hydrationInFlight) {
      void this.refreshInboxSnapshot(scope, projects, signal).catch(() => undefined);
      return { state: cached, refreshFailed: false };
    }

    try {
      const state = await this.refreshInboxSnapshot(scope, projects, signal);
      throwIfAborted(signal);
      return { state, refreshFailed: false };
    } catch (error) {
      throwIfAborted(signal);
      if (isAbortError(error)) throw error;
      if (cached) return { state: cached, refreshFailed: true };
      throw error;
    }
  }

  private refreshInboxSnapshot(
    scope: TaskCacheScope,
    projects: Project[],
    signal?: AbortSignal
  ): Promise<CachedTaskState> {
    return this.coalesceHydration(scope, signal, async (generation, hydrationSignal) => {
      const taskResult = await executeRead(
        () =>
          this.backend.queryTasks(
            { scope: "inbox", status: this.backend.capabilities().completedQuery ? "all" : "open" },
            hydrationSignal
          ),
        this.sleep,
        hydrationSignal
      );
      this.assertHydrationCanCommit(scope, generation, hydrationSignal);
      return this.repository.refresh(scope, {
        projects,
        tasks: taskResult.tasks,
        fetchedAt: this.now(),
        failedProjectIds: taskResult.failedProjectIds,
      });
    });
  }

  private selectTasks(state: CachedTaskState, query: TaskViewQuery): { tasks: Task[]; sections: TaskSection[] } {
    const context: SelectionContext = { now: new Date(this.now()), timeZone: this.timeZone() };

    switch (query.view) {
      case "today": {
        const sections = this.selectors.selectToday(state.tasks, context);
        return { sections, tasks: sections.flatMap((section) => section.tasks) };
      }
      case "next7Days": {
        const sections = this.selectors.selectNext7Days(state.tasks, context);
        return { sections, tasks: sections.flatMap((section) => section.tasks) };
      }
      case "inbox": {
        const tasks = this.selectors.selectInbox(state.tasks, state.projects, query.status);
        return { tasks, sections: singleSection("inbox", "Inbox", tasks) };
      }
      case "search": {
        const tasks = this.selectors.searchTasks(state.tasks, query);
        return { tasks, sections: singleSection("search", "Tasks", tasks) };
      }
    }
  }

  private createModel(read: SnapshotRead, tasks: Task[], sections: TaskSection[]): TaskReadModel {
    const { state } = read;
    const warning = this.warningFor(read);
    const model: TaskReadModel = {
      projects: state.projects,
      tasks,
      sections,
      freshness: read.refreshFailed ? "stale" : state.freshness,
      fetchedAt: state.fetchedAt,
      isPartial: state.failedProjectIds.length > 0,
      failedProjectIds: state.failedProjectIds,
    };
    if (warning) model.warning = warning;
    return model;
  }

  private warningFor(read: SnapshotRead): string | undefined {
    const partial = read.state.failedProjectIds.length > 0 ? " Some projects could not be refreshed." : "";
    if (!read.refreshFailed && read.state.freshness !== "stale") return partial.trim() || undefined;

    const ageMs = Math.max(0, this.now() - read.state.fetchedAt);
    const age = formatAge(ageMs);
    if (ageMs >= 900_000) {
      const reason = read.refreshFailed ? "because refresh failed" : "while TickTick is refreshing";
      return `Warning: TickTick data is ${age} old ${reason}.${partial}`;
    }
    const reason = read.refreshFailed ? "Couldn’t refresh TickTick." : "Refreshing TickTick.";
    return `${reason} Showing cached data from ${age} ago.${partial}`;
  }

  private scope(accountKey: string, snapshotKey: string): TaskCacheScope {
    return { backendId: this.backend.id, accountKey, snapshotKey };
  }

  private coalesceHydration(
    scope: TaskCacheScope,
    consumerSignal: AbortSignal | undefined,
    hydrate: (generation: number, hydrationSignal: AbortSignal) => Promise<CachedTaskState>
  ): Promise<CachedTaskState> {
    throwIfAborted(consumerSignal);
    const key = scopeIdentity(scope);
    let hydration = this.hydrations.get(key);
    if (!hydration || hydration.controller.signal.aborted) {
      const generation = (this.hydrationGenerations.get(key) ?? 0) + 1;
      const controller = new AbortController();
      this.hydrationGenerations.set(key, generation);
      const promise = Promise.resolve()
        .then(() => hydrate(generation, controller.signal))
        .finally(() => {
          if (this.hydrations.get(key)?.generation === generation) this.hydrations.delete(key);
        });
      hydration = { generation, controller, consumers: new Set(), promise };
      this.hydrations.set(key, hydration);
      void promise.catch(() => undefined);
    }

    return this.joinHydration(key, hydration, consumerSignal);
  }

  private joinHydration(key: string, hydration: InFlightHydration, signal?: AbortSignal): Promise<CachedTaskState> {
    throwIfAborted(signal);
    const consumer = Symbol("task-hydration-consumer");
    hydration.consumers.add(consumer);

    return new Promise<CachedTaskState>((resolve, reject) => {
      let finished = false;
      const release = () => {
        if (finished) return;
        finished = true;
        if (signal) signal.removeEventListener("abort", onAbort);
        hydration.consumers.delete(consumer);
        if (
          hydration.consumers.size === 0 &&
          this.hydrations.get(key) === hydration &&
          !hydration.controller.signal.aborted
        ) {
          hydration.controller.abort();
        }
      };
      const onAbort = () => {
        const reason = abortReason(signal);
        release();
        reject(reason);
      };

      if (signal) {
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) {
          onAbort();
          return;
        }
      }

      hydration.promise.then(
        (state) => {
          release();
          resolve(state);
        },
        (error: unknown) => {
          release();
          reject(error);
        }
      );
    });
  }

  private hasActiveHydration(scope: TaskCacheScope): boolean {
    const hydration = this.hydrations.get(scopeIdentity(scope));
    return hydration !== undefined && !hydration.controller.signal.aborted;
  }

  private assertHydrationCanCommit(scope: TaskCacheScope, generation: number, signal?: AbortSignal): void {
    throwIfAborted(signal);
    if (this.hydrationGenerations.get(scopeIdentity(scope)) !== generation) {
      throw new DOMException("Task snapshot refresh was superseded.", "AbortError");
    }
  }
}

function singleSection(id: string, title: string, tasks: Task[]): TaskSection[] {
  return tasks.length > 0 ? [{ id, title, tasks }] : [];
}

function formatAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "less than a minute";
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

function scopeIdentity(scope: TaskCacheScope): string {
  return JSON.stringify([scope.backendId, scope.accountKey, scope.snapshotKey]);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function abortReason(signal?: AbortSignal): unknown {
  try {
    throwIfAborted(signal);
  } catch (error) {
    return error;
  }
  return new DOMException("Task snapshot read was aborted.", "AbortError");
}
