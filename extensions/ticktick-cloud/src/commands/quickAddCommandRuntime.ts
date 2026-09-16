import { applyDefaultDate, type QuickAddDefaults } from "../application/createDefaults";
import type { ReadyCommandRuntime } from "../application/commandRuntime";
import { projectTaskCreationRuntime } from "../application/taskCreationRuntime";
import type { TaskDestinationPreferencePort, TaskDestinationScope } from "../application/taskDestination";
import { ProtocolError } from "../domain/errors";
import type { CreateTaskInput } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TickTickService } from "../application/TickTickService";
import {
  executeQuickAddCommand,
  type QuickAddCommandEffects,
  type QuickAddCommandInput,
} from "./executeQuickAddCommand";

export type QuickAddCommandRuntimePorts = Readonly<{
  preferences: TaskDestinationPreferencePort;
  loadDefaults(): Promise<QuickAddDefaults>;
  effects: QuickAddCommandEffects;
}>;

type RuntimeSnapshot = Readonly<{
  backendId: TickTickBackend["id"];
  accountKey: string;
  createSupported: boolean;
  listProjects: TickTickService["listProjects"];
  taskService: TickTickService;
  createTask: ReturnType<typeof projectTaskCreationRuntime>["createTask"];
}>;

type EffectSnapshot = Readonly<{
  effects: QuickAddCommandEffects;
}>;

const INVALID_RUNTIME_MESSAGE = "TickTick task creation runtime is invalid.";
const INVALID_PORTS_MESSAGE = "TickTick Quick Add ports are invalid.";

export async function executeQuickAddFromRuntime(
  runtime: ReadyCommandRuntime,
  ports: QuickAddCommandRuntimePorts,
  input: QuickAddCommandInput
): Promise<void> {
  const runtimeSnapshot = snapshotRuntime(runtime);
  const effectSnapshot = snapshotEffects(ports);
  const preferences = createDeferredPreferences(ports);
  const loadDefaults = createDeferredDefaultsLoader(ports);
  const scope: TaskDestinationScope = Object.freeze({
    backendId: runtimeSnapshot.backendId,
    accountKey: runtimeSnapshot.accountKey,
  });

  await executeQuickAddCommand(
    Object.freeze({
      scope,
      preferences,
      effects: effectSnapshot.effects,
      listProjects: async () => {
        if (!runtimeSnapshot.createSupported) {
          throw new ProtocolError("This TickTick backend cannot create tasks.");
        }
        return await Reflect.apply(runtimeSnapshot.listProjects, runtimeSnapshot.taskService, [
          runtimeSnapshot.accountKey,
        ]);
      },
      createTask: async (createInput: CreateTaskInput) => {
        const defaults = await loadDefaults();
        return await runtimeSnapshot.createTask(applyDefaultDate(createInput, defaults));
      },
    }),
    input
  );
}

function snapshotRuntime(runtime: ReadyCommandRuntime): RuntimeSnapshot {
  const creationRuntime = projectTaskCreationRuntime(runtime);

  try {
    const backendId = runtime.backendId;
    const accountKey = runtime.accountKey;
    const createSupported = runtime.capabilities.create;
    const taskService = runtime.taskService;
    const listProjects = taskService.listProjects;

    if (
      (backendId !== "mcp" && backendId !== "openapi" && backendId !== "macos-legacy") ||
      typeof accountKey !== "string" ||
      accountKey.length === 0 ||
      typeof createSupported !== "boolean" ||
      !(taskService instanceof TickTickService) ||
      typeof listProjects !== "function"
    ) {
      throw invalidRuntime();
    }

    return Object.freeze({
      backendId,
      accountKey,
      createSupported,
      listProjects,
      taskService,
      createTask: creationRuntime.createTask,
    });
  } catch {
    throw invalidRuntime();
  }
}

function snapshotEffects(ports: QuickAddCommandRuntimePorts): EffectSnapshot {
  try {
    if (!isObject(ports)) throw invalidPorts();
    const commandEffects = ports.effects;
    if (!isObject(commandEffects)) throw invalidPorts();

    const showToast = commandEffects.showToast;
    if (typeof showToast !== "function") throw invalidPorts();

    return Object.freeze({
      effects: Object.freeze({
        showToast: (toast: Parameters<QuickAddCommandEffects["showToast"]>[0]) =>
          Reflect.apply(showToast, commandEffects, [toast]),
        closeMainWindow: (options: Parameters<QuickAddCommandEffects["closeMainWindow"]>[0]) => {
          let closeMainWindow: QuickAddCommandEffects["closeMainWindow"];
          try {
            closeMainWindow = commandEffects.closeMainWindow;
            if (typeof closeMainWindow !== "function") throw invalidPorts();
          } catch {
            throw invalidPorts();
          }
          return Reflect.apply(closeMainWindow, commandEffects, [options]);
        },
      }),
    });
  } catch {
    throw invalidPorts();
  }
}

function createDeferredPreferences(ports: QuickAddCommandRuntimePorts): TaskDestinationPreferencePort {
  return Object.freeze({
    load: async (scope: TaskDestinationScope): Promise<string | undefined> => {
      try {
        const preferences = ports.preferences;
        if (!isObject(preferences)) throw invalidPorts();
        const loadPreference = preferences.load;
        if (typeof loadPreference !== "function") throw invalidPorts();
        return (await Reflect.apply(loadPreference, preferences, [scope])) as string | undefined;
      } catch {
        throw invalidPorts();
      }
    },
    remember: async (scope: TaskDestinationScope, projectId: string): Promise<void> => {
      try {
        const preferences = ports.preferences;
        if (!isObject(preferences)) throw invalidPorts();
        const rememberPreference = preferences.remember;
        if (typeof rememberPreference !== "function") throw invalidPorts();
        await Reflect.apply(rememberPreference, preferences, [scope, projectId]);
      } catch {
        throw invalidPorts();
      }
    },
  });
}

function createDeferredDefaultsLoader(ports: QuickAddCommandRuntimePorts): () => Promise<QuickAddDefaults> {
  return async (): Promise<QuickAddDefaults> => {
    let loadDefaults: QuickAddCommandRuntimePorts["loadDefaults"];
    try {
      loadDefaults = ports.loadDefaults;
      if (typeof loadDefaults !== "function") throw invalidPorts();
    } catch {
      throw invalidPorts();
    }
    return await Reflect.apply(loadDefaults, ports, []);
  };
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidRuntime(): ProtocolError {
  return new ProtocolError(INVALID_RUNTIME_MESSAGE);
}

function invalidPorts(): ProtocolError {
  return new ProtocolError(INVALID_PORTS_MESSAGE);
}
