import { AjvJsonSchemaValidator } from "@modelcontextprotocol/client/validators/ajv";

import {
  AmbiguousMutationError,
  NetworkError,
  NotFoundError,
  ProtocolError,
  TickTickError,
  ValidationError,
} from "../../domain/errors";
import type { Project } from "../../domain/project";
import type { TaskQuery } from "../../domain/query";
import type { CreateTaskInput, Task, TaskRef, UpdateTaskInput } from "../../domain/task";
import type { BackendCapabilities, TaskQueryResult, TickTickBackend } from "../backend/TickTickBackend";
import type { JsonObject, McpClientPort, McpRequestOptions, McpToolDefinition } from "./McpClientPort";
import { assessMcpCatalog } from "./toolSchemas";
import {
  isInboxProjectId,
  normalizeMcpProjects,
  normalizeMcpTask,
  normalizeMcpTaskList,
  synthesizeInboxProject,
  unwrapMcpResult,
} from "./normalizers";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const PROJECT_PAGE_LIMIT = 100;
const MAX_PROJECT_PAGES = 100;

const CATALOG_MESSAGE = "TickTick MCP catalog does not support the task contract.";
const ARGUMENT_MESSAGE = "TickTick MCP operation arguments did not match the locked schema.";
const RESULT_MESSAGE = "TickTick MCP operation result did not match the locked schema.";
const STRUCTURED_MESSAGE = "TickTick MCP operation returned no structured content.";
const TIMEOUT_MESSAGE = "TickTick did not respond in time.";
const NETWORK_MESSAGE = "Couldn't reach TickTick.";
const AMBIGUOUS_CREATE_MESSAGE = "Task creation status could not be confirmed.";
const AMBIGUOUS_UPDATE_MESSAGE = "Task update status could not be confirmed.";
const AMBIGUOUS_MOVE_MESSAGE = "Task move status could not be confirmed.";
const AMBIGUOUS_COMPLETE_MESSAGE = "Task completion status could not be confirmed.";
const AMBIGUOUS_REOPEN_MESSAGE = "Task reopen status could not be confirmed.";
const UNSUPPORTED_FIELD_MESSAGE = "TickTick MCP cannot store every provided task field.";

/** Live status integers: 0 active, 2 completed (-1 abandoned is read-only). */
const STATUS_FILTERS: Readonly<Record<TaskQuery["status"], readonly number[]>> = {
  open: [0],
  completed: [2],
  all: [0, 2],
};

interface McpSession {
  readonly client: McpClientPort;
  readonly tools: ReadonlyMap<string, McpToolDefinition>;
  projectNames: ReadonlyMap<string, string>;
  inboxProjectId?: string;
  inboxDiscoveryAttempted?: boolean;
}

export interface McpTickTickBackendOptions {
  createClient(): Promise<McpClientPort>;
  requestTimeoutMs?: number;
}

export class McpTickTickBackend implements TickTickBackend {
  readonly id = "mcp" as const;
  private sessionPromise: Promise<McpSession> | undefined;
  private readonly requestTimeoutMs: number;

  constructor(private readonly options: McpTickTickBackendOptions) {
    this.requestTimeoutMs =
      typeof options.requestTimeoutMs === "number" && options.requestTimeoutMs > 0
        ? options.requestTimeoutMs
        : DEFAULT_REQUEST_TIMEOUT_MS;
  }

  capabilities(): BackendCapabilities {
    return {
      create: true,
      update: true,
      complete: true,
      reopen: true,
      move: true,
      completedQuery: true,
      inboxQuery: true,
      exactTaskLink: false,
    };
  }

  async accountIdentity(): Promise<string | undefined> {
    return undefined;
  }

  async listProjects(signal?: AbortSignal): Promise<Project[]> {
    const session = await this.session(signal);
    try {
      return await this.hydrateProjects(session, signal);
    } catch (error) {
      throw this.invalidateSessionOnProtocol(error);
    }
  }

