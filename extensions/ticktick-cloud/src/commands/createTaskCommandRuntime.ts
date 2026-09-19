import moment from "moment-timezone";

import type { ReadyCommandRuntime } from "../application/commandRuntime";
import type { CreateFormDefaults } from "../application/createDefaults";
import { throwIfAborted } from "../application/readPolicy";
import { projectTaskCreationRuntime } from "../application/taskCreationRuntime";
import {
  loadTaskDestinationContext,
  type TaskDestinationPreferencePort,
  type TaskDestinationScope,
} from "../application/taskDestination";
import type { CreateTaskReadyRuntime } from "../components/CreateTaskCommand";
import type { TaskFormFieldAvailability } from "../components/TaskForm";
import { ProtocolError } from "../domain/errors";

export type CreateTaskCommandRuntimeDependencies = Readonly<{
  preferences: TaskDestinationPreferencePort;
  loadDefaults(): Promise<CreateFormDefaults>;
  fieldAvailability: Partial<TaskFormFieldAvailability>;
}>;

const CREATE_UNSUPPORTED_MESSAGE = "This TickTick backend cannot create tasks.";
const INVALID_DEPENDENCIES_MESSAGE = "TickTick create command runtime dependencies are invalid.";
const FIELD_NAMES = Object.freeze([
  "project",
  "description",
  "startDate",
  "dueDate",
  "isAllDay",
  "priority",
  "tags",
] as const satisfies readonly (keyof TaskFormFieldAvailability)[]);
const UNSAFE_TEXT_PATTERN = /[\p{Cc}\p{Cf}]/u;

export async function prepareCreateTaskCommandRuntime(
  runtime: ReadyCommandRuntime,
  dependencies: CreateTaskCommandRuntimeDependencies,
  signal?: AbortSignal
): Promise<CreateTaskReadyRuntime> {
  const creationRuntime = projectTaskCreationRuntime(runtime);
  const createSupported = readBoundary(() => runtime.capabilities.create);
  if (createSupported !== true) throw new ProtocolError(CREATE_UNSUPPORTED_MESSAGE);

  throwIfAborted(signal);
  const backendId = readBoundary(() => runtime.backendId);
  const accountKey = readBoundary(() => runtime.accountKey);
  const taskService = readBoundary(() => runtime.taskService);
  const listProjects = readBoundary(() => taskService.listProjects);
  if (typeof listProjects !== "function") throw invalidDependencies();

  const scope: TaskDestinationScope = Object.freeze({ backendId, accountKey });
  let preferences: TaskDestinationPreferencePort | undefined;
  let preferenceSnapshotFailure: ProtocolError | undefined;
  let preferenceSnapshotAttempted = false;
  let catalogGateFailure: unknown;
  let catalogGateFailed = false;
  const gatedPreferences: TaskDestinationPreferencePort = Object.freeze({
    load: Object.freeze(async (receivedScope: TaskDestinationScope) => {
      try {
        throwIfAborted(signal);
      } catch (error) {
        catalogGateFailed = true;
        catalogGateFailure = error;
        return undefined;
      }
      if (!preferenceSnapshotAttempted) {
        preferenceSnapshotAttempted = true;
        try {
          preferences = snapshotPreferencePort(dependencies);
        } catch {
          preferenceSnapshotFailure = invalidDependencies();
        }
      }
      return preferences?.load(receivedScope);
    }),
    remember: Object.freeze(async () => undefined),
  });
  const destination = await loadTaskDestinationContext({
    scope,
    preferences: gatedPreferences,
    listProjects: () => {
      throwIfAborted(signal);
      return Reflect.apply(listProjects, taskService, [accountKey, false, signal]);
    },
  });
  if (catalogGateFailed) throw catalogGateFailure;
  if (preferenceSnapshotFailure !== undefined) throw preferenceSnapshotFailure;
  if (preferences === undefined) throw invalidDependencies();
  throwIfAborted(signal);

  const loadDefaults = readBoundary(() => dependencies.loadDefaults);
  if (typeof loadDefaults !== "function") throw invalidDependencies();
  const loadedDefaults = await Reflect.apply(loadDefaults, dependencies, []);
  throwIfAborted(signal);
  const defaults = snapshotDefaults(loadedDefaults);
  const fieldAvailability = snapshotFieldAvailability(readBoundary(() => dependencies.fieldAvailability));
  throwIfAborted(signal);

  const createTask = creationRuntime.createTask;
  Object.freeze(createTask);
  const boundPreferences = preferences;
  const rememberProjectId = Object.freeze((projectId: string) => boundPreferences.remember(scope, projectId));

  return Object.freeze({
    kind: "ready",
    contextKey: creationRuntime.contextKey,
    projects: destination.projects,
    uiTimeZone: defaults.uiTimeZone,
    ...(destination.destination === undefined ? {} : { rememberedProjectId: destination.destination.id }),
    ...(defaults.defaultTitle === undefined ? {} : { defaultTitle: defaults.defaultTitle }),
    ...(defaults.defaultDate === undefined ? {} : { defaultDate: defaults.defaultDate }),
    fieldAvailability,
    createTask,
    rememberProjectId,
  });
}

