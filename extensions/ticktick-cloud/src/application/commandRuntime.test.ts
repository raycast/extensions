import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ProtocolError } from "../domain/errors";
import type { BackendCapabilities, TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { TaskCreationService } from "./TaskCreationService";
import { TaskMutationService } from "./TaskMutationService";
import { TickTickService } from "./TickTickService";
import {
  createCommandRuntimeController,
  createReadyCommandRuntime,
  isTrustedReadyCommandRuntime,
  type CommandRuntimeState,
} from "./commandRuntime";

const CAPABILITIES: BackendCapabilities = {
  create: true,
  update: true,
  complete: true,
  reopen: true,
  move: true,
  completedQuery: true,
  inboxQuery: true,
  exactTaskLink: true,
};

function backend(id: TickTickBackend["id"] = "mcp"): TickTickBackend {
  return {
    id,
    capabilities: vi.fn(() => ({ ...CAPABILITIES })),
    accountIdentity: async () => undefined,
    listProjects: async () => [],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask: async () => {
      throw new Error("unused");
    },
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

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function captureFailure(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("createReadyCommandRuntime", () => {
  it("constructs and freezes one backend-neutral ready bundle", () => {
    const source = backend();
    const repository = new TaskRepository(new InMemoryCachePort());

    const runtime = createReadyCommandRuntime({ backend: source, accountKey: "account-a", repository });

    expect(runtime.kind).toBe("ready");
    expect(runtime.backendId).toBe("mcp");
    expect(runtime.accountKey).toBe("account-a");
    expect(runtime.taskService).toBeInstanceOf(TickTickService);
    expect(runtime.creationService).toBeInstanceOf(TaskCreationService);
    expect(runtime.mutationService).toBeInstanceOf(TaskMutationService);
    expect(runtime.capabilities).toEqual(CAPABILITIES);
    expect(source.capabilities).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Object.isFrozen(runtime.capabilities)).toBe(true);
  });

  it("brands only exact command-runtime-created bundles as trusted", () => {
    const accepted = createReadyCommandRuntime({
      backend: backend(),
      accountKey: "account-a",
      repository: new TaskRepository(new InMemoryCachePort()),
    });

    expect(isTrustedReadyCommandRuntime(accepted)).toBe(true);
    expect(isTrustedReadyCommandRuntime({ ...accepted })).toBe(false);
    expect(isTrustedReadyCommandRuntime(Object.create(accepted))).toBe(false);
    expect(isTrustedReadyCommandRuntime(new Proxy(accepted, {}))).toBe(false);
  });

  it("derives a stable opaque context key that changes with backend or account identity", () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    const privateAccount = "oauth:PRIVATE-account-a";
    const first = createReadyCommandRuntime({ backend: backend("mcp"), accountKey: privateAccount, repository });
    const same = createReadyCommandRuntime({ backend: backend("mcp"), accountKey: privateAccount, repository });
    const otherAccount = createReadyCommandRuntime({
      backend: backend("mcp"),
      accountKey: "oauth:PRIVATE-account-b",
      repository,
    });
    const otherBackend = createReadyCommandRuntime({
      backend: backend("openapi"),
      accountKey: privateAccount,
      repository,
    });

    expect(first.contextKey).toMatch(/^[a-f0-9]{64}$/);
    expect(first.contextKey).toBe(same.contextKey);
    expect(first.contextKey).not.toBe(otherAccount.contextKey);
    expect(first.contextKey).not.toBe(otherBackend.contextKey);
    expect(first.contextKey).not.toContain(privateAccount);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("passes the one snapshotted create capability into confirmed creation", async () => {
    const source = backend();
    source.capabilities = vi.fn(() => ({ ...CAPABILITIES, create: false }));
    source.createTask = vi.fn(async () => {
      throw new Error("must not run");
    });
    const runtime = createReadyCommandRuntime({
      backend: source,
      accountKey: "account-a",
      repository: new TaskRepository(new InMemoryCachePort()),
    });

    await expect(runtime.creationService.create("account-a", { title: "Synthetic task" })).rejects.toEqual(
      new ProtocolError("This TickTick backend cannot create tasks.")
    );
    expect(source.capabilities).toHaveBeenCalledOnce();
    expect(source.createTask).not.toHaveBeenCalled();
  });

  it("fails closed with a fixed error when a hostile capability is not boolean", () => {
    const marker = "PRIVATE CAPABILITY VALUE";
    const source = backend();
    source.capabilities = vi.fn(
      () =>
        ({
          ...CAPABILITIES,
          get create() {
            return marker as unknown as boolean;
          },
        } satisfies BackendCapabilities)
    );

    expect(() =>
      createReadyCommandRuntime({
        backend: source,
        accountKey: "account-a",
        repository: new TaskRepository(new InMemoryCachePort()),
      })
    ).toThrowError(new ProtocolError("TickTick command runtime capabilities are invalid."));

    try {
      createReadyCommandRuntime({
        backend: source,
        accountKey: "account-a",
        repository: new TaskRepository(new InMemoryCachePort()),
      });
    } catch (error) {
      expect(String(error)).not.toContain(marker);
    }
  });

  it("rejects a non-canonical backend identity without reflecting its value", () => {
    const marker = "PRIVATE-BACKEND-ID";
    const source = backend();
    Object.defineProperty(source, "id", { get: () => marker });

    let failure: unknown;
    try {
      createReadyCommandRuntime({
        backend: source,
        accountKey: "account-a",
        repository: new TaskRepository(new InMemoryCachePort()),
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toEqual(new ProtocolError("TickTick command runtime identity is invalid."));
    expect(String(failure)).not.toContain(marker);
  });

  it("reads an account identity accessor once and rejects a blank value safely", () => {
    let reads = 0;
    const input = {
      backend: backend(),
      get accountKey() {
        reads += 1;
        return "   ";
      },
      repository: new TaskRepository(new InMemoryCachePort()),
    };

    expect(() => createReadyCommandRuntime(input)).toThrowError(
      new ProtocolError("TickTick command runtime identity is invalid.")
    );
    expect(reads).toBe(1);
  });

  it.each([
    ["leading whitespace", " account"],
    ["trailing whitespace", "account "],
    ["C0 control", "account\u0000key"],
    ["C1 control", "account\u007fkey"],
    ["format character", "account\u200bkey"],
    ["lone high surrogate", "account-\ud800"],
    ["lone low surrogate", "account-\udc00"],
    ["unpaired high surrogate", "account-\ud800x"],
  ])("rejects an unsafe %s account identity before deriving a collision-prone key", (_case, accountKey) => {
    expect(() =>
      createReadyCommandRuntime({
        backend: backend(),
        accountKey,
        repository: new TaskRepository(new InMemoryCachePort()),
      })
    ).toThrowError(new ProtocolError("TickTick command runtime identity is invalid."));
  });

  it("accepts a well-formed Unicode account identity", () => {
    const runtime = createReadyCommandRuntime({
      backend: backend(),
      accountKey: "oauth:résumé-😀",
      repository: new TaskRepository(new InMemoryCachePort()),
    });

    expect(runtime.accountKey).toBe("oauth:résumé-😀");
    expect(runtime.contextKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reads a hostile handler accessor once and rejects a non-function without reflecting it", () => {
    const marker = "PRIVATE-HANDLER";
    let reads = 0;
    const input = {
      backend: backend(),
      accountKey: "account-a",
      repository: new TaskRepository(new InMemoryCachePort()),
      get onReconnect() {
        reads += 1;
        return marker as unknown as () => void;
      },
    };

    let failure: unknown;
    try {
      createReadyCommandRuntime(input);
    } catch (error) {
      failure = error;
    }

    expect(failure).toEqual(new ProtocolError("TickTick command runtime handlers are invalid."));
    expect(String(failure)).not.toContain(marker);
    expect(reads).toBe(1);
  });

  it("snapshots every injected accessor once and detaches immutable capabilities from the backend", () => {
    const reads = {
      backend: 0,
      backendId: 0,
      accountKey: 0,
      repository: 0,
      reconnect: 0,
      preferences: 0,
      capabilities: 0,
      capabilityFields: 0,
    };
    const mutableCapabilities = { ...CAPABILITIES };
    const reconnect = vi.fn();
    const preferences = vi.fn();
    const repository = new TaskRepository(new InMemoryCachePort());
    const source = backend();
    Object.defineProperty(source, "id", {
      get() {
        reads.backendId += 1;
        return "mcp";
      },
    });
    const capabilityDescriptors = Object.fromEntries(
      Object.entries(mutableCapabilities).map(([key, value]) => [
        key,
        {
          enumerable: true,
          get() {
            reads.capabilityFields += 1;
            return value;
          },
        },
      ])
    );
    source.capabilities = vi.fn(() => {
      reads.capabilities += 1;
      return Object.create(Object.prototype, capabilityDescriptors) as BackendCapabilities;
    });
    const input = {
      get backend() {
        reads.backend += 1;
        return source;
      },
      get accountKey() {
        reads.accountKey += 1;
        return "account-accessor";
      },
      get repository() {
        reads.repository += 1;
        return repository;
      },
      get onReconnect() {
        reads.reconnect += 1;
        return reconnect;
      },
      get onOpenPreferences() {
        reads.preferences += 1;
        return preferences;
      },
    };

    const runtime = createReadyCommandRuntime(input);
    mutableCapabilities.create = false;

    expect(reads).toEqual({
      backend: 1,
      backendId: 1,
      accountKey: 1,
      repository: 1,
      reconnect: 1,
      preferences: 1,
      capabilities: 1,
      capabilityFields: 8,
    });
    expect(source.capabilities).toHaveBeenCalledTimes(1);
    expect(runtime.capabilities.create).toBe(true);
    expect(runtime.onReconnect).toBe(reconnect);
    expect(runtime.onOpenPreferences).toBe(preferences);
    expect(() => Object.assign(runtime.capabilities, { create: false })).toThrow(TypeError);
    expect(runtime.capabilities.create).toBe(true);
  });

  it.each([
    ["backend", "TickTick command runtime dependencies are invalid."],
    ["repository", "TickTick command runtime dependencies are invalid."],
    ["accountKey", "TickTick command runtime identity is invalid."],
    ["onReconnect", "TickTick command runtime handlers are invalid."],
    ["onOpenPreferences", "TickTick command runtime handlers are invalid."],
  ] as const)("maps a throwing top-level %s accessor to a fixed privacy-safe error", (field, expectedMessage) => {
    const marker = `PRIVATE-${field}`;
    const values = {
      backend: backend(),
      repository: new TaskRepository(new InMemoryCachePort()),
      accountKey: "account-a",
      onReconnect: vi.fn(),
      onOpenPreferences: vi.fn(),
    };
    const input = Object.defineProperty({ ...values }, field, {
      get() {
        throw new Error(marker);
      },
    });

    const failure = captureFailure(() =>
      createReadyCommandRuntime(input as unknown as Parameters<typeof createReadyCommandRuntime>[0])
    );

    expect(failure).toEqual(new ProtocolError(expectedMessage));
    expect(String(failure)).not.toContain(marker);
  });

  it("maps throwing backend identity and capability accessors to fixed privacy-safe errors", () => {
    const repository = new TaskRepository(new InMemoryCachePort());
    const identityMarker = "PRIVATE-BACKEND-IDENTITY";
    const identityBackend = backend();
    Object.defineProperty(identityBackend, "id", {
      get() {
        throw new Error(identityMarker);
      },
    });
    const identityFailure = captureFailure(() =>
      createReadyCommandRuntime({ backend: identityBackend, accountKey: "account-a", repository })
    );

    const methodMarker = "PRIVATE-CAPABILITY-METHOD";
    const methodBackend = backend();
    Object.defineProperty(methodBackend, "capabilities", {
      get() {
        throw new Error(methodMarker);
      },
    });
    const methodFailure = captureFailure(() =>
      createReadyCommandRuntime({ backend: methodBackend, accountKey: "account-a", repository })
    );

    const fieldMarker = "PRIVATE-CAPABILITY-FIELD";
    const fieldBackend = backend();
    fieldBackend.capabilities = () =>
      Object.defineProperty({ ...CAPABILITIES }, "create", {
        get() {
          throw new Error(fieldMarker);
        },
      });
    const fieldFailure = captureFailure(() =>
      createReadyCommandRuntime({ backend: fieldBackend, accountKey: "account-a", repository })
    );

    expect(identityFailure).toEqual(new ProtocolError("TickTick command runtime identity is invalid."));
    expect(methodFailure).toEqual(new ProtocolError("TickTick command runtime capabilities are invalid."));
    expect(fieldFailure).toEqual(new ProtocolError("TickTick command runtime capabilities are invalid."));
    expect([String(identityFailure), String(methodFailure), String(fieldFailure)].join(" ")).not.toMatch(
      /PRIVATE-BACKEND-IDENTITY|PRIVATE-CAPABILITY-METHOD|PRIVATE-CAPABILITY-FIELD/
    );
  });

  it("maps a revoked backend proxy to the fixed dependency error", () => {
    const revoked = Proxy.revocable(backend(), {});
    revoked.revoke();

    const failure = captureFailure(() =>
      createReadyCommandRuntime({
        backend: revoked.proxy,
        accountKey: "account-a",
        repository: new TaskRepository(new InMemoryCachePort()),
      })
    );

    expect(failure).toEqual(new ProtocolError("TickTick command runtime dependencies are invalid."));
  });

  it("maps a revoked capabilities proxy to the fixed capabilities error", () => {
    const source = backend();
    const revoked = Proxy.revocable({ ...CAPABILITIES }, {});
    source.capabilities = () => revoked.proxy;
    revoked.revoke();

    const failure = captureFailure(() =>
      createReadyCommandRuntime({
        backend: source,
        accountKey: "account-a",
        repository: new TaskRepository(new InMemoryCachePort()),
      })
    );

    expect(failure).toEqual(new ProtocolError("TickTick command runtime capabilities are invalid."));
  });
});

describe("createCommandRuntimeController", () => {
  it("publishes loading followed by a frozen ready runtime", async () => {
    const states: CommandRuntimeState[] = [];
    const controller = createCommandRuntimeController((state) => states.push(state));

    await controller.load(async () => ({
      backend: backend(),
      accountKey: "account-a",
      repository: new TaskRepository(new InMemoryCachePort()),
    }));

    expect(states.map((state) => state.kind)).toEqual(["loading", "ready"]);
    expect(Object.isFrozen(states[0])).toBe(true);
    expect(Object.isFrozen(states[1])).toBe(true);
  });

  it("publishes a raw unknown bootstrap error without inspecting or stringifying it", async () => {
    const states: CommandRuntimeState[] = [];
    let inspected = 0;
    const marker = Object.defineProperties(Object.create(null), {
      message: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE getter should not run");
        },
      },
      toString: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE stringifier should not run");
        },
      },
      toJSON: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE serializer should not run");
        },
      },
    });
    const controller = createCommandRuntimeController((state) => states.push(state));

    await controller.load(async () => Promise.reject(marker));

    expect(states.map((state) => state.kind)).toEqual(["loading", "error"]);
    const errorState = states[1];
    expect(errorState.kind).toBe("error");
    if (errorState.kind !== "error") throw new Error("expected error state");
    expect(errorState.error).toBe(marker);
    expect(Object.isFrozen(errorState)).toBe(true);
    expect(inspected).toBe(0);
  });

  it("lets a newer backend and account generation supersede an unresolved older load", async () => {
    const states: CommandRuntimeState[] = [];
    const oldBackend = backend("mcp");
    const newBackend = backend("openapi");
    const oldReconnect = vi.fn();
    const newReconnect = vi.fn();
    const oldInput = deferred<Parameters<typeof createReadyCommandRuntime>[0]>();
    const controller = createCommandRuntimeController((state) => states.push(state));

    const oldLoad = controller.load(() => oldInput.promise);
    await controller.load(async () => ({
      backend: newBackend,
      accountKey: "account-new",
      repository: new TaskRepository(new InMemoryCachePort()),
      onReconnect: newReconnect,
    }));
    oldInput.resolve({
      backend: oldBackend,
      accountKey: "account-old",
      repository: new TaskRepository(new InMemoryCachePort()),
      onReconnect: oldReconnect,
    });
    await oldLoad;

    expect(states.map((state) => state.kind)).toEqual(["loading", "loading", "ready"]);
    const ready = states[2];
    expect(ready.kind).toBe("ready");
    if (ready.kind !== "ready") throw new Error("expected ready state");
    expect(ready.backendId).toBe("openapi");
    expect(ready.accountKey).toBe("account-new");
    expect(ready.onReconnect).toBe(newReconnect);
    expect(ready.onReconnect).not.toBe(oldReconnect);
    expect(oldBackend.capabilities).not.toHaveBeenCalled();
    expect(newBackend.capabilities).toHaveBeenCalledTimes(1);
  });

  it("rechecks generation after hostile snapshots before constructing services for a replacement context", async () => {
    const states: CommandRuntimeState[] = [];
    const oldBackend = backend("mcp");
    const newBackend = backend("openapi");
    const newRepository = new TaskRepository(new InMemoryCachePort());
    let replacementLoad: Promise<void> | undefined;
    const createServices = vi.fn(
      ({
        backend: source,
        backendId,
        repository,
        createSupported,
      }: {
        backend: TickTickBackend;
        backendId: TickTickBackend["id"];
        repository: TaskRepository;
        createSupported: boolean;
      }) => ({
        taskService: new TickTickService({ backend: source, repository }),
        creationService: new TaskCreationService({ backend: source, backendId, repository, createSupported }),
        mutationService: new TaskMutationService({ backend: source, repository }),
      })
    );
    oldBackend.capabilities = vi.fn(() => {
      replacementLoad = controller.load(async () => ({
        backend: newBackend,
        accountKey: "account-new",
        repository: newRepository,
      }));
      return { ...CAPABILITIES };
    });
    const controller = createCommandRuntimeController((state) => states.push(state), createServices);

    await controller.load(async () => ({
      backend: oldBackend,
      accountKey: "account-old",
      repository: new TaskRepository(new InMemoryCachePort()),
    }));
    await replacementLoad;

    expect(createServices).toHaveBeenCalledTimes(1);
    expect(createServices.mock.calls[0]?.[0]).toEqual({
      backend: newBackend,
      backendId: "openapi",
      repository: newRepository,
      createSupported: true,
    });
    expect(states.map((state) => state.kind)).toEqual(["loading", "loading", "ready"]);
    const ready = states.at(-1);
    expect(ready?.kind).toBe("ready");
    if (ready?.kind !== "ready") throw new Error("expected ready state");
    expect(ready.backendId).toBe("openapi");
    expect(ready.accountKey).toBe("account-new");
  });

  it("rechecks disposal after hostile snapshots before constructing services", async () => {
    const states: CommandRuntimeState[] = [];
    const source = backend();
    const createServices = vi.fn(
      ({
        backend: serviceBackend,
        backendId,
        repository,
        createSupported,
      }: {
        backend: TickTickBackend;
        backendId: TickTickBackend["id"];
        repository: TaskRepository;
        createSupported: boolean;
      }) => ({
        taskService: new TickTickService({ backend: serviceBackend, repository }),
        creationService: new TaskCreationService({
          backend: serviceBackend,
          backendId,
          repository,
          createSupported,
        }),
        mutationService: new TaskMutationService({ backend: serviceBackend, repository }),
      })
    );
    source.capabilities = vi.fn(() => {
      controller.dispose();
      return { ...CAPABILITIES };
    });
    const controller = createCommandRuntimeController((state) => states.push(state), createServices);

    await controller.load(async () => ({
      backend: source,
      accountKey: "account-disposed-during-snapshot",
      repository: new TaskRepository(new InMemoryCachePort()),
    }));

    expect(createServices).not.toHaveBeenCalled();
    expect(states.map((state) => state.kind)).toEqual(["loading"]);
  });

  it("disposal prevents an unresolved or future load from publishing or constructing services", async () => {
    const states: CommandRuntimeState[] = [];
    const source = backend();
    const input = deferred<Parameters<typeof createReadyCommandRuntime>[0]>();
    const controller = createCommandRuntimeController((state) => states.push(state));
    const pending = controller.load(() => input.promise);

    controller.dispose();
    input.resolve({
      backend: source,
      accountKey: "account-disposed",
      repository: new TaskRepository(new InMemoryCachePort()),
    });
    await pending;

    const futureBootstrap = vi.fn(async () => ({
      backend: source,
      accountKey: "account-future",
      repository: new TaskRepository(new InMemoryCachePort()),
    }));
    await controller.load(futureBootstrap);

    expect(states.map((state) => state.kind)).toEqual(["loading"]);
    expect(source.capabilities).not.toHaveBeenCalled();
    expect(futureBootstrap).not.toHaveBeenCalled();
  });

  it("replaces completed services and handlers when the backend/account context changes", async () => {
    const states: CommandRuntimeState[] = [];
    const oldReconnect = vi.fn();
    const newReconnect = vi.fn();
    const controller = createCommandRuntimeController((state) => states.push(state));

    await controller.load(async () => ({
      backend: backend("mcp"),
      accountKey: "account-a",
      repository: new TaskRepository(new InMemoryCachePort()),
      onReconnect: oldReconnect,
    }));
    const oldReady = states.at(-1);
    await controller.load(async () => ({
      backend: backend("openapi"),
      accountKey: "account-b",
      repository: new TaskRepository(new InMemoryCachePort()),
      onReconnect: newReconnect,
    }));
    const newReady = states.at(-1);

    expect(oldReady?.kind).toBe("ready");
    expect(newReady?.kind).toBe("ready");
    if (oldReady?.kind !== "ready" || newReady?.kind !== "ready") throw new Error("expected ready states");
    expect(newReady.backendId).toBe("openapi");
    expect(newReady.accountKey).toBe("account-b");
    expect(newReady.taskService).not.toBe(oldReady.taskService);
    expect(newReady.creationService).not.toBe(oldReady.creationService);
    expect(newReady.mutationService).not.toBe(oldReady.mutationService);
    expect(newReady.onReconnect).toBe(newReconnect);
    expect(newReady.onReconnect).not.toBe(oldReconnect);
  });

  it("keeps the runtime kernel free of concrete protocols, platform APIs, persistence, I/O, retries, and inspection", () => {
    const source = readFileSync(resolve(__dirname, "commandRuntime.ts"), "utf8");

    expect(source).not.toMatch(
      /McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|BackendFactory|AuthProvider|@raycast\/api|LocalStorage|run-applescript|\bfetch\b|console\.|setTimeout|retry|JSON\.stringify|String\(|\.toString\(|\.message\b/
    );
  });
});
