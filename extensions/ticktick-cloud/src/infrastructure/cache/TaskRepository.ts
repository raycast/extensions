import { createHash } from "node:crypto";

import { ValidationError } from "../../domain/errors";
import type { Project } from "../../domain/project";
import type { ChecklistItem, Task, TaskRef } from "../../domain/task";
import type { TickTickBackend } from "../backend/TickTickBackend";
import type { CachePort } from "./CachePort";

export interface TaskSnapshot {
  tasks: Task[];
  projects: Project[];
  fetchedAt: number;
  failedProjectIds: string[];
}

export interface CachedTaskState extends TaskSnapshot {
  freshness: "fresh" | "stale";
  ageMs: number;
  requiresProminentWarning: boolean;
}

export interface TaskCacheScope {
  backendId: TickTickBackend["id"];
  accountKey: string;
  snapshotKey: string;
}

const FRESH_MS = 60_000;
const PROMINENT_WARNING_MS = 900_000;
const BACKEND_IDS: readonly TaskCacheScope["backendId"][] = ["mcp", "openapi", "macos-legacy"];

export class TaskRepository {
  constructor(private readonly cache: CachePort, private readonly now: () => number = Date.now) {}

  peek(scope: TaskCacheScope): CachedTaskState | undefined {
    const snapshot = this.readSnapshot(cacheKey(scope));
    if (!snapshot) return undefined;
    return this.toState(snapshot);
  }

  refresh(scope: TaskCacheScope, snapshot: TaskSnapshot): CachedTaskState {
    const canonical = canonicalizeTaskSnapshot(snapshot);
    if (!canonical) throw new ValidationError("Task cache data is invalid.");
    const merged = this.mergePartial(scope, canonical);
    this.cache.set(cacheKey(scope), JSON.stringify(merged));
    return this.toState(merged);
  }

  invalidate(scope: TaskCacheScope): void {
    this.cache.remove(cacheKey(scope));
  }

  invalidateTaskSnapshots(backendId: TaskCacheScope["backendId"], accountKey: string, ref: TaskRef): void {
    const prefix = accountPrefix(backendId, accountKey);
    for (const key of this.cache.keys()) {
      if (!key.startsWith(prefix)) continue;
      const snapshot = this.readSnapshot(key);
      if (!snapshot) continue;
      if (snapshot.tasks.some((cachedTask) => isSameTask(cachedTask, ref))) this.cache.remove(key);
    }
  }

  invalidateAccountSnapshots(backendId: TaskCacheScope["backendId"], accountKey: string): void {
    const prefix = accountPrefix(backendId, accountKey);
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.remove(key);
    }
  }

  clearAccount(accountKey: string): void {
    const prefixes = BACKEND_IDS.map((backendId) => accountPrefix(backendId, accountKey));
    for (const key of this.cache.keys()) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) this.cache.remove(key);
    }
  }

  mutateTask(backendId: TaskCacheScope["backendId"], accountKey: string, ref: TaskRef, task: Task): void {
    const canonicalTask = canonicalizeTask(task);
    if (!canonicalTask) throw new ValidationError("Task cache data is invalid.");
    const prefix = accountPrefix(backendId, accountKey);
    for (const key of this.cache.keys()) {
      if (!key.startsWith(prefix)) continue;
      const snapshot = this.readSnapshot(key);
      if (!snapshot) continue;
      if (!snapshot.tasks.some((cachedTask) => isSameTask(cachedTask, ref))) continue;
      this.cache.set(
        key,
        JSON.stringify({
          ...snapshot,
          tasks: snapshot.tasks.map((cachedTask) => (isSameTask(cachedTask, ref) ? canonicalTask : cachedTask)),
        } satisfies TaskSnapshot)
      );
    }
  }

  removeTask(backendId: TaskCacheScope["backendId"], accountKey: string, ref: TaskRef): void {
    const prefix = accountPrefix(backendId, accountKey);
    for (const key of this.cache.keys()) {
      if (!key.startsWith(prefix)) continue;
      const snapshot = this.readSnapshot(key);
      if (!snapshot) continue;
      if (!snapshot.tasks.some((cachedTask) => isSameTask(cachedTask, ref))) continue;
      this.cache.set(
        key,
        JSON.stringify({
          ...snapshot,
          tasks: snapshot.tasks.filter((cachedTask) => !isSameTask(cachedTask, ref)),
        } satisfies TaskSnapshot)
      );
    }
  }

  private mergePartial(scope: TaskCacheScope, snapshot: TaskSnapshot): TaskSnapshot {
    if (snapshot.failedProjectIds.length === 0) return snapshot;
    const previous = this.peek(scope);
    if (!previous) return snapshot;
    const failed = new Set(snapshot.failedProjectIds);
    const tasks = [
      ...snapshot.tasks.filter((value) => !failed.has(value.projectId)),
      ...previous.tasks.filter((value) => failed.has(value.projectId)),
    ];
    const projectIds = new Set(snapshot.projects.map((value) => value.id));
    const projects = [
      ...snapshot.projects,
      ...previous.projects.filter((value) => failed.has(value.id) && !projectIds.has(value.id)),
    ];
    return { ...snapshot, tasks, projects };
  }

  private readSnapshot(key: string): TaskSnapshot | undefined {
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    try {
      const parsed: unknown = JSON.parse(value);
      const canonical = canonicalizeTaskSnapshot(parsed);
      if (canonical) {
        const serialized = JSON.stringify(canonical);
        if (serialized !== value) this.cache.set(key, serialized);
        return canonical;
      }
    } catch {
      // A cache entry is disposable; malformed local data must never break a command.
    }
    this.cache.remove(key);
    return undefined;
  }

  private toState(snapshot: TaskSnapshot): CachedTaskState {
    const ageMs = Math.max(0, this.now() - snapshot.fetchedAt);
    return {
      ...snapshot,
      freshness: ageMs <= FRESH_MS ? "fresh" : "stale",
      ageMs,
      requiresProminentWarning: ageMs >= PROMINENT_WARNING_MS,
    };
  }
}