  async queryTasks(query: TaskQuery, signal?: AbortSignal): Promise<TaskQueryResult> {
    const session = await this.session(signal);
    try {
      const projects = await this.hydrateProjects(session, signal);
      const known = new Set(projects.map((project) => project.id));
      const everything = await this.hydrateTasks(session, query.status, signal);

      if (query.scope === "inbox") {
        return { tasks: everything.filter((task) => isInboxProjectId(task.projectId)), failedProjectIds: [] };
      }

      const failedProjectIds: string[] = [];
      let tasks = everything;
      if (query.projectIds !== undefined) {
        const requested = new Set(query.projectIds);
        for (const requestedId of query.projectIds) {
          if (!known.has(requestedId) && !isInboxProjectId(requestedId)) failedProjectIds.push(requestedId);
        }
        // Inbox tasks always belong to the snapshot: callers cannot request
        // the Inbox before its identity has been discovered from task data.
        tasks = everything.filter((task) => requested.has(task.projectId) || isInboxProjectId(task.projectId));
      }
      return { tasks, failedProjectIds };
    } catch (error) {
      throw this.invalidateSessionOnProtocol(error);
    }
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const session = await this.session();
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      throw new ValidationError("A task title is required.");
    }
    if (Array.isArray(input.items) && input.items.length > 0) {
      throw new ValidationError(UNSUPPORTED_FIELD_MESSAGE);
    }
    const requestedProjectId =
      typeof input.projectId === "string" && input.projectId.trim().length > 0 ? input.projectId : undefined;

