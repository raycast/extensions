import moment from "moment-timezone";

import { presentError, type ErrorPresentation } from "../application/errorPresentation";
import {
  requireTaskDestination,
  type TaskDestinationPreferencePort,
  type TaskDestinationScope,
} from "../application/taskDestination";
import type { TaskViewQuery } from "../application/viewQuery";
import { AmbiguousMutationError, ProtocolError, TickTickError, ValidationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, TaskPriority } from "../domain/task";

export type AiToolBackendId = "mcp" | "openapi" | "macos-legacy";

export interface AiToolRuntime {
  readonly backendId: AiToolBackendId;
  readonly accountKey: string;
  readonly capabilities: Readonly<{ create: boolean }>;
  readonly taskService: Readonly<{
    query(accountKey: string, query: TaskViewQuery): Promise<unknown>;
    listProjects(accountKey: string): Promise<unknown>;
  }>;
  createTask(input: CreateTaskInput): Promise<unknown>;
}

export type LoadAiToolRuntime = () => AiToolRuntime | Promise<AiToolRuntime>;

export interface AiToolReadControllerDependencies {
  readonly loadRuntime: LoadAiToolRuntime;
}

export interface AiToolControllerDependencies extends AiToolReadControllerDependencies {
  readonly preferences: TaskDestinationPreferencePort;
}

export type GetTasksInput = Readonly<{
  smartProjectId: "today" | "next7Days";
}>;

export type AddTaskInput = Readonly<{
  title: string;
  projectId?: string;
  projectName?: string;
  dueDate?: string;
  content?: string;
}>;

export type AiToolErrorCode = ErrorPresentation["kind"];
export type AiToolRetry = "never" | "manual" | "after-input-change";

export type ToolFailure = Readonly<{
  ok: false;
  error: Readonly<{
    code: AiToolErrorCode;
    message: string;
    retry: AiToolRetry;
  }>;
}>;

export type ToolResult<Data> = Readonly<{ ok: true; data: Readonly<Data> }> | ToolFailure;

export type AiTaskData = Readonly<{
  title: string;
  listName: string;
  startDate?: string;
  dueDate?: string;
  isAllDay: boolean;
  isFloating: boolean;
  timeZone: string;
  priority: TaskPriority;
}>;

export type AiTaskSectionData = Readonly<{
  id: string;
  title: string;
  tasks: readonly AiTaskData[];
}>;

export type GetTasksData = Readonly<{
  view: GetTasksInput["smartProjectId"];
  freshness: "fresh" | "stale";
  partial: boolean;
  warning?: "TickTick data may be incomplete or out of date.";
  sections: readonly AiTaskSectionData[];
}>;

export type AiListData = Readonly<{
  id: string;
  name: string;
  kind: Project["kind"];
}>;

export type GetListsData = Readonly<{ lists: readonly AiListData[] }>;

export type AddTaskData = Readonly<{
  created: true;
  destination: Readonly<{ name: string; kind: Project["kind"] }>;
}>;

type RuntimeSnapshot = Readonly<AiToolRuntime>;

type ReadDependencySnapshot = Readonly<{
  loadRuntime: LoadAiToolRuntime;
}>;

type DependencySnapshot = Readonly<{
  loadRuntime: LoadAiToolRuntime;
  preferences: TaskDestinationPreferencePort;
}>;

type AddTaskSnapshot = Readonly<{
  title: string;
  projectId?: string;
  projectName?: string;
  dueDate?: string;
  content?: string;
}>;

const SAFE_DATA_WARNING = "TickTick data may be incomplete or out of date." as const;
const AMBIGUOUS_CREATE_MESSAGE = "TickTick may have created this task. Check TickTick before trying again.";
const DESTINATION_LOOKUP_MESSAGE = "Call get-lists, then retry with the intended list's projectId.";
const UNCONFIRMED_CREATE_MESSAGE = "Couldn't confirm task creation. Check TickTick before trying again.";
const BACKEND_IDS = new Set<AiToolBackendId>(["mcp", "openapi", "macos-legacy"]);
const PRIORITIES = new Set<TaskPriority>([0, 1, 3, 5]);

class ToolInputValidationError extends ValidationError {}
class DestinationLookupError extends ToolInputValidationError {}

