import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { Project } from "../../domain/project";
import type { ChecklistItem, Task, TaskRef } from "../../domain/task";
import { InMemoryCachePort } from "../../test/fakes/InMemoryCachePort";
import { RaycastCachePort } from "./RaycastCachePort";
import { TaskRepository, type CachedTaskState, type TaskCacheScope, type TaskSnapshot } from "./TaskRepository";

type Equal<Actual, Expected> = (<Value>() => Value extends Actual ? 1 : 2) extends <Value>() => Value extends Expected
  ? 1
  : 2
  ? true
  : false;
type Expect<Condition extends true> = Condition;

const project: Project = { id: "project-1", name: "Synthetic project", kind: "project", closed: false };
const task: Task = {
  id: "task-1",
  projectId: project.id,
  title: "Synthetic task",
  projectName: project.name,
  status: "open",
  priority: 0,
  tags: [],
  kind: "TEXT",
  isAllDay: true,
  isFloating: false,
  timeZone: "UTC",
};
const secondProject: Project = { id: "project-2", name: "Second project", kind: "project", closed: false };
const secondTask: Task = {
  ...task,
  id: "task-2",
  projectId: secondProject.id,
  title: "Second task",
  projectName: secondProject.name,
};
const checklistItem: ChecklistItem = {
  id: "checklist-1",
  title: "Synthetic checklist item",
  status: "open",
  sortOrder: 1,
  startDate: "2026-08-14T12:00:00Z",
  isAllDay: false,
};
const credentialExtras = {
  accessToken: "synthetic-access-credential-42",
  authorization: "Bearer synthetic-authorization-credential-42",
  bearer: "Bearer synthetic-bearer-credential-42",
};
const scope: TaskCacheScope = {
  backendId: "mcp",
  accountKey: "oauth:00000000-0000-4000-8000-000000000001",
  snapshotKey: "all",
};

function snapshot(fetchedAt: number, overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return { tasks: [task], projects: [project], fetchedAt, failedProjectIds: [], ...overrides };
}

function snapshotWithCredentialExtras(fetchedAt: number) {
  const poisonedChecklistItem = { ...checklistItem, ...credentialExtras };
  const poisonedTask = {
    ...task,
    kind: "CHECKLIST" as const,
    tags: ["synthetic-tag"],
    items: [poisonedChecklistItem],
    ...credentialExtras,
  };
  const poisonedProject = { ...project, ...credentialExtras };
  return {
    ...snapshot(fetchedAt, { tasks: [poisonedTask], projects: [poisonedProject] }),
    ...credentialExtras,
  };
}