function snapshotPreferencePort(dependencies: CreateTaskCommandRuntimeDependencies): TaskDestinationPreferencePort {
  const preferences = readBoundary(() => dependencies.preferences);
  if (
    !readBoundary(
      () =>
        (typeof preferences === "object" || typeof preferences === "function") &&
        preferences !== null &&
        !Array.isArray(preferences)
    )
  ) {
    throw invalidDependencies();
  }

  const load = readBoundary(() => preferences.load);
  const remember = readBoundary(() => preferences.remember);
  if (typeof load !== "function" || typeof remember !== "function") throw invalidDependencies();

  return Object.freeze({
    load: Object.freeze((scope: TaskDestinationScope) => Reflect.apply(load, preferences, [scope])),
    remember: Object.freeze((scope: TaskDestinationScope, projectId: string) =>
      Reflect.apply(remember, preferences, [scope, projectId])
    ),
  });
}

function snapshotDefaults(value: unknown): CreateFormDefaults {
  if (
    !readBoundary(
      () => (typeof value === "object" || typeof value === "function") && value !== null && !Array.isArray(value)
    )
  ) {
    throw invalidDependencies();
  }

  const candidate = value as Partial<CreateFormDefaults>;
  const uiTimeZone = readBoundary(() => candidate.uiTimeZone);
  if (!isValidTimeZone(uiTimeZone)) throw invalidDependencies();

  const defaultTitle = readBoundary(() => candidate.defaultTitle);
  if (defaultTitle !== undefined && !isSafeText(defaultTitle)) throw invalidDependencies();

  const readDefaultDate = readBoundary(() => candidate.defaultDate);
  let defaultDate: Date | undefined;
  if (readDefaultDate !== undefined) {
    let epochMs: number;
    try {
      if (!(readDefaultDate instanceof Date)) throw invalidDependencies();
      epochMs = Date.prototype.getTime.call(readDefaultDate);
    } catch {
      throw invalidDependencies();
    }
    if (!Number.isFinite(epochMs)) throw invalidDependencies();
    defaultDate = Object.freeze(new Date(epochMs));
  }

  return Object.freeze({
    uiTimeZone,
    ...(defaultTitle === undefined ? {} : { defaultTitle }),
    ...(defaultDate === undefined ? {} : { defaultDate }),
  });
}

function snapshotFieldAvailability(value: unknown): Readonly<Partial<TaskFormFieldAvailability>> {
  if (!readBoundary(() => typeof value === "object" && value !== null && !Array.isArray(value))) {
    throw invalidDependencies();
  }

  const snapshot: Partial<TaskFormFieldAvailability> = {};
  for (const field of FIELD_NAMES) {
    const availability = readBoundary(() => (value as Partial<TaskFormFieldAvailability>)[field]);
    if (availability === undefined) continue;
    if (typeof availability !== "boolean") throw invalidDependencies();
    snapshot[field] = availability;
  }
  return Object.freeze(snapshot);
}

function isValidTimeZone(value: unknown): value is string {
  if (!isSafeText(value) || value.trim() !== value) return false;
  try {
    return moment.tz.zone(value) !== null;
  } catch {
    return false;
  }
}

function isSafeText(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0 || UNSAFE_TEXT_PATTERN.test(value)) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function invalidDependencies(): ProtocolError {
  return new ProtocolError(INVALID_DEPENDENCIES_MESSAGE);
}

function readBoundary<Value>(read: () => Value): Value {
  try {
    return read();
  } catch {
    throw invalidDependencies();
  }
}