export function createGetTasksTool(
  dependencies: AiToolReadControllerDependencies
): (input: GetTasksInput) => Promise<ToolResult<GetTasksData>> {
  const boundary = snapshotReadDependencies(dependencies);

  return async (input) => {
    let view: GetTasksInput["smartProjectId"];
    try {
      view = snapshotGetTasksInput(input);
    } catch (error) {
      return failure(error, "read");
    }

    try {
      const runtime = await loadRuntime(boundary);
      const model = await runtime.taskService.query(runtime.accountKey, { view, status: "open" });
      return success(snapshotTaskReadModel(model, view));
    } catch (error) {
      return failure(error, "read");
    }
  };
}

export function createGetListsTool(
  dependencies: AiToolReadControllerDependencies
): () => Promise<ToolResult<GetListsData>> {
  const boundary = snapshotReadDependencies(dependencies);

  return async () => {
    try {
      const runtime = await loadRuntime(boundary);
      const projects = snapshotProjectCatalog(await runtime.taskService.listProjects(runtime.accountKey));
      const lists = Object.freeze(projects.map(({ id, name, kind }) => Object.freeze({ id, name, kind })));
      return success(Object.freeze({ lists }));
    } catch (error) {
      return failure(error, "read");
    }
  };
}

export function createAddTaskTool(
  dependencies: AiToolControllerDependencies
): (input: AddTaskInput) => Promise<ToolResult<AddTaskData>> {
  const boundary = snapshotMutationDependencies(dependencies);

  return async (input) => {
    let request: AddTaskSnapshot;
    try {
      request = snapshotAddTaskInput(input);
    } catch (error) {
      return failure(error, "mutation");
    }

    try {
      const runtime = await loadRuntime(boundary);
      if (!runtime.capabilities.create) {
        throw new ProtocolError("This TickTick backend cannot create tasks.");
      }

      const destination = await resolveDestination(runtime, boundary.preferences, request);
      const createInput: CreateTaskInput = {
        title: request.title,
        projectId: destination.id,
        ...(request.content === undefined ? {} : { description: request.content }),
        ...(request.dueDate === undefined ? {} : { dueDate: request.dueDate, isAllDay: false }),
      };
      const confirmed = await runtime.createTask(Object.freeze(createInput));
      assertConfirmedDestination(confirmed, destination.id);

      return success(
        Object.freeze({
          created: true as const,
          destination: Object.freeze({ name: destination.name, kind: destination.kind }),
        })
      );
    } catch (error) {
      return failure(error, "mutation");
    }
  };
}

function snapshotReadDependencies(value: unknown): ReadDependencySnapshot {
  try {
    if (!isObject(value)) throw protocolFailure();
    const loadRuntime = value.loadRuntime;
    if (typeof loadRuntime !== "function") throw protocolFailure();
    return Object.freeze({ loadRuntime: () => Reflect.apply(loadRuntime, value, []) });
  } catch {
    throw protocolFailure();
  }
}

function snapshotMutationDependencies(value: unknown): DependencySnapshot {
  try {
    const read = snapshotReadDependencies(value);
    if (!isObject(value)) throw protocolFailure();
    const preferenceSource = value.preferences;
    if (!isObject(preferenceSource)) throw protocolFailure();
    const loadPreference = preferenceSource.load;
    const rememberPreference = preferenceSource.remember;
    if (typeof loadPreference !== "function" || typeof rememberPreference !== "function") throw protocolFailure();

    const preferences: TaskDestinationPreferencePort = Object.freeze({
      load: async (scope: TaskDestinationScope) => Reflect.apply(loadPreference, preferenceSource, [scope]),
      remember: async (scope: TaskDestinationScope, projectId: string) =>
        Reflect.apply(rememberPreference, preferenceSource, [scope, projectId]),
    });
    return Object.freeze({
      loadRuntime: read.loadRuntime,
      preferences,
    });
  } catch {
    throw protocolFailure();
  }
}

async function loadRuntime(dependencies: ReadDependencySnapshot): Promise<RuntimeSnapshot> {
  try {
    const candidate = await dependencies.loadRuntime();
    return snapshotRuntime(candidate);
  } catch (error) {
    if (isTickTickError(error)) throw error;
    throw protocolFailure();
  }
}

