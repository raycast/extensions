import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { AmbiguousMutationError, ProtocolError, ValidationError } from "../domain/errors";
import type { CreateTaskInput, Task } from "../domain/task";
import type { BackendCapabilities, TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository, type TaskCacheScope } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { TaskCreationService } from "./TaskCreationService";

const accountKey = "oauth:confirmed-create-account";
const capabilities: BackendCapabilities = {
  create: true,
  update: true,
  complete: true,
  reopen: true,
  move: true,
  completedQuery: true,
  inboxQuery: true,
  exactTaskLink: true,
};
const confirmedTask: Task = {
  id: "task-confirmed",
  projectId: "project-a",
  title: "Synthetic confirmed task",
  projectName: "Synthetic project",
  status: "open",
  priority: 0,
  tags: [],
  kind: "TEXT",
  isAllDay: false,
  isFloating: true,
  timeZone: "UTC",
};

function backend(createTask: TickTickBackend["createTask"]): TickTickBackend {
  return {
    id: "mcp",
    capabilities: vi.fn(() => ({ ...capabilities })),
    accountIdentity: async () => undefined,
    listProjects: async () => [],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask,
    updateTask: async () => {
      throw new Error("unused");
    },
    completeTask: async () => undefined,
    reopenTask: async () => undefined,
    moveTask: async () => {
      throw new Error("unused");
    },
  };
}

function service(
  source: TickTickBackend,
  repository = new TaskRepository(new InMemoryCachePort()),
  createSupported = true
): TaskCreationService {
  return new TaskCreationService({
    backend: source,
    backendId: source.id,
    repository,
    createSupported,
  });
}

function seedSnapshots(repository: TaskRepository): {
  targetScopes: TaskCacheScope[];
  otherBackendScope: TaskCacheScope;
  otherAccountScope: TaskCacheScope;
} {
  const targetScopes: TaskCacheScope[] = [
    { backendId: "mcp", accountKey, snapshotKey: "all" },
    { backendId: "mcp", accountKey, snapshotKey: "inbox" },
    { backendId: "mcp", accountKey, snapshotKey: "future:project-view" },
  ];
  const otherBackendScope: TaskCacheScope = { backendId: "openapi", accountKey, snapshotKey: "all" };
  const otherAccountScope: TaskCacheScope = { backendId: "mcp", accountKey: "oauth:other", snapshotKey: "all" };
  for (const scope of [...targetScopes, otherBackendScope, otherAccountScope]) {
    repository.refresh(scope, {
      tasks: [],
      projects: [],
      fetchedAt: 1_000_000,
      failedProjectIds: [],
    });
  }
  return { targetScopes, otherBackendScope, otherAccountScope };
}