describe("TaskRepository", () => {
  it("locks the small synchronous repository API", () => {
    const assertions: [
      Expect<Equal<Parameters<TaskRepository["peek"]>, [scope: TaskCacheScope]>>,
      Expect<Equal<ReturnType<TaskRepository["peek"]>, CachedTaskState | undefined>>,
      Expect<Equal<Parameters<TaskRepository["refresh"]>, [scope: TaskCacheScope, snapshot: TaskSnapshot]>>,
      Expect<Equal<ReturnType<TaskRepository["refresh"]>, CachedTaskState>>,
      Expect<Equal<Parameters<TaskRepository["invalidate"]>, [scope: TaskCacheScope]>>,
      Expect<
        Equal<
          Parameters<TaskRepository["mutateTask"]>,
          [backendId: TaskCacheScope["backendId"], accountKey: string, ref: TaskRef, task: Task]
        >
      >,
      Expect<
        Equal<
          Parameters<TaskRepository["removeTask"]>,
          [backendId: TaskCacheScope["backendId"], accountKey: string, ref: TaskRef]
        >
      >,
      Expect<
        Equal<
          Parameters<TaskRepository["invalidateTaskSnapshots"]>,
          [backendId: TaskCacheScope["backendId"], accountKey: string, ref: TaskRef]
        >
      >,
      Expect<
        Equal<
          Parameters<TaskRepository["invalidateAccountSnapshots"]>,
          [backendId: TaskCacheScope["backendId"], accountKey: string]
        >
      >,
      Expect<Equal<Parameters<TaskRepository["clearAccount"]>, [accountKey: string]>>
    ] = [true, true, true, true, true, true, true, true, true, true];

    expect(assertions).toHaveLength(10);
  });

  it("treats snapshots as fresh through 60,000 ms and stale at 60,001 ms", () => {
    let now = 1_000_000;
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    repository.refresh(scope, snapshot(now));

    now += 60_000;
    expect(repository.peek(scope)).toMatchObject({ freshness: "fresh", ageMs: 60_000 });

    now += 1;
    expect(repository.peek(scope)).toMatchObject({ freshness: "stale", ageMs: 60_001 });
  });

  it("requires a prominent warning from 15 minutes while retaining stale data indefinitely", () => {
    let now = 2_000_000;
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    repository.refresh(scope, snapshot(now));

    now += 899_999;
    expect(repository.peek(scope)).toMatchObject({ requiresProminentWarning: false, tasks: [task] });

    now += 1;
    expect(repository.peek(scope)).toMatchObject({
      freshness: "stale",
      ageMs: 900_000,
      requiresProminentWarning: true,
      tasks: [task],
    });

    now += 365 * 24 * 60 * 60 * 1_000;
    expect(repository.peek(scope)).toMatchObject({ requiresProminentWarning: true, tasks: [task] });
  });

  it("isolates backend and account keys through a one-way namespace even if a caller passes a raw token", () => {
    const accountA = "secret-token-that-must-not-be-cached";
    const accountB = "different-secret-token-that-must-not-be-cached";
    const accountADigest = createHash("sha256").update(accountA).digest("hex");
    const accountBDigest = createHash("sha256").update(accountB).digest("hex");
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache, () => 3_000_000);
    const scopes: TaskCacheScope[] = [
      { backendId: "mcp", accountKey: accountA, snapshotKey: "all" },
      { backendId: "openapi", accountKey: accountA, snapshotKey: "all" },
      { backendId: "mcp", accountKey: accountB, snapshotKey: "all" },
    ];

    scopes.forEach((value, index) => repository.refresh(value, snapshot(3_000_000, { fetchedAt: 3_000_000 + index })));

    const keys = cache.keys();
    expect(keys).toHaveLength(3);
    expect(keys.some((key) => key.includes("mcp") && key.includes(accountADigest))).toBe(true);
    expect(keys.some((key) => key.includes("openapi") && key.includes(accountADigest))).toBe(true);
    expect(keys.some((key) => key.includes(accountBDigest))).toBe(true);
    expect(keys.join("\n")).not.toContain(accountA);
    expect(keys.join("\n")).not.toContain(accountB);
    expect(scopes.map((value) => repository.peek(value)?.fetchedAt)).toEqual([3_000_000, 3_000_001, 3_000_002]);
  });

  it("clears every backend and snapshot for only the requested account", () => {
    const accountA = "raw-token-shaped-account-a";
    const accountB = "raw-token-shaped-account-b";
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache);
    const accountAScopes: TaskCacheScope[] = [
      { backendId: "mcp", accountKey: accountA, snapshotKey: "all" },
      { backendId: "mcp", accountKey: accountA, snapshotKey: "inbox" },
      { backendId: "openapi", accountKey: accountA, snapshotKey: "all" },
    ];
    const accountBScope: TaskCacheScope = { backendId: "mcp", accountKey: accountB, snapshotKey: "all" };
    [...accountAScopes, accountBScope].forEach((value) => repository.refresh(value, snapshot(1_000_000)));

    repository.clearAccount(accountA);

    expect(accountAScopes.map((value) => repository.peek(value))).toEqual([undefined, undefined, undefined]);
    expect(repository.peek(accountBScope)?.tasks).toEqual([task]);
  });

  it("invalidates every arbitrary snapshot for only the requested backend and account", () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    const targetScopes: TaskCacheScope[] = [
      { ...scope, snapshotKey: "all" },
      { ...scope, snapshotKey: "inbox" },
      { ...scope, snapshotKey: "project:one" },
      { ...scope, snapshotKey: "future:view:with spaces" },
    ];
    const otherBackendScope = { ...scope, backendId: "openapi" as const, snapshotKey: "all" };
    const otherAccountScope = { ...scope, accountKey: "oauth:other-account", snapshotKey: "all" };
    [...targetScopes, otherBackendScope, otherAccountScope].forEach((value) =>
      repository.refresh(value, snapshot(1_000_000))
    );

    repository.invalidateAccountSnapshots(scope.backendId, scope.accountKey);

    expect(targetScopes.map((value) => repository.peek(value))).toEqual([undefined, undefined, undefined, undefined]);
    expect(repository.peek(otherBackendScope)?.tasks).toEqual([task]);
    expect(repository.peek(otherAccountScope)?.tasks).toEqual([task]);
  });

  it("merges successful project data while retaining prior data for failed projects", () => {
    const repository = new TaskRepository(new InMemoryCachePort(), () => 4_000_000);
    repository.refresh(scope, snapshot(3_000_000, { tasks: [task, secondTask], projects: [project, secondProject] }));
    const renamedProject = { ...project, name: "Renamed synthetic project" };
    const updatedTask = { ...task, title: "Updated task", projectName: renamedProject.name };

    const refreshed = repository.refresh(
      scope,
      snapshot(4_000_000, {
        tasks: [updatedTask],
        projects: [renamedProject],
        failedProjectIds: [secondProject.id],
      })
    );

    expect(refreshed).toMatchObject({
      tasks: [updatedTask, secondTask],
      projects: [renamedProject, secondProject],
      failedProjectIds: [secondProject.id],
      fetchedAt: 4_000_000,
      freshness: "fresh",
    });
    expect(repository.peek(scope)?.tasks).toEqual([updatedTask, secondTask]);
  });

  it("updates a task in every matching account snapshot without inserting it elsewhere", () => {
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache, () => 5_000_000);
    const allScope = scope;
    const inboxScope = { ...scope, snapshotKey: "inbox" };
    const unrelatedScope = { ...scope, snapshotKey: "unrelated" };
    const otherAccountScope = {
      ...scope,
      accountKey: "oauth:00000000-0000-4000-8000-000000000002",
    };
    repository.refresh(allScope, snapshot(4_000_000, { tasks: [task, secondTask] }));
    repository.refresh(inboxScope, snapshot(4_100_000));
    repository.refresh(unrelatedScope, snapshot(4_200_000, { tasks: [secondTask] }));
    repository.refresh(otherAccountScope, snapshot(4_300_000));
    const completedTask: Task = { ...task, status: "completed", title: "Completed synthetic task" };

    repository.mutateTask("mcp", scope.accountKey, task, completedTask);

    expect(repository.peek(allScope)?.tasks).toEqual([completedTask, secondTask]);
    expect(repository.peek(inboxScope)?.tasks).toEqual([completedTask]);
    expect(repository.peek(inboxScope)?.fetchedAt).toBe(4_100_000);
    expect(repository.peek(unrelatedScope)?.tasks).toEqual([secondTask]);
    expect(repository.peek(otherAccountScope)?.tasks).toEqual([task]);
  });

  it("removes a task from every matching account snapshot", () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    const allScope = scope;
    const inboxScope = { ...scope, snapshotKey: "inbox" };
    const otherBackendScope = { ...scope, backendId: "openapi" as const };
    repository.refresh(allScope, snapshot(1_000_000, { tasks: [task, secondTask] }));
    repository.refresh(inboxScope, snapshot(1_000_000));
    repository.refresh(otherBackendScope, snapshot(1_000_000));

    repository.removeTask("mcp", scope.accountKey, task);

    expect(repository.peek(allScope)?.tasks).toEqual([secondTask]);
    expect(repository.peek(inboxScope)?.tasks).toEqual([]);
    expect(repository.peek(otherBackendScope)?.tasks).toEqual([task]);
  });

  it("uses project ID plus task ID when mutating and removing colliding task IDs", () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    const collidingTask: Task = { ...secondTask, id: task.id };
    const completedTask: Task = { ...task, status: "completed" };
    repository.refresh(scope, snapshot(1_000_000, { tasks: [task, collidingTask] }));

    repository.mutateTask("mcp", scope.accountKey, task, completedTask);
    expect(repository.peek(scope)?.tasks).toEqual([completedTask, collidingTask]);

    repository.removeTask("mcp", scope.accountKey, task);
    expect(repository.peek(scope)?.tasks).toEqual([collidingTask]);
  });

  it("invalidates every arbitrary snapshot containing an exact composite task ref and nothing else", () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    const matchingScopes: TaskCacheScope[] = [
      { ...scope, snapshotKey: "all" },
      { ...scope, snapshotKey: "inbox" },
      { ...scope, snapshotKey: "project:one" },
      { ...scope, snapshotKey: "future:view:with spaces" },
    ];
    const collidingTask: Task = { ...secondTask, id: task.id };
    const collisionOnlyScope = { ...scope, snapshotKey: "project:collision" };
    const unrelatedScope = { ...scope, snapshotKey: "project:unrelated" };
    const otherAccountScope = {
      ...scope,
      accountKey: "oauth:00000000-0000-4000-8000-000000000009",
      snapshotKey: "all",
    };
    const otherBackendScope = { ...scope, backendId: "openapi" as const, snapshotKey: "all" };
    matchingScopes.forEach((value) => repository.refresh(value, snapshot(1_000_000, { tasks: [task, secondTask] })));
    repository.refresh(collisionOnlyScope, snapshot(1_000_000, { tasks: [collidingTask] }));
    repository.refresh(unrelatedScope, snapshot(1_000_000, { tasks: [secondTask] }));
    repository.refresh(otherAccountScope, snapshot(1_000_000));
    repository.refresh(otherBackendScope, snapshot(1_000_000));

    repository.invalidateTaskSnapshots("mcp", scope.accountKey, task);

    expect(matchingScopes.map((value) => repository.peek(value))).toEqual([undefined, undefined, undefined, undefined]);
    expect(repository.peek(collisionOnlyScope)?.tasks).toEqual([collidingTask]);
    expect(repository.peek(unrelatedScope)?.tasks).toEqual([secondTask]);
    expect(repository.peek(otherAccountScope)?.tasks).toEqual([task]);
    expect(repository.peek(otherBackendScope)?.tasks).toEqual([task]);
  });

  it("invalidates only the requested snapshot scope", () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    const inboxScope = { ...scope, snapshotKey: "inbox" };
    repository.refresh(scope, snapshot(1_000_000));
    repository.refresh(inboxScope, snapshot(1_000_000));

    repository.invalidate(inboxScope);

    expect(repository.peek(inboxScope)).toBeUndefined();
    expect(repository.peek(scope)?.tasks).toEqual([task]);
  });

  it("ignores and removes malformed cached snapshots safely", () => {
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache);
    repository.refresh(scope, snapshot(1_000_000));
    const [key] = cache.keys();
    cache.set(key, '{"tasks":');

    expect(() => repository.peek(scope)).not.toThrow();
    expect(repository.peek(scope)).toBeUndefined();
    expect(cache.keys()).toEqual([]);

    repository.refresh(scope, snapshot(1_000_000));
    cache.set(cache.keys()[0], JSON.stringify({ tasks: [], fetchedAt: "not-a-number" }));
    expect(repository.peek(scope)).toBeUndefined();
    expect(cache.keys()).toEqual([]);
  });

  it("deeply whitelists snapshot fields before persistence and return", () => {
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache, () => 7_000_000);

    const state = repository.refresh(scope, snapshotWithCredentialExtras(7_000_000));

    const returnedJson = JSON.stringify(state);
    const persistedJson = cache.get(cache.keys()[0]);
    for (const forbidden of [...Object.keys(credentialExtras), ...Object.values(credentialExtras)]) {
      expect(returnedJson).not.toContain(forbidden);
      expect(persistedJson).not.toContain(forbidden);
    }
    expect(state.tasks[0]).toMatchObject({ tags: ["synthetic-tag"], items: [checklistItem] });
  });

  it("deeply whitelists a previously persisted snapshot and rewrites its raw cache JSON", () => {
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache, () => 7_000_000);
    repository.refresh(scope, snapshot(7_000_000));
    const [key] = cache.keys();
    cache.set(key, JSON.stringify(snapshotWithCredentialExtras(7_000_000)));

    const state = repository.peek(scope);

    const returnedJson = JSON.stringify(state);
    const rewrittenJson = cache.get(key);
    for (const forbidden of [...Object.keys(credentialExtras), ...Object.values(credentialExtras)]) {
      expect(returnedJson).not.toContain(forbidden);
      expect(rewrittenJson).not.toContain(forbidden);
    }
    expect(state?.tasks[0]).toMatchObject({ tags: ["synthetic-tag"], items: [checklistItem] });
  });

  it("whitelists a replacement task before mutation persistence", () => {
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache);
    repository.refresh(scope, snapshot(1_000_000));
    const replacement = { ...task, title: "Sanitized replacement", ...credentialExtras };

    repository.mutateTask("mcp", scope.accountKey, task, replacement);

    const persistedJson = cache.get(cache.keys()[0]);
    for (const forbidden of [...Object.keys(credentialExtras), ...Object.values(credentialExtras)]) {
      expect(persistedJson).not.toContain(forbidden);
    }
    expect(repository.peek(scope)?.tasks[0].title).toBe("Sanitized replacement");
  });

  it("parses and canonicalizes a representative cached 5,000-task fixture within the 250 ms unit budget", () => {
    const cache = new InMemoryCachePort();
    const repository = new TaskRepository(cache, () => 6_000_000);
    const tasks = Array.from(
      { length: 5_000 },
      (_, index): Task => ({
        ...task,
        id: `task-${index}`,
        title: `Synthetic task ${index}`,
        content: `Synthetic content ${index}`,
        description: `Synthetic description ${index}`,
        tags: ["synthetic", `batch-${index % 10}`],
        kind: "CHECKLIST",
        startDate: "2026-08-14T12:00:00Z",
        dueDate: "2026-08-15T12:00:00Z",
        items: [{ ...checklistItem, id: `checklist-${index}` }],
        exactUrl: `https://ticktick.com/webapp/#p/${project.id}/tasks/${index}`,
      })
    );
    repository.refresh(scope, snapshot(6_000_000, { tasks }));

    const startedAt = performance.now();
    const cached = repository.peek(scope);
    const elapsedMs = performance.now() - startedAt;

    expect(cached?.tasks).toHaveLength(5_000);
    expect(cached?.tasks[4_999]).toMatchObject({
      tags: ["synthetic", "batch-9"],
      items: [{ id: "checklist-4999" }],
      exactUrl: `https://ticktick.com/webapp/#p/${project.id}/tasks/4999`,
    });
    expect(elapsedMs).toBeLessThan(250);
  });
});