function snapshotRuntime(value: unknown): RuntimeSnapshot {
  try {
    if (!isObject(value)) throw protocolFailure();
    const backendId = value.backendId;
    const accountKey = value.accountKey;
    const capabilitiesSource = value.capabilities;
    const taskServiceSource = value.taskService;
    const createTask = value.createTask;
    if (
      !BACKEND_IDS.has(backendId as AiToolBackendId) ||
      !isSafeOpaqueString(accountKey, true) ||
      !isObject(capabilitiesSource) ||
      !isObject(taskServiceSource) ||
      typeof createTask !== "function"
    ) {
      throw protocolFailure();
    }
    const create = capabilitiesSource.create;
    const query = taskServiceSource.query;
    const listProjects = taskServiceSource.listProjects;
    if (typeof create !== "boolean" || typeof query !== "function" || typeof listProjects !== "function") {
      throw protocolFailure();
    }

    return Object.freeze({
      backendId: backendId as AiToolBackendId,
      accountKey,
      capabilities: Object.freeze({ create }),
      taskService: Object.freeze({
        query: async (runtimeAccountKey: string, taskQuery: TaskViewQuery) =>
          Reflect.apply(query, taskServiceSource, [runtimeAccountKey, taskQuery]),
        listProjects: async (runtimeAccountKey: string) =>
          Reflect.apply(listProjects, taskServiceSource, [runtimeAccountKey]),
      }),
      createTask: async (input: CreateTaskInput) => Reflect.apply(createTask, value, [input]),
    });
  } catch {
    throw protocolFailure();
  }
}

function snapshotGetTasksInput(value: unknown): GetTasksInput["smartProjectId"] {
  try {
    if (!isObject(value)) throw inputFailure();
    const smartProjectId = value.smartProjectId;
    if (smartProjectId !== "today" && smartProjectId !== "next7Days") throw inputFailure();
    return smartProjectId;
  } catch {
    throw inputFailure();
  }
}

function snapshotAddTaskInput(value: unknown): AddTaskSnapshot {
  try {
    if (!isObject(value)) throw inputFailure();
    const rawTitle = value.title;
    const rawProjectId = value.projectId;
    const rawProjectName = value.projectName;
    const rawDueDate = value.dueDate;
    const rawContent = value.content;
    if (typeof rawTitle !== "string") throw inputFailure();
    if (rawProjectId !== undefined && typeof rawProjectId !== "string") throw inputFailure();
    if (rawProjectName !== undefined && typeof rawProjectName !== "string") throw inputFailure();
    if (rawDueDate !== undefined && typeof rawDueDate !== "string") throw inputFailure();
    if (rawContent !== undefined && typeof rawContent !== "string") throw inputFailure();

    const title = rawTitle.trim();
    const projectId = rawProjectId?.trim();
    const projectName = rawProjectName?.trim();
    const content = rawContent?.trim();
    if (!isSafeDisplayString(title) || (projectId !== undefined && !isSafeOpaqueString(projectId, true))) {
      throw inputFailure();
    }
    if (projectName !== undefined && !isSafeDisplayString(projectName)) throw inputFailure();

    const dueDate = rawDueDate === undefined ? undefined : normalizeDueDate(rawDueDate);
    return Object.freeze({
      title,
      ...(projectId === undefined ? {} : { projectId }),
      ...(projectName === undefined ? {} : { projectName }),
      ...(dueDate === undefined ? {} : { dueDate }),
      ...(content === undefined || content.length === 0 ? {} : { content }),
    });
  } catch (error) {
    if (isInputValidation(error)) throw error;
    throw inputFailure();
  }
}

function normalizeDueDate(value: string): string {
  const candidate = value.trim();
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(candidate)) throw inputFailure();
  const parsed = moment.parseZone(candidate, moment.ISO_8601, true);
  if (!parsed.isValid()) throw inputFailure();
  return parsed.utc().millisecond(0).format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
}