describe("TaskCreationService", () => {
  it("guards an unsupported create before reading private input or calling the backend", async () => {
    const createTask = vi.fn<TickTickBackend["createTask"]>();
    let projectIdReads = 0;
    const input = Object.defineProperty({ title: "Synthetic task" }, "projectId", {
      get() {
        projectIdReads += 1;
        throw new Error("PRIVATE INPUT");
      },
    }) as CreateTaskInput;

    await expect(service(backend(createTask), undefined, false).create(accountKey, input)).rejects.toEqual(
      new ProtocolError("This TickTick backend cannot create tasks.")
    );

    expect(projectIdReads).toBe(0);
    expect(createTask).not.toHaveBeenCalled();
  });

  it("returns the exact confirmed task after one call and invalidates only its backend/account snapshots", async () => {
    const createTask = vi.fn(async () => confirmedTask);
    const source = backend(createTask);
    const repository = new TaskRepository(new InMemoryCachePort());
    const { targetScopes, otherBackendScope, otherAccountScope } = seedSnapshots(repository);
    const input: CreateTaskInput = { title: "Synthetic task", projectId: "project-a" };

    const result = await service(source, repository).create(accountKey, input);

    expect(result).toBe(confirmedTask);
    expect(createTask).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith(input);
    expect(source.capabilities).not.toHaveBeenCalled();
    expect(targetScopes.map((scope) => repository.peek(scope))).toEqual([undefined, undefined, undefined]);
    expect(repository.peek(otherBackendScope)).toBeDefined();
    expect(repository.peek(otherAccountScope)).toBeDefined();
  });

  it("snapshots the requested project once before dispatch and accepts its exact confirmation", async () => {
    const createTask = vi.fn(async () => confirmedTask);
    let projectIdReads = 0;
    const input = Object.defineProperty({ title: "Synthetic task" }, "projectId", {
      get() {
        projectIdReads += 1;
        return projectIdReads === 1 ? "project-a" : "project-b";
      },
    }) as CreateTaskInput;

    await expect(service(backend(createTask)).create(accountKey, input)).resolves.toBe(confirmedTask);

    expect(projectIdReads).toBe(1);
    expect(createTask).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith(input);
  });

  it.each([
    ["leading whitespace", " project-a"],
    ["trailing whitespace", "project-a "],
    ["C0 control", "project\u0000a"],
    ["C1 control", "project\u007fa"],
    ["format character", "project\u200ba"],
    ["lone high surrogate", "project-\ud800"],
    ["lone low surrogate", "project-\udc00"],
    ["unpaired high surrogate", "project-\ud800x"],
  ])("rejects an unsafe requested project with %s before dispatch", async (_case, projectId) => {
    const createTask = vi.fn(async () => confirmedTask);

    await expect(
      service(backend(createTask)).create(accountKey, {
        title: "Synthetic task",
        projectId,
      })
    ).rejects.toEqual(new ProtocolError("TickTick task creation input is invalid."));

    expect(createTask).not.toHaveBeenCalled();
  });

  it("accepts a safe well-formed Unicode requested project and exact confirmation", async () => {
    const unicodeTask = { ...confirmedTask, projectId: "project-résumé-😀" };
    const createTask = vi.fn(async () => unicodeTask);

    await expect(
      service(backend(createTask)).create(accountKey, {
        title: "Synthetic task",
        projectId: unicodeTask.projectId,
      })
    ).resolves.toBe(unicodeTask);
    expect(createTask).toHaveBeenCalledOnce();
  });

  it.each(["method access", "method invocation"] as const)(
    "preserves a synchronous %s TypeError as known pre-dispatch failure without invalidating cache",
    async (failurePoint) => {
      const failure = new TypeError(`Synthetic ${failurePoint} failure`);
      const createTask = vi.fn<TickTickBackend["createTask"]>(() => {
        throw failure;
      });
      const source = backend(createTask);
      if (failurePoint === "method access") {
        Object.defineProperty(source, "createTask", {
          get() {
            throw failure;
          },
        });
      }
      const repository = new TaskRepository(new InMemoryCachePort());
      const { targetScopes } = seedSnapshots(repository);

      await expect(
        service(source, repository).create(accountKey, { title: "Synthetic task", projectId: "project-a" })
      ).rejects.toBe(failure);

      expect(targetScopes.every((scope) => repository.peek(scope) !== undefined)).toBe(true);
      if (failurePoint === "method invocation") expect(createTask).toHaveBeenCalledOnce();
      else expect(createTask).not.toHaveBeenCalled();
    }
  );

  it.each(["method access", "method invocation"] as const)(
    "preserves synchronous adapter ambiguity from %s and invalidates the uncertain account",
    async (failurePoint) => {
      const ambiguity = new AmbiguousMutationError(`Synthetic synchronous ${failurePoint} ambiguity`);
      const createTask = vi.fn<TickTickBackend["createTask"]>(() => {
        throw ambiguity;
      });
      const source = backend(createTask);
      if (failurePoint === "method access") {
        Object.defineProperty(source, "createTask", {
          get() {
            throw ambiguity;
          },
        });
      }
      const repository = new TaskRepository(new InMemoryCachePort());
      const { targetScopes, otherBackendScope } = seedSnapshots(repository);

      await expect(
        service(source, repository).create(accountKey, { title: "Synthetic task", projectId: "project-a" })
      ).rejects.toBe(ambiguity);

      expect(targetScopes.map((scope) => repository.peek(scope))).toEqual([undefined, undefined, undefined]);
      expect(repository.peek(otherBackendScope)).toBeDefined();
      if (failurePoint === "method invocation") expect(createTask).toHaveBeenCalledOnce();
      else expect(createTask).not.toHaveBeenCalled();
    }
  );

  it("preserves adapter ambiguity exactly, never retries, and invalidates the uncertain account", async () => {
    const ambiguity = new AmbiguousMutationError("Synthetic adapter ambiguity");
    const createTask = vi.fn(async () => Promise.reject(ambiguity));
    const repository = new TaskRepository(new InMemoryCachePort());
    const { targetScopes, otherBackendScope } = seedSnapshots(repository);

    await expect(service(backend(createTask), repository).create(accountKey, { title: "Synthetic task" })).rejects.toBe(
      ambiguity
    );

    expect(createTask).toHaveBeenCalledOnce();
    expect(targetScopes.map((scope) => repository.peek(scope))).toEqual([undefined, undefined, undefined]);
    expect(repository.peek(otherBackendScope)).toBeDefined();
  });

  it("preserves a non-ambiguous failure without retrying or changing cached snapshots", async () => {
    const failure = new ValidationError("Synthetic validation failure");
    const createTask = vi.fn(async () => Promise.reject(failure));
    const repository = new TaskRepository(new InMemoryCachePort());
    const { targetScopes } = seedSnapshots(repository);

    await expect(service(backend(createTask), repository).create(accountKey, { title: "Synthetic task" })).rejects.toBe(
      failure
    );

    expect(createTask).toHaveBeenCalledOnce();
    expect(targetScopes.every((scope) => repository.peek(scope) !== undefined)).toBe(true);
  });

  it.each([
    ["blank task id", { ...confirmedTask, id: "   " }],
    ["blank project id", { ...confirmedTask, projectId: "   " }],
    ["different requested project", { ...confirmedTask, projectId: "project-b" }],
  ])("maps a resolved %s confirmation to fixed terminal ambiguity", async (_case, candidate) => {
    const createTask = vi.fn(async () => candidate);
    const repository = new TaskRepository(new InMemoryCachePort());
    const { targetScopes } = seedSnapshots(repository);
    const operation = service(backend(createTask), repository).create(accountKey, {
      title: "Synthetic task",
      projectId: "project-a",
    });

    await expect(operation).rejects.toEqual(new AmbiguousMutationError("Task creation status could not be confirmed."));
    await expect(operation).rejects.not.toHaveProperty("cause");
    expect(createTask).toHaveBeenCalledOnce();
    expect(targetScopes.map((scope) => repository.peek(scope))).toEqual([undefined, undefined, undefined]);
  });

  it.each([
    ["task id with leading whitespace", "id", " task-confirmed"],
    ["task id with C0 control", "id", "task\u0000confirmed"],
    ["task id with C1 control", "id", "task\u007fconfirmed"],
    ["task id with format character", "id", "task\u200bconfirmed"],
    ["task id with a lone high surrogate", "id", "task-\ud800"],
    ["task id with a lone low surrogate", "id", "task-\udc00"],
    ["project id with trailing whitespace", "projectId", "project-a "],
    ["project id with C0 control", "projectId", "project\u0000a"],
    ["project id with C1 control", "projectId", "project\u007fa"],
    ["project id with format character", "projectId", "project\u200ba"],
    ["project id with a lone high surrogate", "projectId", "project-\ud800"],
    ["project id with a lone low surrogate", "projectId", "project-\udc00"],
  ] as const)(
    "maps a resolved confirmation containing an unsafe %s to fixed ambiguity",
    async (_case, field, value) => {
      const candidate = { ...confirmedTask, [field]: value };
      const createTask = vi.fn(async () => candidate);
      const repository = new TaskRepository(new InMemoryCachePort());
      const { targetScopes } = seedSnapshots(repository);

      await expect(
        service(backend(createTask), repository).create(accountKey, { title: "Synthetic task" })
      ).rejects.toEqual(new AmbiguousMutationError("Task creation status could not be confirmed."));

      expect(createTask).toHaveBeenCalledOnce();
      expect(targetScopes.map((scope) => repository.peek(scope))).toEqual([undefined, undefined, undefined]);
    }
  );

  it("accepts safe well-formed Unicode confirmation IDs", async () => {
    const unicodeTask = { ...confirmedTask, id: "task-résumé-😀", projectId: "project-résumé-😀" };

    await expect(
      service(backend(vi.fn(async () => unicodeTask))).create(accountKey, { title: "Synthetic task" })
    ).resolves.toBe(unicodeTask);
  });

  it("maps a hostile confirmation accessor to fixed ambiguity without reflecting private content", async () => {
    const marker = "PRIVATE CONFIRMATION";
    const candidate = Object.defineProperty({ ...confirmedTask }, "id", {
      get() {
        throw new Error(marker);
      },
    }) as Task;
    const createTask = vi.fn(async () => candidate);

    let failure: unknown;
    try {
      await service(backend(createTask)).create(accountKey, { title: "Synthetic task", projectId: "project-a" });
    } catch (error) {
      failure = error;
    }

    expect(failure).toEqual(new AmbiguousMutationError("Task creation status could not be confirmed."));
    expect(failure).not.toHaveProperty("cause");
    expect(String(failure)).not.toContain(marker);
    expect(createTask).toHaveBeenCalledOnce();
  });

  it("maps a revoked confirmation proxy to the same fixed ambiguity", async () => {
    const revoked = Proxy.revocable(confirmedTask, {});
    const createTask = vi.fn(async () => revoked.proxy);
    revoked.revoke();

    await expect(
      service(backend(createTask)).create(accountKey, { title: "Synthetic task", projectId: "project-a" })
    ).rejects.toEqual(new AmbiguousMutationError("Task creation status could not be confirmed."));
    expect(createTask).toHaveBeenCalledOnce();
  });

  it("does not let cache cleanup failure replace a confirmed remote result", async () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    vi.spyOn(repository, "invalidateAccountSnapshots").mockImplementation(() => {
      throw new Error("PRIVATE CACHE FAILURE");
    });

    await expect(
      service(backend(vi.fn(async () => confirmedTask)), repository).create(accountKey, {
        title: "Synthetic task",
        projectId: "project-a",
      })
    ).resolves.toBe(confirmedTask);
  });

  it("does not let cache cleanup failure replace adapter ambiguity", async () => {
    const ambiguity = new AmbiguousMutationError("Synthetic adapter ambiguity");
    const repository = new TaskRepository(new InMemoryCachePort());
    vi.spyOn(repository, "invalidateAccountSnapshots").mockImplementation(() => {
      throw new Error("PRIVATE CACHE FAILURE");
    });

    await expect(
      service(backend(vi.fn(async () => Promise.reject(ambiguity))), repository).create(accountKey, {
        title: "Synthetic task",
      })
    ).rejects.toBe(ambiguity);
  });

  it("does not inspect or stringify an unknown non-ambiguous backend failure", async () => {
    let inspected = 0;
    const failure = Object.defineProperties(Object.create(null), {
      message: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE message");
        },
      },
      toString: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE stringifier");
        },
      },
    });

    await expect(
      service(backend(vi.fn(async () => Promise.reject(failure)))).create(accountKey, { title: "Synthetic task" })
    ).rejects.toBe(failure);
    expect(inspected).toBe(0);
  });

  it("keeps confirmed creation free of concrete backends, platform APIs, storage, network, and retries", () => {
    const source = readFileSync(resolve(__dirname, "TaskCreationService.ts"), "utf8");

    expect(source).not.toMatch(
      /McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|BackendFactory|@raycast\/api|LocalStorage|run-applescript|\bfetch\b|console\.|setTimeout|retry|JSON\.stringify|String\(|\.toString\(|\.message\b/
    );
  });
});
