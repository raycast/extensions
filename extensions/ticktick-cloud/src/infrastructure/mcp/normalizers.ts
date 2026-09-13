import { NotFoundError, ProtocolError } from "../../domain/errors";
import type { Project } from "../../domain/project";
import type { ChecklistItem, Task, TaskKind, TaskPriority, TaskStatus } from "../../domain/task";
import type { JsonObject } from "./McpClientPort";

const MALFORMED_PROJECT_MESSAGE = "TickTick MCP project data is malformed.";
const MALFORMED_TASK_MESSAGE = "TickTick MCP task data is malformed.";
const MALFORMED_RESULT_MESSAGE = "TickTick MCP operation result was not structured.";
const TOOL_ERROR_MESSAGE = "TickTick MCP reported the operation failed.";
const NOT_FOUND_MESSAGE = "The requested TickTick task or list no longer exists.";

const TASK_PRIORITIES: readonly TaskPriority[] = [0, 1, 3, 5];
const TASK_KINDS: readonly TaskKind[] = ["TEXT", "CHECKLIST", "NOTE"];
const INBOX_PROJECT_ID_PREFIX = "inbox";
export const INBOX_PROJECT_NAME = "Inbox";

/**
 * Unwraps a live tool response. Query tools wrap payloads in a
 * `{result: ...}` envelope while mutation tools return the payload directly
 * (verified live 2026-08-15), so both shapes are accepted. A `ToolError`
 * payload becomes a typed error with a fixed message so remote text never
 * reaches logs or toasts.
 */
export function unwrapMcpResult(value: unknown): unknown {
  if (isObject(value) && "result" in value) return rejectToolError(value.result);
  if (isObject(value) || Array.isArray(value)) return rejectToolError(value);
  throw new ProtocolError(MALFORMED_RESULT_MESSAGE);
}

function rejectToolError(payload: unknown): unknown {
  if (isObject(payload) && typeof payload.error === "string" && Object.keys(payload).length === 1) {
    if (/not.?found|not.?exist|no.?such/i.test(payload.error)) throw new NotFoundError(NOT_FOUND_MESSAGE);
    throw new ProtocolError(TOOL_ERROR_MESSAGE);
  }
  return payload;
}

export function isInboxProjectId(projectId: string): boolean {
  return projectId.startsWith(INBOX_PROJECT_ID_PREFIX);
}

export function synthesizeInboxProject(projectId: string): Project {
  if (!isInboxProjectId(projectId)) throw new ProtocolError(MALFORMED_PROJECT_MESSAGE);
  return { id: projectId, name: INBOX_PROJECT_NAME, kind: "inbox", closed: false };
}

export function normalizeMcpProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) throw new ProtocolError(MALFORMED_PROJECT_MESSAGE);
  const projects = value.map(normalizeMcpProject);
  const identities = new Set<string>();
  for (const project of projects) {
    if (identities.has(project.id)) throw new ProtocolError(MALFORMED_PROJECT_MESSAGE);
    identities.add(project.id);
  }
  return projects;
}

export function normalizeMcpTaskList(value: unknown, projectNames: ReadonlyMap<string, string>): Task[] {
  if (!Array.isArray(value)) throw new ProtocolError(MALFORMED_TASK_MESSAGE);
  return value.map((raw) => normalizeMcpTask(raw, projectNames));
}

export function normalizeMcpTask(value: unknown, projectNames: ReadonlyMap<string, string>): Task {
  if (!isObject(value)) throw new ProtocolError(MALFORMED_TASK_MESSAGE);
  const id = requiredText(value.id, MALFORMED_TASK_MESSAGE);
  const projectId = requiredText(value.projectId, MALFORMED_TASK_MESSAGE);
  const title = typeof value.title === "string" ? value.title : undefined;
  if (title === undefined) throw new ProtocolError(MALFORMED_TASK_MESSAGE);
  const status = normalizeMcpTaskStatus(value.status);
  if (status === undefined) throw new ProtocolError(MALFORMED_TASK_MESSAGE);
  const projectName = projectNames.get(projectId) ?? (isInboxProjectId(projectId) ? INBOX_PROJECT_NAME : undefined);
  if (projectName === undefined) throw new ProtocolError(MALFORMED_TASK_MESSAGE);

  const content = optionalText(value.content);
  const description = optionalText(value.desc ?? value.description);
  const startDate = optionalText(value.startDate);
  const dueDate = optionalText(value.dueDate);
  const timeZone = optionalText(value.timeZone);
  const items = normalizeChecklistItems(value.items);

  return {
    id,
    projectId,
    projectName,
    title,
    status,
    priority: normalizePriority(value.priority),
    tags: normalizeTags(value.tags),
    kind: normalizeKind(value.kind),
    isAllDay: value.isAllDay === true,
    isFloating: value.isFloating === true,
    timeZone: timeZone ?? "UTC",
    ...(content === undefined ? {} : { content }),
    ...(description === undefined ? {} : { description }),
    ...(startDate === undefined ? {} : { startDate }),
    ...(dueDate === undefined ? {} : { dueDate }),
    ...(items === undefined ? {} : { items }),
  };
}

/**
 * Live statuses are integers: 0 active, -1 abandoned, 2 completed. Missing
 * status means active in creation responses. Abandoned tasks surface as
 * completed because the domain models only open and completed states.
 */
export function normalizeMcpTaskStatus(value: unknown): TaskStatus | undefined {
  if (value === undefined || value === null || value === 0) return "open";
  if (value === 2 || value === -1) return "completed";
  return undefined;
}

function normalizeMcpProject(value: unknown): Project {
  if (!isObject(value)) throw new ProtocolError(MALFORMED_PROJECT_MESSAGE);
  const id = requiredText(value.id, MALFORMED_PROJECT_MESSAGE);
  const name = requiredText(value.name, MALFORMED_PROJECT_MESSAGE);
  return {
    id,
    name,
    kind: isInboxProjectId(id) ? "inbox" : "project",
    closed: value.closed === true,
  };
}

function normalizeChecklistItems(value: unknown): ChecklistItem[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ProtocolError(MALFORMED_TASK_MESSAGE);
  const items: ChecklistItem[] = [];
  for (const raw of value) {
    if (!isObject(raw)) throw new ProtocolError(MALFORMED_TASK_MESSAGE);
    const id = optionalText(raw.id);
    const title = typeof raw.title === "string" ? raw.title : undefined;
    if (id === undefined || title === undefined) throw new ProtocolError(MALFORMED_TASK_MESSAGE);
    const startDate = optionalText(raw.startDate);
    items.push({
      id,
      title,
      status: raw.status === 0 || raw.status === undefined || raw.status === null ? "open" : "completed",
      sortOrder: typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
      ...(startDate === undefined ? {} : { startDate }),
      ...(typeof raw.isAllDay === "boolean" ? { isAllDay: raw.isAllDay } : {}),
    });
  }
  return items;
}

function normalizePriority(value: unknown): TaskPriority {
  return typeof value === "number" && (TASK_PRIORITIES as readonly number[]).includes(value)
    ? (value as TaskPriority)
    : 0;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
}

function normalizeKind(value: unknown): TaskKind {
  if (typeof value !== "string") return "TEXT";
  const upper = value.trim().toUpperCase();
  return (TASK_KINDS as readonly string[]).includes(upper) ? (upper as TaskKind) : "TEXT";
}

function requiredText(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new ProtocolError(message);
  return value;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