function cacheKey(scope: TaskCacheScope): string {
  return `${accountPrefix(scope.backendId, scope.accountKey)}${encodeURIComponent(scope.snapshotKey)}`;
}

function accountPrefix(backendId: TaskCacheScope["backendId"], accountKey: string): string {
  const accountNamespace = createHash("sha256").update(accountKey).digest("hex");
  return `task-snapshot:${backendId}:${accountNamespace}:`;
}

function canonicalizeTaskSnapshot(value: unknown): TaskSnapshot | undefined {
  if (!isRecord(value)) return undefined;
  if (
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.projects) ||
    typeof value.fetchedAt !== "number" ||
    !Number.isFinite(value.fetchedAt) ||
    value.fetchedAt < 0 ||
    !isStringArray(value.failedProjectIds)
  ) {
    return undefined;
  }
  const tasks: Task[] = [];
  for (const candidate of value.tasks) {
    const task = canonicalizeTask(candidate);
    if (!task) return undefined;
    tasks.push(task);
  }
  const projects: Project[] = [];
  for (const candidate of value.projects) {
    const project = canonicalizeProject(candidate);
    if (!project) return undefined;
    projects.push(project);
  }
  return {
    tasks,
    projects,
    fetchedAt: value.fetchedAt,
    failedProjectIds: [...value.failedProjectIds],
  };
}

function canonicalizeProject(value: unknown): Project | undefined {
  if (!isRecord(value)) return undefined;
  if (
    !isNonEmptyString(value.id) ||
    typeof value.name !== "string" ||
    (value.kind !== "inbox" && value.kind !== "project") ||
    typeof value.closed !== "boolean"
  ) {
    return undefined;
  }
  return { id: value.id, name: value.name, kind: value.kind, closed: value.closed };
}

function canonicalizeTask(value: unknown): Task | undefined {
  if (!isRecord(value)) return undefined;
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.projectId) ||
    typeof value.title !== "string" ||
    typeof value.projectName !== "string" ||
    (value.status !== "open" && value.status !== "completed") ||
    (value.priority !== 0 && value.priority !== 1 && value.priority !== 3 && value.priority !== 5) ||
    !isStringArray(value.tags) ||
    (value.kind !== "TEXT" && value.kind !== "CHECKLIST" && value.kind !== "NOTE") ||
    typeof value.isAllDay !== "boolean" ||
    typeof value.isFloating !== "boolean" ||
    typeof value.timeZone !== "string" ||
    !isOptionalString(value.content) ||
    !isOptionalString(value.description) ||
    !isOptionalString(value.startDate) ||
    !isOptionalString(value.dueDate) ||
    !isOptionalString(value.exactUrl) ||
    (value.items !== undefined && !Array.isArray(value.items))
  ) {
    return undefined;
  }
  let items: ChecklistItem[] | undefined;
  if (value.items !== undefined) {
    items = [];
    for (const candidate of value.items) {
      const item = canonicalizeChecklistItem(candidate);
      if (!item) return undefined;
      items.push(item);
    }
  }
  const task: Task = {
    id: value.id,
    projectId: value.projectId,
    title: value.title,
    projectName: value.projectName,
    status: value.status,
    priority: value.priority,
    tags: [...value.tags],
    kind: value.kind,
    isAllDay: value.isAllDay,
    isFloating: value.isFloating,
    timeZone: value.timeZone,
  };
  if (value.content !== undefined) task.content = value.content;
  if (value.description !== undefined) task.description = value.description;
  if (value.startDate !== undefined) task.startDate = value.startDate;
  if (value.dueDate !== undefined) task.dueDate = value.dueDate;
  if (items !== undefined) task.items = items;
  if (value.exactUrl !== undefined) task.exactUrl = value.exactUrl;
  return task;
}

function canonicalizeChecklistItem(value: unknown): ChecklistItem | undefined {
  if (!isRecord(value)) return undefined;
  if (
    !isNonEmptyString(value.id) ||
    typeof value.title !== "string" ||
    (value.status !== "open" && value.status !== "completed") ||
    typeof value.sortOrder !== "number" ||
    !Number.isFinite(value.sortOrder) ||
    !isOptionalString(value.startDate) ||
    (value.isAllDay !== undefined && typeof value.isAllDay !== "boolean")
  ) {
    return undefined;
  }
  const item: ChecklistItem = {
    id: value.id,
    title: value.title,
    status: value.status,
    sortOrder: value.sortOrder,
  };
  if (value.startDate !== undefined) item.startDate = value.startDate;
  if (value.isAllDay !== undefined) item.isAllDay = value.isAllDay;
  return item;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isSameTask(task: TaskRef, ref: TaskRef): boolean {
  return task.id === ref.id && task.projectId === ref.projectId;
}
