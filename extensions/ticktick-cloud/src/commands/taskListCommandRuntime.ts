import moment from "moment-timezone";

import {
  isTrustedReadyCommandRuntime,
  type CommandRuntimeState,
  type ReadyCommandRuntime,
} from "../application/commandRuntime";
import { presentError, type ErrorPresentation } from "../application/errorPresentation";
import type { TaskListRuntime } from "../components/TaskListView";
import type { TaskExactLinkStrategy } from "../components/taskActions";
import { ProtocolError } from "../domain/errors";

export type TaskListCommandRuntimeOptions = Readonly<{
  uiTimeZone: string;
  exactLinkStrategy: TaskExactLinkStrategy;
}>;

type OptionSnapshot = Readonly<{
  uiTimeZone: string;
  exactLinkStrategy: TaskExactLinkStrategy;
}>;

const UNSAFE_TEXT_PATTERN = /[\p{Cc}\p{Cf}]/u;
const LOADING_STATE: TaskListRuntime = Object.freeze({ kind: "loading" });
const INVALID_RUNTIME_STATE: TaskListRuntime = createErrorRuntime(
  new ProtocolError("TickTick task-list command runtime is invalid.")
);

export function projectTaskListCommandRuntime(
  state: CommandRuntimeState,
  options: TaskListCommandRuntimeOptions
): TaskListRuntime {
  try {
    const candidate: unknown = state;
    if (!isObject(candidate)) return INVALID_RUNTIME_STATE;

    const kind = Reflect.get(candidate, "kind");
    if (kind === "loading") return LOADING_STATE;
    if (kind === "error") return createErrorRuntime(Reflect.get(candidate, "error"));
    if (kind !== "ready" || !isTrustedReadyCommandRuntime(candidate)) return INVALID_RUNTIME_STATE;

    return projectReadyRuntime(candidate, snapshotOptions(options));
  } catch {
    return INVALID_RUNTIME_STATE;
  }
}

function projectReadyRuntime(
  runtime: ReadyCommandRuntime,
  options: OptionSnapshot
): Extract<TaskListRuntime, { kind: "ready" }> {
  const onReconnect = runtime.onReconnect;
  const onOpenPreferences = runtime.onOpenPreferences;

  return Object.freeze({
    kind: "ready",
    accountKey: runtime.accountKey,
    taskService: runtime.taskService,
    mutationService: runtime.mutationService,
    capabilities: runtime.capabilities,
    uiTimeZone: options.uiTimeZone,
    exactLinkStrategy: options.exactLinkStrategy,
    ...(onReconnect === undefined ? {} : { onReconnect }),
    ...(onOpenPreferences === undefined ? {} : { onOpenPreferences }),
  });
}

function snapshotOptions(value: TaskListCommandRuntimeOptions): OptionSnapshot {
  if (!isObject(value)) throw invalidOptions();

  const uiTimeZone = value.uiTimeZone;
  const exactLinkStrategy = value.exactLinkStrategy;
  if (!isValidTimeZone(uiTimeZone) || !isExactLinkStrategy(exactLinkStrategy)) throw invalidOptions();

  return Object.freeze({ uiTimeZone, exactLinkStrategy });
}

function createErrorRuntime(error: unknown): Extract<TaskListRuntime, { kind: "error" }> {
  return Object.freeze({
    kind: "error",
    presentation: freezePresentation(presentError(error, "read")),
  });
}

function freezePresentation(presentation: ErrorPresentation): ErrorPresentation {
  const actions = Object.freeze(presentation.actions.map((action) => Object.freeze({ ...action })));
  return Object.freeze({ ...presentation, actions }) as ErrorPresentation;
}

function isExactLinkStrategy(value: unknown): value is TaskExactLinkStrategy {
  return value === undefined || value === "backend-url" || value === "native-project-uri";
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

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidOptions(): ProtocolError {
  return new ProtocolError("TickTick task-list command runtime options are invalid.");
}