async function resolveDestination(
  runtime: RuntimeSnapshot,
  preferences: TaskDestinationPreferencePort,
  input: AddTaskSnapshot
): Promise<Project> {
  if (input.projectId === undefined && input.projectName === undefined) {
    const scope: TaskDestinationScope = Object.freeze({
      backendId: runtime.backendId,
      accountKey: runtime.accountKey,
    });
    return snapshotProject(
      await requireTaskDestination({
        scope,
        listProjects: async () => snapshotProjectCatalog(await runtime.taskService.listProjects(runtime.accountKey)),
        preferences,
      })
    );
  }

  const projects = snapshotProjectCatalog(await runtime.taskService.listProjects(runtime.accountKey));
  const byId = input.projectId === undefined ? undefined : projects.find((project) => project.id === input.projectId);
  const byName =
    input.projectName === undefined ? [] : projects.filter((project) => project.name === input.projectName);

  if (input.projectId !== undefined && byId === undefined) throw destinationLookupFailure();
  if (input.projectName !== undefined && byName.length !== 1) throw destinationLookupFailure();
  if (byId !== undefined && byName.length === 1 && byId.id !== byName[0].id) throw destinationLookupFailure();

  const destination = byId ?? byName[0];
  if (destination === undefined) throw destinationLookupFailure();
  return destination;
}

function snapshotProjectCatalog(value: unknown): readonly Project[] {
  try {
    if (!Array.isArray(value)) throw protocolFailure();
    const projects = Object.freeze(value.map(snapshotProject));
    const ids = new Set<string>();
    for (const project of projects) {
      if (ids.has(project.id)) throw protocolFailure();
      ids.add(project.id);
    }
    if (!projects.some((project) => project.kind === "inbox")) throw protocolFailure();
    return projects;
  } catch {
    throw protocolFailure();
  }
}

function snapshotProject(value: unknown): Project {
  try {
    if (!isObject(value)) throw protocolFailure();
    const id = value.id;
    const name = value.name;
    const kind = value.kind;
    const closed = value.closed;
    if (
      !isSafeOpaqueString(id, true) ||
      !isSafeDisplayString(name) ||
      (kind !== "inbox" && kind !== "project") ||
      closed !== false
    ) {
      throw protocolFailure();
    }
    return Object.freeze({ id, name, kind, closed: false });
  } catch {
    throw protocolFailure();
  }
}

function snapshotTaskReadModel(value: unknown, view: GetTasksInput["smartProjectId"]): GetTasksData {
  try {
    if (!isObject(value)) throw protocolFailure();
    const freshness = value.freshness;
    const isPartial = value.isPartial;
    const rawWarning = value.warning;
    const rawSections = value.sections;
    if (
      (freshness !== "fresh" && freshness !== "stale") ||
      typeof isPartial !== "boolean" ||
      (rawWarning !== undefined && typeof rawWarning !== "string") ||
      !Array.isArray(rawSections)
    ) {
      throw protocolFailure();
    }
    const sections = Object.freeze(rawSections.map(snapshotTaskSection));
    const shouldWarn = freshness === "stale" || isPartial || rawWarning !== undefined;
    return Object.freeze({
      view,
      freshness,
      partial: isPartial,
      ...(shouldWarn ? { warning: SAFE_DATA_WARNING } : {}),
      sections,
    });
  } catch {
    throw protocolFailure();
  }
}

function snapshotTaskSection(value: unknown): AiTaskSectionData {
  try {
    if (!isObject(value)) throw protocolFailure();
    const id = value.id;
    const title = value.title;
    const rawTasks = value.tasks;
    if (!isSafeDisplayString(id) || !isSafeDisplayString(title) || !Array.isArray(rawTasks)) {
      throw protocolFailure();
    }
    return Object.freeze({ id, title, tasks: Object.freeze(rawTasks.map(snapshotAiTask)) });
  } catch {
    throw protocolFailure();
  }
}

