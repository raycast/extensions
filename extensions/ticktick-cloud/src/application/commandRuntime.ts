import { createHash } from "node:crypto";

import type { BackendCapabilities, TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { ProtocolError } from "../domain/errors";
import { TaskCreationService } from "./TaskCreationService";
import { TaskMutationService } from "./TaskMutationService";
import { TickTickService } from "./TickTickService";

export type CommandRuntimeHandler = () => void | Promise<void>;

export interface ReadyCommandRuntimeInput {
  readonly backend: TickTickBackend;
  readonly accountKey: string;
  readonly repository: TaskRepository;
  readonly onReconnect?: CommandRuntimeHandler;
  readonly onOpenPreferences?: CommandRuntimeHandler;
}

export interface ReadyCommandRuntime {
  readonly kind: "ready";
  readonly backendId: TickTickBackend["id"];
  readonly accountKey: string;
  readonly contextKey: string;
  readonly taskService: TickTickService;
  readonly creationService: TaskCreationService;
  readonly mutationService: TaskMutationService;
  readonly capabilities: Readonly<BackendCapabilities>;
  readonly onReconnect?: CommandRuntimeHandler;
  readonly onOpenPreferences?: CommandRuntimeHandler;
}

export type CommandRuntimeState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "error"; error: unknown }>
  | ReadyCommandRuntime;

export type CommandRuntimeBootstrap = () => ReadyCommandRuntimeInput | Promise<ReadyCommandRuntimeInput>;

interface ReadyCommandRuntimeSnapshot {
  readonly backend: TickTickBackend;
  readonly repository: TaskRepository;
  readonly backendId: TickTickBackend["id"];
  readonly accountKey: string;
  readonly contextKey: string;
  readonly capabilities: Readonly<BackendCapabilities>;
  readonly onReconnect?: CommandRuntimeHandler;
  readonly onOpenPreferences?: CommandRuntimeHandler;
}

interface CommandRuntimeServices {
  readonly taskService: TickTickService;
  readonly creationService: TaskCreationService;
  readonly mutationService: TaskMutationService;
}

type CommandRuntimeServiceFactory = (
  dependencies: Readonly<{
    backend: TickTickBackend;
    backendId: TickTickBackend["id"];
    repository: TaskRepository;
    createSupported: boolean;
  }>
) => CommandRuntimeServices;

export interface CommandRuntimeController {
  load(bootstrap: CommandRuntimeBootstrap): Promise<void>;
  dispose(): void;
}

const LOADING_STATE: CommandRuntimeState = Object.freeze({ kind: "loading" });
const trustedReadyCommandRuntimes = new WeakSet<ReadyCommandRuntime>();

export function createReadyCommandRuntime(input: ReadyCommandRuntimeInput): ReadyCommandRuntime {
  return materializeReadyCommandRuntime(snapshotReadyCommandRuntimeInput(input), createCommandRuntimeServices);
}

function snapshotReadyCommandRuntimeInput(input: ReadyCommandRuntimeInput): ReadyCommandRuntimeSnapshot {
  const backend = readBoundary(() => input.backend, invalidDependencies);
  const repository = readBoundary(() => input.repository, invalidDependencies);
  if (
    !readBoundary(() => typeof backend === "object" && backend !== null && !Array.isArray(backend), invalidDependencies)
  ) {
    throw invalidDependencies();
  }
  if (!readBoundary(() => repository instanceof TaskRepository, invalidDependencies)) throw invalidDependencies();

  const backendId = snapshotBackendId(readBoundary(() => backend.id, invalidIdentity));
  const accountKey = snapshotAccountKey(readBoundary(() => input.accountKey, invalidIdentity));
  const contextKey = createContextKey(backendId, accountKey);
  const onReconnect = snapshotHandler(readBoundary(() => input.onReconnect, invalidHandlers));
  const onOpenPreferences = snapshotHandler(readBoundary(() => input.onOpenPreferences, invalidHandlers));
  const readCapabilities = readBoundary(() => backend.capabilities, invalidCapabilities);
  if (typeof readCapabilities !== "function") throw invalidCapabilities();
  const capabilities = snapshotCapabilities(readBoundary(() => readCapabilities.call(backend), invalidCapabilities));

  return Object.freeze({
    backend,
    repository,
    backendId,
    accountKey,
    contextKey,
    capabilities,
    onReconnect,
    onOpenPreferences,
  });
}

function materializeReadyCommandRuntime(
  snapshot: ReadyCommandRuntimeSnapshot,
  createServices: CommandRuntimeServiceFactory
): ReadyCommandRuntime {
  const services = createServices(
    Object.freeze({
      backend: snapshot.backend,
      backendId: snapshot.backendId,
      repository: snapshot.repository,
      createSupported: snapshot.capabilities.create,
    })
  );

  const runtime: ReadyCommandRuntime = Object.freeze({
    kind: "ready",
    backendId: snapshot.backendId,
    accountKey: snapshot.accountKey,
    contextKey: snapshot.contextKey,
    taskService: services.taskService,
    creationService: services.creationService,
    mutationService: services.mutationService,
    capabilities: snapshot.capabilities,
    onReconnect: snapshot.onReconnect,
    onOpenPreferences: snapshot.onOpenPreferences,
  });
  trustedReadyCommandRuntimes.add(runtime);
  return runtime;
}