    const task: JsonObject = {
      title: input.title,
      ...(requestedProjectId === undefined ? {} : { projectId: requestedProjectId }),
      ...taskFieldsFrom(input),
    };
    const value = await this.callMutation(session, "create_task", { task }, AMBIGUOUS_CREATE_MESSAGE);
    const confirmed = await this.confirmTaskResult(session, value, AMBIGUOUS_CREATE_MESSAGE);
    if (requestedProjectId !== undefined && confirmed.projectId !== requestedProjectId) {
      throw new AmbiguousMutationError(AMBIGUOUS_CREATE_MESSAGE);
    }
    this.rememberInbox(session, confirmed.projectId);
    return confirmed;
  }

  async updateTask(ref: TaskRef, patch: UpdateTaskInput): Promise<Task> {
    const session = await this.session();
    assertTaskRef(ref);
    if (Array.isArray(patch.items) && patch.items.length > 0) {
      throw new ValidationError(UNSUPPORTED_FIELD_MESSAGE);
    }
    if (patch.title !== undefined && (typeof patch.title !== "string" || patch.title.trim().length === 0)) {
      throw new ValidationError("A task title is required.");
    }

    const fields = { ...(patch.title === undefined ? {} : { title: patch.title }), ...taskFieldsFrom(patch) };
    if (Object.keys(fields).length === 0) throw new ValidationError("No supported task changes were provided.");

    const value = await this.callMutation(
      session,
      "update_task",
      { task_id: ref.id, task: { id: ref.id, projectId: ref.projectId, ...fields } },
      AMBIGUOUS_UPDATE_MESSAGE
    );
    const confirmed = await this.confirmTaskResult(session, value, AMBIGUOUS_UPDATE_MESSAGE, ref);
    if (confirmed.id !== ref.id || confirmed.projectId !== ref.projectId) {
      throw new AmbiguousMutationError(AMBIGUOUS_UPDATE_MESSAGE);
    }
    return confirmed;
  }

  async completeTask(ref: TaskRef): Promise<void> {
    const session = await this.session();
    assertTaskRef(ref);
    await this.callMutation(
      session,
      "complete_task",
      { project_id: ref.projectId, task_id: ref.id },
      AMBIGUOUS_COMPLETE_MESSAGE
    );
    const readback = await this.readTask(session, ref, AMBIGUOUS_COMPLETE_MESSAGE);
    if (readback.status !== "completed") throw new AmbiguousMutationError(AMBIGUOUS_COMPLETE_MESSAGE);
  }

  async reopenTask(ref: TaskRef): Promise<void> {
    const session = await this.session();
    assertTaskRef(ref);
    await this.callMutation(
      session,
      "update_task",
      { task_id: ref.id, task: { id: ref.id, projectId: ref.projectId, status: 0 } },
      AMBIGUOUS_REOPEN_MESSAGE
    );
    const readback = await this.readTask(session, ref, AMBIGUOUS_REOPEN_MESSAGE);
    if (readback.status !== "open") throw new AmbiguousMutationError(AMBIGUOUS_REOPEN_MESSAGE);
  }

  async moveTask(ref: TaskRef, targetProjectId: string): Promise<Task> {
    const session = await this.session();
    assertTaskRef(ref);
    if (typeof targetProjectId !== "string" || targetProjectId.trim().length === 0) {
      throw new ValidationError("A destination list is required to move a task.");
    }

    await this.callMutation(
      session,
      "move_task",
      { moves: [{ taskId: ref.id, fromProjectId: ref.projectId, toProjectId: targetProjectId }] },
      AMBIGUOUS_MOVE_MESSAGE
    );
    const confirmed = await this.readTask(session, { id: ref.id, projectId: targetProjectId }, AMBIGUOUS_MOVE_MESSAGE);
    if (confirmed.id !== ref.id || confirmed.projectId !== targetProjectId) {
      throw new AmbiguousMutationError(AMBIGUOUS_MOVE_MESSAGE);
    }
    return confirmed;
  }

  private session(signal?: AbortSignal): Promise<McpSession> {
    throwIfAborted(signal);
    if (!this.sessionPromise) {
      const opening = this.openSession(signal).catch((error) => {
        if (this.sessionPromise === opening) this.sessionPromise = undefined;
        throw error;
      });
      this.sessionPromise = opening;
    }
    return this.sessionPromise;
  }

  private async openSession(signal?: AbortSignal): Promise<McpSession> {
    let client: McpClientPort;
    let tools: McpToolDefinition[];
    try {
      client = await this.options.createClient();
      tools = await this.withDeadline((requestOptions) => client.listTools(requestOptions), signal);
    } catch (error) {
      throw mapReadError(error, signal);
    }

    const assessment = assessMcpCatalog(tools);
    if (!assessment.eligible) throw new ProtocolError(CATALOG_MESSAGE);
    return { client, tools: new Map(tools.map((tool) => [tool.name, tool])), projectNames: new Map() };
  }

  private async hydrateProjects(session: McpSession, signal?: AbortSignal): Promise<Project[]> {
    const collected: unknown[] = [];
    let offset = 0;
    for (let page = 0; page < MAX_PROJECT_PAGES; page += 1) {
      const value = await this.callRead(session, "list_projects", { offset, limit: PROJECT_PAGE_LIMIT }, signal);
      const result = unwrapMcpResult(value);
      if (!Array.isArray(result)) throw new ProtocolError(RESULT_MESSAGE);
      collected.push(...result);
      if (result.length < PROJECT_PAGE_LIMIT) break;
      offset += result.length;
    }

    const projects = normalizeMcpProjects(collected);
    for (const project of projects) this.rememberInbox(session, project.id);
    if (session.inboxProjectId === undefined) await this.discoverInboxFromTasks(session, signal);
    if (session.inboxProjectId !== undefined && !projects.some((project) => project.kind === "inbox")) {
      projects.unshift(synthesizeInboxProject(session.inboxProjectId));
    }
    session.projectNames = new Map(projects.map((project) => [project.id, project.name]));
    return projects;
  }

  /**
   * The live service never lists the Inbox as a project, so its identity is
   * only observable through task data. This one-time probe keeps project
   * listings authoritative for fresh sessions; an Inbox with no tasks simply
   * stays undiscovered until a task reveals it.
   */
  private async discoverInboxFromTasks(session: McpSession, signal?: AbortSignal): Promise<void> {
    if (session.inboxDiscoveryAttempted) return;
    session.inboxDiscoveryAttempted = true;
    try {
      const value = await this.callRead(session, "filter_tasks", { filter: { status: [0] } }, signal);
      const result = unwrapMcpResult(value);
      if (!Array.isArray(result)) return;
      for (const raw of result) {
        const projectId =
          typeof raw === "object" && raw !== null && typeof (raw as JsonObject).projectId === "string"
            ? ((raw as JsonObject).projectId as string)
            : undefined;
        if (projectId !== undefined) this.rememberInbox(session, projectId);
        if (session.inboxProjectId !== undefined) return;
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      // Discovery is best-effort: project listings stay usable without an
      // Inbox entry, and later task queries retry discovery implicitly.
    }
  }

  private async hydrateTasks(session: McpSession, status: TaskQuery["status"], signal?: AbortSignal): Promise<Task[]> {
    const value = await this.callRead(
      session,
      "filter_tasks",
      { filter: { status: [...STATUS_FILTERS[status]] } },
      signal
    );
    const result = unwrapMcpResult(value);
    const tasks = normalizeMcpTaskList(result, session.projectNames);
    const deduped: Task[] = [];
    const seen = new Set<string>();
    for (const task of tasks) {
      this.rememberInbox(session, task.projectId);
      const identity = `${task.projectId} ${task.id}`;
      if (!seen.has(identity)) {
        seen.add(identity);
        deduped.push(task);
      }
    }
    return deduped;
  }

  private async readTask(session: McpSession, ref: TaskRef, ambiguousMessage: string): Promise<Task> {
    let value: unknown;
    try {
      value = await this.callRead(session, "get_task_by_id", { task_id: ref.id });
    } catch (error) {
      throw new AmbiguousMutationError(ambiguousMessage, error);
    }
    try {
      const unwrapped = unwrapMcpResult(value);
      await this.ensureProjectNames(session, unwrapped);
      return normalizeMcpTask(unwrapped, session.projectNames);
    } catch (error) {
      throw new AmbiguousMutationError(ambiguousMessage, error);
    }
  }

  private async confirmTaskResult(
    session: McpSession,
    value: unknown,
    ambiguousMessage: string,
    fallbackRef?: TaskRef
  ): Promise<Task> {
    let unwrapped: unknown;
    try {
      unwrapped = unwrapMcpResult(value);
    } catch (error) {
      throw error instanceof NotFoundError ? error : new AmbiguousMutationError(ambiguousMessage, error);
    }

    await this.ensureProjectNames(session, unwrapped);
    try {
      return normalizeMcpTask(unwrapped, session.projectNames);
    } catch {
      const id =
        isObject(unwrapped) && typeof unwrapped.id === "string" && unwrapped.id.trim().length > 0
          ? unwrapped.id
          : fallbackRef?.id;
      if (id === undefined) throw new AmbiguousMutationError(ambiguousMessage);
      return this.readTask(session, { id, projectId: fallbackRef?.projectId ?? "" }, ambiguousMessage);
    }
  }

  private async ensureProjectNames(session: McpSession, unwrapped: unknown): Promise<void> {
    const projectId = isObject(unwrapped) && typeof unwrapped.projectId === "string" ? unwrapped.projectId : undefined;
    if (projectId === undefined || session.projectNames.has(projectId) || isInboxProjectId(projectId)) return;
    try {
      await this.hydrateProjects(session);
    } catch {
      // Task normalization reports the missing project name safely.
    }
  }

  private rememberInbox(session: McpSession, projectId: string): void {
    if (session.inboxProjectId === undefined && isInboxProjectId(projectId)) session.inboxProjectId = projectId;
  }

  private async callRead(session: McpSession, name: string, args: JsonObject, signal?: AbortSignal): Promise<unknown> {
    try {
      return await this.callLocked(session, name, args, signal);
    } catch (error) {
      throw this.invalidateSessionOnProtocol(mapReadError(error, signal));
    }
  }

  private async callMutation(
    session: McpSession,
    name: string,
    args: JsonObject,
    ambiguousMessage: string
  ): Promise<unknown> {
    try {
      return await this.callLocked(session, name, args, undefined, ambiguousMessage);
    } catch (error) {
      if (error instanceof AmbiguousMutationError) throw error;
      if (error instanceof TickTickError && error.code !== "network") throw this.invalidateSessionOnProtocol(error);
      throw new AmbiguousMutationError(ambiguousMessage, error);
    }
  }

  private async callLocked(
    session: McpSession,
    name: string,
    args: JsonObject,
    signal?: AbortSignal,
    ambiguousMessage?: string
  ): Promise<unknown> {
    const definition = session.tools.get(name);
    if (!definition) throw new ProtocolError(CATALOG_MESSAGE);
    validateSchema(definition.inputSchema, args, ARGUMENT_MESSAGE);

    const result = await this.withDeadline(
      (requestOptions) => session.client.callTool(name, args, requestOptions),
      signal
    );
    if (!result.hasStructuredContent) {
      throw ambiguousMessage === undefined
        ? new ProtocolError(STRUCTURED_MESSAGE)
        : new AmbiguousMutationError(ambiguousMessage);
    }
    // Output shapes are proven value-by-value in the normalizers: the live
    // service's declared output schemas do not reliably match its responses.
    return result.structuredContent;
  }

  private async withDeadline<Value>(
    request: (options: McpRequestOptions) => Promise<Value>,
    signal?: AbortSignal
  ): Promise<Value> {
    throwIfAborted(signal);
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abortFromCaller, { once: true });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        const failure = new NetworkError(TIMEOUT_MESSAGE);
        reject(failure);
        controller.abort(failure);
      }, this.requestTimeoutMs);
    });

    try {
      return await Promise.race([
        Promise.resolve().then(() =>
          request(Object.freeze({ signal: controller.signal, timeoutMs: this.requestTimeoutMs }))
        ),
        deadline,
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  private invalidateSessionOnProtocol(error: unknown): unknown {
    if (error instanceof ProtocolError) this.sessionPromise = undefined;
    return error;
  }
}

/** Maps supported optional domain fields onto the live OpenTask shape. */
function taskFieldsFrom(input: Readonly<Partial<CreateTaskInput>>): JsonObject {
  const fields: JsonObject = {};
  if (typeof input.content === "string" && input.content.length > 0) fields.content = input.content;
  if (typeof input.description === "string" && input.description.length > 0) fields.desc = input.description;
  if (typeof input.startDate === "string" && input.startDate.length > 0) fields.startDate = input.startDate;
  if (typeof input.dueDate === "string" && input.dueDate.length > 0) fields.dueDate = input.dueDate;
  if (typeof input.isAllDay === "boolean") fields.isAllDay = input.isAllDay;
  if (typeof input.priority === "number") fields.priority = input.priority;
  if (Array.isArray(input.tags) && input.tags.length > 0) fields.tags = [...input.tags];
  if (typeof input.timeZone === "string" && input.timeZone.length > 0) fields.timeZone = input.timeZone;
  if (typeof input.kind === "string") fields.kind = input.kind;
  return fields;
}

function assertTaskRef(ref: TaskRef): void {
  if (
    typeof ref.id !== "string" ||
    ref.id.trim().length === 0 ||
    typeof ref.projectId !== "string" ||
    ref.projectId.trim().length === 0
  ) {
    throw new ValidationError("A task reference is required.");
  }
}

function mapReadError(error: unknown, signal?: AbortSignal): unknown {
  if (isAbortError(error) && signal?.aborted) return error;
  if (error instanceof TickTickError) return error;
  return new NetworkError(NETWORK_MESSAGE, error);
}

function validateSchema(schema: JsonObject, value: unknown, message: string): void {
  try {
    const validator = new AjvJsonSchemaValidator().getValidator(schema);
    if (!validator(value).valid) throw new Error();
  } catch {
    throw new ProtocolError(message);
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted.", "AbortError");
  }
}
