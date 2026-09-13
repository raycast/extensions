import moment, { type Moment } from "moment-timezone";

import type { Project } from "../domain/project";
import type { ChecklistItem, Task, TaskKind, TaskPriority, TaskStatus } from "../domain/task";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";
import {
  isAllowedBackendExactTaskUrl,
  isNativeExactTaskLinkable,
  nativeExactTaskUrl,
  searchTaskUrl,
} from "../platform/taskLinks";
import { resolveTaskActions, type TaskActionDescriptor, type TaskExactLinkStrategy } from "./taskActions";

export type DomainTaskStatusLabel = "Open" | "Completed";
export type DomainTaskPriorityLabel = "None" | "Low" | "Medium" | "High";
export type DomainTaskKindLabel = "Task" | "Checklist" | "Note";

export interface DomainChecklistItemMetadata {
  readonly title: string;
  readonly status: DomainTaskStatusLabel;
  readonly sortOrder: number;
}

export interface DomainChecklistMetadata {
  readonly completed: number;
  readonly total: number;
  readonly items: readonly DomainChecklistItemMetadata[];
}

export interface DomainTaskDateMetadata {
  readonly mode: "all-day" | "floating" | "bound";
  readonly timeZone: string;
  readonly start?: string;
  readonly due?: string;
}

export interface DomainTaskItemMetadata {
  readonly project: string;
  readonly status: DomainTaskStatusLabel;
  readonly priority: DomainTaskPriorityLabel;
  readonly kind: DomainTaskKindLabel;
  readonly tags: readonly string[];
  readonly date?: DomainTaskDateMetadata;
  readonly checklist?: DomainChecklistMetadata;
}

export interface DomainTaskItemModel {
  readonly rowId: string;
  readonly title: string;
  readonly detailMarkdown: string;
  readonly copyText: string;
  readonly metadata: DomainTaskItemMetadata;
  readonly exactTarget?: string;
  readonly searchTarget?: string;
  readonly actions: readonly TaskActionDescriptor[];
}

interface SortedChecklistItem {
  readonly source: ChecklistItem;
  readonly originalIndex: number;
}

interface ParsedDisplayDate {
  readonly instantMs: number;
  readonly display: Moment;
}

export function buildDomainTaskItemModel(
  task: Task,
  projects: readonly Project[],
  capabilities: BackendCapabilities,
  exactStrategy: TaskExactLinkStrategy,
  uiTimeZone: string
): DomainTaskItemModel {
  const title = safeSingleLine(task.title) || "Untitled Task";
  const checklist = buildChecklistMetadata(task);
  const content = safeMultiline(task.content);
  const description = safeMultiline(task.description);
  const detailMarkdown = buildDetailMarkdown(title, content, description, checklist);
  const copyText = buildCopyText(title, content, description, checklist);
  const exactTarget = buildExactTarget(task, capabilities, exactStrategy);
  const searchTarget = buildSearchTarget(task);
  const actions = Object.freeze(
    resolveTaskActions(task, capabilities, exactStrategy).filter(
      (action) =>
        (action.key !== "open-exact" || exactTarget !== undefined) &&
        (action.key !== "search" || searchTarget !== undefined)
    )
  );
  const tags = Object.freeze(task.tags.map(safeSingleLine).filter((tag) => tag.length > 0));
  const date = buildDateMetadata(task, uiTimeZone);
  const metadata: DomainTaskItemMetadata = Object.freeze({
    project: resolveProjectName(task, projects),
    status: statusLabel(task.status),
    priority: priorityLabel(task.priority),
    kind: kindLabel(task.kind),
    tags,
    ...(date === undefined ? {} : { date }),
    ...(checklist === undefined ? {} : { checklist }),
  });

  return Object.freeze({
    rowId: JSON.stringify([task.projectId, task.id]),
    title,
    detailMarkdown,
    copyText,
    metadata,
    ...(exactTarget === undefined ? {} : { exactTarget }),
    ...(searchTarget === undefined ? {} : { searchTarget }),
    actions,
  });
}