export function isTrustedReadyCommandRuntime(value: unknown): value is ReadyCommandRuntime {
  try {
    return typeof value === "object" && value !== null && trustedReadyCommandRuntimes.has(value as ReadyCommandRuntime);
  } catch {
    return false;
  }
}

function createCommandRuntimeServices(
  dependencies: Readonly<{
    backend: TickTickBackend;
    backendId: TickTickBackend["id"];
    repository: TaskRepository;
    createSupported: boolean;
  }>
): CommandRuntimeServices {
  return Object.freeze({
    taskService: new TickTickService(dependencies),
    creationService: new TaskCreationService(dependencies),
    mutationService: new TaskMutationService(dependencies),
  });
}

function createContextKey(backendId: TickTickBackend["id"], accountKey: string): string {
  return createHash("sha256")
    .update("ticktick-command-runtime-v1\0")
    .update(backendId)
    .update("\0")
    .update(accountKey)
    .digest("hex");
}

function snapshotBackendId(value: unknown): TickTickBackend["id"] {
  if (value !== "mcp" && value !== "openapi" && value !== "macos-legacy") throw invalidIdentity();
  return value;
}

function snapshotAccountKey(value: unknown): string {
  if (!isSafeAccountKey(value)) throw invalidIdentity();
  return value;
}

function isSafeAccountKey(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return !Array.from(value).some((character) => /\p{Cf}/u.test(character));
}

function snapshotHandler(value: unknown): CommandRuntimeHandler | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "function") return value as CommandRuntimeHandler;
  throw invalidHandlers();
}

export function createCommandRuntimeController(
  publish: (state: CommandRuntimeState) => void,
  createServices: CommandRuntimeServiceFactory = createCommandRuntimeServices
): CommandRuntimeController {
  let generation = 0;
  let disposed = false;

  return {
    async load(bootstrap) {
      if (disposed) return;
      const currentGeneration = ++generation;
      publish(LOADING_STATE);
      if (disposed || currentGeneration !== generation) return;

      try {
        const input = await bootstrap();
        if (disposed || currentGeneration !== generation) return;
        const snapshot = snapshotReadyCommandRuntimeInput(input);
        if (disposed || currentGeneration !== generation) return;
        const runtime = materializeReadyCommandRuntime(snapshot, createServices);
        if (disposed || currentGeneration !== generation) return;
        publish(runtime);
      } catch (error) {
        if (disposed || currentGeneration !== generation) return;
        publish(Object.freeze({ kind: "error", error }));
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
    },
  };
}

function snapshotCapabilities(value: unknown): Readonly<BackendCapabilities> {
  if (!readBoundary(() => typeof value === "object" && value !== null && !Array.isArray(value), invalidCapabilities)) {
    throw invalidCapabilities();
  }
  const candidate = value as Record<keyof BackendCapabilities, unknown>;
  let create: unknown;
  let update: unknown;
  let complete: unknown;
  let reopen: unknown;
  let move: unknown;
  let completedQuery: unknown;
  let inboxQuery: unknown;
  let exactTaskLink: unknown;
  try {
    create = candidate.create;
    update = candidate.update;
    complete = candidate.complete;
    reopen = candidate.reopen;
    move = candidate.move;
    completedQuery = candidate.completedQuery;
    inboxQuery = candidate.inboxQuery;
    exactTaskLink = candidate.exactTaskLink;
  } catch {
    throw invalidCapabilities();
  }

  if (
    typeof create !== "boolean" ||
    typeof update !== "boolean" ||
    typeof complete !== "boolean" ||
    typeof reopen !== "boolean" ||
    typeof move !== "boolean" ||
    typeof completedQuery !== "boolean" ||
    typeof inboxQuery !== "boolean" ||
    typeof exactTaskLink !== "boolean"
  ) {
    throw invalidCapabilities();
  }

  return Object.freeze({ create, update, complete, reopen, move, completedQuery, inboxQuery, exactTaskLink });
}

function invalidCapabilities(): ProtocolError {
  return new ProtocolError("TickTick command runtime capabilities are invalid.");
}

function invalidDependencies(): ProtocolError {
  return new ProtocolError("TickTick command runtime dependencies are invalid.");
}

function invalidIdentity(): ProtocolError {
  return new ProtocolError("TickTick command runtime identity is invalid.");
}

function invalidHandlers(): ProtocolError {
  return new ProtocolError("TickTick command runtime handlers are invalid.");
}

function readBoundary<Value>(read: () => Value, failure: () => ProtocolError): Value {
  try {
    return read();
  } catch {
    throw failure();
  }
}