function snapshotAiTask(value: unknown): AiTaskData {
  try {
    if (!isObject(value)) throw protocolFailure();
    const title = value.title;
    const listName = value.projectName;
    const startDate = value.startDate;
    const dueDate = value.dueDate;
    const isAllDay = value.isAllDay;
    const isFloating = value.isFloating;
    const timeZone = value.timeZone;
    const priority = value.priority;
    if (
      !isSafeDisplayString(title) ||
      !isSafeDisplayString(listName) ||
      !isOptionalIsoDate(startDate) ||
      !isOptionalIsoDate(dueDate) ||
      typeof isAllDay !== "boolean" ||
      typeof isFloating !== "boolean" ||
      !isSafeDisplayString(timeZone) ||
      !PRIORITIES.has(priority as TaskPriority)
    ) {
      throw protocolFailure();
    }
    return Object.freeze({
      title,
      listName,
      ...(startDate === undefined ? {} : { startDate }),
      ...(dueDate === undefined ? {} : { dueDate }),
      isAllDay,
      isFloating,
      timeZone,
      priority: priority as TaskPriority,
    });
  } catch {
    throw protocolFailure();
  }
}

function assertConfirmedDestination(value: unknown, expectedProjectId: string): void {
  try {
    if (!isObject(value)) throw ambiguousFailure();
    const id = value.id;
    const projectId = value.projectId;
    if (!isSafeOpaqueString(id, true) || projectId !== expectedProjectId) throw ambiguousFailure();
  } catch {
    throw ambiguousFailure();
  }
}

function success<Data extends object>(data: Readonly<Data>): ToolResult<Data> {
  return Object.freeze({ ok: true as const, data });
}

function failure(error: unknown, context: "read" | "mutation"): ToolFailure {
  if (isDestinationLookup(error)) {
    return freezeFailure("validation", DESTINATION_LOOKUP_MESSAGE, "after-input-change");
  }

  if (context === "mutation" && isAmbiguousMutation(error)) {
    return freezeFailure("ambiguous-mutation", AMBIGUOUS_CREATE_MESSAGE, "never");
  }

  const presentation = presentError(error, context);
  if (context === "mutation" && (presentation.kind === "network" || presentation.kind === "rate-limit")) {
    return freezeFailure(presentation.kind, UNCONFIRMED_CREATE_MESSAGE, "never");
  }
  const retry: AiToolRetry = isInputValidation(error)
    ? "after-input-change"
    : context === "read" && (presentation.kind === "network" || presentation.kind === "rate-limit")
    ? "manual"
    : "never";
  return freezeFailure(presentation.kind, presentation.message, retry);
}

function freezeFailure(code: AiToolErrorCode, message: string, retry: AiToolRetry): ToolFailure {
  return Object.freeze({ ok: false as const, error: Object.freeze({ code, message, retry }) });
}

function isInputValidation(error: unknown): error is ToolInputValidationError {
  try {
    return error instanceof ToolInputValidationError;
  } catch {
    return false;
  }
}

function isDestinationLookup(error: unknown): error is DestinationLookupError {
  try {
    return error instanceof DestinationLookupError;
  } catch {
    return false;
  }
}

function isAmbiguousMutation(error: unknown): error is AmbiguousMutationError {
  try {
    return error instanceof AmbiguousMutationError;
  } catch {
    return false;
  }
}

function isTickTickError(error: unknown): error is TickTickError {
  try {
    return error instanceof TickTickError;
  } catch {
    return false;
  }
}

function isOptionalIsoDate(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  if (typeof value !== "string" || !isSafeOpaqueString(value, false)) return false;
  return moment.parseZone(value, moment.ISO_8601, true).isValid();
}

function isSafeDisplayString(value: unknown): value is string {
  return isSafeOpaqueString(value, false) && value.trim().length > 0;
}

function isSafeOpaqueString(value: unknown, requireTrimmed: boolean): value is string {
  if (typeof value !== "string" || value.length === 0 || (requireTrimmed && value !== value.trim())) return false;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return (typeof value === "object" || typeof value === "function") && value !== null && !Array.isArray(value);
}

function inputFailure(): ToolInputValidationError {
  return new ToolInputValidationError("Invalid AI tool input.");
}

function destinationLookupFailure(): DestinationLookupError {
  return new DestinationLookupError("Invalid AI tool destination.");
}

function protocolFailure(): ProtocolError {
  return new ProtocolError("Invalid AI tool runtime data.");
}

function ambiguousFailure(): AmbiguousMutationError {
  return new AmbiguousMutationError("Task creation status could not be confirmed.");
}