function resolveProjectName(task: Task, projects: readonly Project[]): string {
  const projectName = projects.find((project) => project.id === task.projectId)?.name;
  return safeSingleLine(projectName) || safeSingleLine(task.projectName) || "Unknown List";
}

function statusLabel(status: TaskStatus): DomainTaskStatusLabel {
  return status === "completed" ? "Completed" : "Open";
}

function priorityLabel(priority: TaskPriority): DomainTaskPriorityLabel {
  switch (priority) {
    case 1:
      return "Low";
    case 3:
      return "Medium";
    case 5:
      return "High";
    case 0:
      return "None";
  }
}

function kindLabel(kind: TaskKind): DomainTaskKindLabel {
  switch (kind) {
    case "CHECKLIST":
      return "Checklist";
    case "NOTE":
      return "Note";
    case "TEXT":
      return "Task";
  }
}

function buildChecklistMetadata(task: Task): DomainChecklistMetadata | undefined {
  const sourceItems = task.items ?? [];
  if (task.kind !== "CHECKLIST" && sourceItems.length === 0) return undefined;

  const sorted = sourceItems
    .map((source, originalIndex): SortedChecklistItem => ({ source, originalIndex }))
    .sort((left, right) => left.source.sortOrder - right.source.sortOrder || left.originalIndex - right.originalIndex);
  const items = Object.freeze(
    sorted.map(({ source }) =>
      Object.freeze({
        title: safeSingleLine(source.title) || "Untitled Checklist Item",
        status: statusLabel(source.status),
        sortOrder: source.sortOrder,
      })
    )
  );

  return Object.freeze({
    completed: sourceItems.filter((item) => item.status === "completed").length,
    total: sourceItems.length,
    items,
  });
}

function buildDetailMarkdown(
  title: string,
  content: string,
  description: string,
  checklist: DomainChecklistMetadata | undefined
): string {
  const sections = [`# ${escapeMarkdownLiteral(title)}`];
  if (content) sections.push(`## Content\n\n${escapeMarkdownLiteral(content)}`);
  if (description) sections.push(`## Description\n\n${escapeMarkdownLiteral(description)}`);
  if (checklist && checklist.items.length > 0) {
    const items = checklist.items
      .map((item) => `- [${item.status === "Completed" ? "x" : " "}] ${escapeMarkdownLiteral(item.title)}`)
      .join("\n");
    sections.push(`## Checklist\n\n${items}`);
  }
  return sections.join("\n\n");
}

function buildCopyText(
  title: string,
  content: string,
  description: string,
  checklist: DomainChecklistMetadata | undefined
): string {
  const sections = [title];
  if (content) sections.push(content);
  if (description) sections.push(description);
  if (checklist && checklist.items.length > 0) {
    sections.push(checklist.items.map((item) => `${item.status === "Completed" ? "☑" : "☐"} ${item.title}`).join("\n"));
  }
  return sections.join("\n\n");
}