class SyntheticRaycastCache {
  readonly values = new Map<string, string>();

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): boolean {
    return this.values.delete(key);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  clear(): void {
    this.values.clear();
  }
}

describe("RaycastCachePort", () => {
  it("uses the task cache namespace and maintains a private key index", () => {
    const cache = new SyntheticRaycastCache();
    const namespaces: string[] = [];
    const port = new RaycastCachePort((options) => {
      namespaces.push(options.namespace);
      return cache;
    });

    port.set("first", "one");
    port.set("second", "two");

    expect(namespaces).toEqual(["ticktick.tasks.v1"]);
    expect(port.keys()).toEqual(["first", "second"]);
    expect(port.get("first")).toBe("one");
    expect(port.get("__ticktick_cache_index_v1__")).toBeUndefined();
    expect(port.keys()).not.toContain("__ticktick_cache_index_v1__");

    port.remove("first");
    expect(port.keys()).toEqual(["second"]);
    expect(port.get("first")).toBeUndefined();
  });

  it("recovers an exact deterministic read when the index is evicted and clears unknown orphan state", () => {
    const cache = new SyntheticRaycastCache();
    const port = new RaycastCachePort(() => cache);
    port.set("wanted", "recoverable");
    port.set("unknown-orphan", "must-be-cleared");
    cache.remove("__ticktick_cache_index_v1__");

    expect(port.get("wanted")).toBe("recoverable");
    expect(port.keys()).toEqual(["wanted"]);
    expect(cache.has("unknown-orphan")).toBe(false);
  });

  it("recovers an exact deterministic read from a corrupt index", () => {
    const cache = new SyntheticRaycastCache();
    const port = new RaycastCachePort(() => cache);
    port.set("wanted", "recoverable");
    port.set("unknown-orphan", "must-be-cleared");
    cache.set("__ticktick_cache_index_v1__", '{"not":"an-array"}');

    expect(port.get("wanted")).toBe("recoverable");
    expect(port.keys()).toEqual(["wanted"]);
    expect(cache.has("unknown-orphan")).toBe(false);
  });

  it("prunes an indexed entry when its value is evicted while retaining live entries", () => {
    const cache = new SyntheticRaycastCache();
    const port = new RaycastCachePort(() => cache);
    port.set("evicted", "gone");
    port.set("surviving", "present");
    cache.remove("evicted");

    expect(port.keys()).toEqual(["surviving"]);
    expect(port.get("evicted")).toBeUndefined();
    expect(port.get("surviving")).toBe("present");
    expect(cache.get("__ticktick_cache_index_v1__")).toBe('["surviving"]');
  });

  it("clears orphan state when keys or set encounters a missing index without an exact read", () => {
    const cache = new SyntheticRaycastCache();
    const port = new RaycastCachePort(() => cache);
    port.set("orphan-before-keys", "must-be-cleared");
    cache.remove("__ticktick_cache_index_v1__");

    expect(port.keys()).toEqual([]);
    expect(cache.has("orphan-before-keys")).toBe(false);

    cache.remove("__ticktick_cache_index_v1__");
    cache.set("orphan-before-set", "must-be-cleared");
    port.set("fresh", "visible");

    expect(port.keys()).toEqual(["fresh"]);
    expect(port.get("fresh")).toBe("visible");
    expect(cache.has("orphan-before-set")).toBe(false);
  });

  it("clears only the requested account normally and all unknown state after degraded index loss", () => {
    const cache = new SyntheticRaycastCache();
    const port = new RaycastCachePort(() => cache);
    const repository = new TaskRepository(port);
    const accountAScope = { ...scope, accountKey: "account-a" };
    const accountBScope = { ...scope, accountKey: "account-b" };
    repository.refresh(accountAScope, snapshot(1_000_000));
    repository.refresh(accountBScope, snapshot(1_000_000));

    repository.clearAccount(accountAScope.accountKey);

    expect(repository.peek(accountAScope)).toBeUndefined();
    expect(repository.peek(accountBScope)?.tasks).toEqual([task]);

    repository.refresh(accountAScope, snapshot(1_000_000));
    cache.remove("__ticktick_cache_index_v1__");
    repository.clearAccount(accountAScope.accountKey);

    expect(port.keys()).toEqual([]);
    expect([...cache.values.keys()]).toEqual(["__ticktick_cache_index_v1__"]);
  });
});
