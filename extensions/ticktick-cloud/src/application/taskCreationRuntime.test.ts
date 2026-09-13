import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ProtocolError } from "../domain/errors";
import type { CreateTaskInput, Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { createReadyCommandRuntime, type ReadyCommandRuntime } from "./commandRuntime";
import { projectTaskCreationRuntime, type ReadyTaskCreationRuntime } from "./taskCreationRuntime";

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

function backend(id: TickTickBackend["id"] = "mcp", createTask = vi.fn(async () => confirmedTask)): TickTickBackend {
  return {
    id,
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

function runtime(source = backend(), accountKey = "oauth:account-a"): ReadyCommandRuntime {
  return createReadyCommandRuntime({
    backend: source,
    accountKey,
    repository: new TaskRepository(new InMemoryCachePort()),
  });
}

function captureFailure(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("projectTaskCreationRuntime", () => {
  it("returns a frozen least-authority ready projection with no private runtime dependencies", () => {
    const source = runtime();

    const projected: ReadyTaskCreationRuntime = projectTaskCreationRuntime(source);

    expect(projected.kind).toBe("ready");
    expect(projected.contextKey).toBe(source.contextKey);
    expect(Object.keys(projected).sort()).toEqual(["contextKey", "createTask", "kind"]);
    expect(projected).not.toHaveProperty("accountKey");
    expect(projected).not.toHaveProperty("backendId");
    expect(projected).not.toHaveProperty("backend");
    expect(projected).not.toHaveProperty("repository");
    expect(projected).not.toHaveProperty("capabilities");
    expect(projected).not.toHaveProperty("creationService");
    expect(Object.isFrozen(projected)).toBe(true);
    expect(() => Object.assign(projected, { contextKey: "PRIVATE" })).toThrow(TypeError);
  });

  it("forwards the exact input once through the captured account and returns exact confirmation", async () => {
    const createTask = vi.fn(async () => confirmedTask);
    const source = runtime(backend("mcp", createTask), "oauth:captured-account");
    const create = vi.spyOn(source.creationService, "create");
    const projected = projectTaskCreationRuntime(source);
    const input: CreateTaskInput = { title: "Synthetic task", projectId: "project-a" };

    const result = await projected.createTask(input);

    expect(result).toBe(confirmedTask);
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith("oauth:captured-account", input);
    expect(createTask).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith(input);
  });

  it("keeps backend/account projections distinct without exposing either identity", async () => {
    const firstRuntime = runtime(backend("mcp"), "oauth:account-a");
    const secondRuntime = runtime(backend("openapi"), "oauth:account-b");
    const firstCreate = vi.spyOn(firstRuntime.creationService, "create");
    const secondCreate = vi.spyOn(secondRuntime.creationService, "create");
    const first = projectTaskCreationRuntime(firstRuntime);
    const second = projectTaskCreationRuntime(secondRuntime);
    const input: CreateTaskInput = { title: "Synthetic task", projectId: "project-a" };

    await first.createTask(input);
    await second.createTask(input);

    expect(first.contextKey).not.toBe(second.contextKey);
    expect(JSON.stringify(first)).not.toContain("oauth:account-a");
    expect(JSON.stringify(second)).not.toContain("oauth:account-b");
    expect(firstCreate).toHaveBeenCalledWith("oauth:account-a", input);
    expect(secondCreate).toHaveBeenCalledWith("oauth:account-b", input);
  });

  it("rejects an object-shaped runtime clone before consulting any of its accessors", () => {
    const accepted = runtime();
    const reads = { kind: 0, contextKey: 0, accountKey: 0, creationService: 0 };
    const forged = {
      get kind() {
        reads.kind += 1;
        return "ready" as const;
      },
      get contextKey() {
        reads.contextKey += 1;
        return accepted.contextKey;
      },
      get accountKey() {
        reads.accountKey += 1;
        return "oauth:captured-account";
      },
      get creationService() {
        reads.creationService += 1;
        return accepted.creationService;
      },
    } as ReadyCommandRuntime;

    const failure = captureFailure(() => projectTaskCreationRuntime(forged));

    expect(failure).toEqual(new ProtocolError("TickTick task creation runtime is invalid."));
    expect(reads).toEqual({ kind: 0, contextKey: 0, accountKey: 0, creationService: 0 });
  });

  it.each(["kind", "contextKey", "accountKey", "creationService"] as const)(
    "maps a hostile %s accessor to a fixed privacy-safe protocol error",
    (field) => {
      const marker = `PRIVATE-${field}`;
      const accepted = runtime();
      const forged = Object.defineProperty({ ...accepted }, field, {
        get() {
          throw new Error(marker);
        },
      });

      const failure = captureFailure(() => projectTaskCreationRuntime(forged));

      expect(failure).toEqual(new ProtocolError("TickTick task creation runtime is invalid."));
      expect(String(failure)).not.toContain(marker);
    }
  );

  it("maps a revoked runtime or creation service proxy to the same fixed error", () => {
    const revokedRuntime = Proxy.revocable(runtime(), {});
    revokedRuntime.revoke();
    const runtimeFailure = captureFailure(() => projectTaskCreationRuntime(revokedRuntime.proxy));

    const accepted = runtime();
    const revokedService = Proxy.revocable(accepted.creationService, {});
    revokedService.revoke();
    const serviceFailure = captureFailure(() =>
      projectTaskCreationRuntime({ ...accepted, creationService: revokedService.proxy })
    );

    expect(runtimeFailure).toEqual(new ProtocolError("TickTick task creation runtime is invalid."));
    expect(serviceFailure).toEqual(new ProtocolError("TickTick task creation runtime is invalid."));
  });

  it("rejects a structurally forged creation service before it can observe the private account identity", () => {
    const accepted = runtime();
    const forgedCreate = vi.fn(async () => confirmedTask);
    const forged = {
      ...accepted,
      creationService: { create: forgedCreate },
    } as unknown as ReadyCommandRuntime;

    const failure = captureFailure(() => projectTaskCreationRuntime(forged));

    expect(failure).toEqual(new ProtocolError("TickTick task creation runtime is invalid."));
    expect(forgedCreate).not.toHaveBeenCalled();
  });

  it.each(["prototype", "proxy"] as const)(
    "rejects a %s-forged service and runtime before captured account identity can escape",
    (forgeKind) => {
      const accepted = runtime();
      const forgedCreate = vi.fn(async () => confirmedTask);
      const forgedService =
        forgeKind === "prototype"
          ? Object.assign(Object.create(accepted.creationService) as object, { create: forgedCreate })
          : new Proxy(accepted.creationService, {
              get(target, property, receiver) {
                return property === "create" ? forgedCreate : Reflect.get(target, property, receiver);
              },
            });
      let forgedRuntime: object;
      if (forgeKind === "prototype") {
        forgedRuntime = Object.create(accepted) as object;
        Object.defineProperty(forgedRuntime, "creationService", {
          value: forgedService,
          enumerable: true,
          configurable: true,
        });
      } else {
        forgedRuntime = { ...accepted, creationService: forgedService };
      }

      const failure = captureFailure(() => projectTaskCreationRuntime(forgedRuntime as ReadyCommandRuntime));

      expect(failure).toEqual(new ProtocolError("TickTick task creation runtime is invalid."));
      expect(forgedCreate).not.toHaveBeenCalled();
    }
  );

  it("preserves an unknown create failure without inspecting or stringifying it", async () => {
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
    const projected = projectTaskCreationRuntime(
      runtime(
        backend(
          "mcp",
          vi.fn(async () => Promise.reject(failure))
        )
      )
    );

    await expect(projected.createTask({ title: "Synthetic task" })).rejects.toBe(failure);
    expect(inspected).toBe(0);
  });

  it("keeps the projection free of concrete protocols, platform APIs, storage, network, and retries", () => {
    const source = readFileSync(resolve(__dirname, "taskCreationRuntime.ts"), "utf8");

    expect(source).not.toMatch(
      /McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|BackendFactory|@raycast\/api|LocalStorage|run-applescript|\bfetch\b|console\.|setTimeout|retry|JSON\.stringify|String\(|\.toString\(|\.message\b/
    );
  });
});