function escapeMarkdownLiteral(value: string): string {
  return value.replace(/[!-/:-@[-`{-~]/g, "\\$&");
}

function safeSingleLine(value: unknown): string {
  return normalizeUserText(value).replace(/\s+/gu, " ").trim();
}

function safeMultiline(value: unknown): string {
  return normalizeUserText(value).trim();
}

function normalizeUserText(value: unknown): string {
  if (typeof value !== "string") return "";

  let normalized = "";
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit === 0x0d) {
      if (value.charCodeAt(index + 1) === 0x0a) index += 1;
      normalized += "\n";
      continue;
    }
    if (codeUnit === 0x0a || codeUnit === 0x2028 || codeUnit === 0x2029) {
      normalized += "\n";
      continue;
    }
    if (codeUnit === 0x09 || codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) {
      normalized += " ";
      continue;
    }
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        const character = value[index] + value[index + 1];
        normalized += /\p{C}/u.test(character) ? " " : character;
        index += 1;
      } else {
        normalized += "�";
      }
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      normalized += "�";
      continue;
    }

    const character = value[index];
    normalized += /\p{C}/u.test(character) ? " " : character;
  }
  return normalized;
}

function buildExactTarget(
  task: Task,
  capabilities: BackendCapabilities,
  exactStrategy: TaskExactLinkStrategy
): string | undefined {
  if (exactStrategy === "backend-url") {
    return capabilities.exactTaskLink && isAllowedBackendExactTaskUrl(task.exactUrl) ? task.exactUrl : undefined;
  }
  if (exactStrategy !== "native-project-uri" || !isNativeExactTaskLinkable(task)) return undefined;

  try {
    return nativeExactTaskUrl(task);
  } catch {
    return undefined;
  }
}

function buildSearchTarget(task: Task): string | undefined {
  if (!isSafeSearchTitle(task.title)) return undefined;
  try {
    return searchTaskUrl(task);
  } catch {
    return undefined;
  }
}

function isSafeSearchTitle(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return false;
  }

  return !Array.from(value).some((character) => /\p{C}/u.test(character));
}

function buildDateMetadata(task: Task, uiTimeZone: string): DomainTaskDateMetadata | undefined {
  if (task.startDate === undefined && task.dueDate === undefined) return undefined;
  if (!moment.tz.zone(task.timeZone) || !moment.tz.zone(uiTimeZone)) return undefined;

  try {
    const mode: DomainTaskDateMetadata["mode"] = task.isAllDay ? "all-day" : task.isFloating ? "floating" : "bound";
    const displayTimeZone = mode === "bound" ? uiTimeZone : task.timeZone;
    const start = task.startDate === undefined ? undefined : parseDisplayDate(task.startDate, task, displayTimeZone);
    const due = task.dueDate === undefined ? undefined : parseDisplayDate(task.dueDate, task, displayTimeZone);
    if ((task.startDate !== undefined && !start) || (task.dueDate !== undefined && !due)) return undefined;
    if (start && due && isDateRangeBackwards(start, due, mode)) return undefined;

    const format = mode === "all-day" ? "MMM D, YYYY" : "MMM D, YYYY [at] h:mm A z";
    return Object.freeze({
      mode,
      timeZone: displayTimeZone,
      ...(start === undefined ? {} : { start: start.display.format(format) }),
      ...(due === undefined ? {} : { due: due.display.format(format) }),
    });
  } catch {
    return undefined;
  }
}

function parseDisplayDate(value: string, task: Task, displayTimeZone: string): ParsedDisplayDate | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const parsed = hasExplicitOffset
    ? moment.parseZone(value, moment.ISO_8601, true)
    : moment.tz(value, moment.ISO_8601, true, task.timeZone);
  if (!parsed.isValid()) return undefined;
  if (!hasExplicitOffset) {
    const requestedWallTime = moment.utc(value, moment.ISO_8601, true);
    if (!requestedWallTime.isValid() || compareWallClock(requestedWallTime, parsed) !== 0) return undefined;
  }

  return {
    instantMs: parsed.valueOf(),
    display: parsed.clone().tz(displayTimeZone),
  };
}

function isDateRangeBackwards(
  start: ParsedDisplayDate,
  due: ParsedDisplayDate,
  mode: DomainTaskDateMetadata["mode"]
): boolean {
  if (mode === "bound") return due.instantMs < start.instantMs;
  if (mode === "floating") return compareWallClock(due.display, start.display) < 0;
  return compareCalendarDate(due.display, start.display) < 0;
}

function compareWallClock(left: Moment, right: Moment): number {
  return compareNumberTuples(
    [left.year(), left.month(), left.date(), left.hour(), left.minute(), left.second(), left.millisecond()],
    [right.year(), right.month(), right.date(), right.hour(), right.minute(), right.second(), right.millisecond()]
  );
}

function compareCalendarDate(left: Moment, right: Moment): number {
  return compareNumberTuples([left.year(), left.month(), left.date()], [right.year(), right.month(), right.date()]);
}

function compareNumberTuples(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}
