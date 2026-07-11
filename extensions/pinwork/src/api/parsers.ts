/**
 * Parsing helpers for Pinwork payloads.
 */

import type { Task, Project, Tag, TaskStatus } from "./types";
import {
  tasksPayloadSchema,
  projectsPayloadSchema,
  tagsPayloadSchema,
} from "./schema";

function parseISODate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function mapTaskStatus(status: string | undefined): TaskStatus {
  const normalized = (status ?? "").toLowerCase().trim();
  const statusMap: Record<string, TaskStatus> = {
    "not started": "active",
    "in progress": "inProgress",
    waiting: "waiting",
    someday: "somedayMaybe",
    done: "done",
    canceled: "canceled",
    cancelled: "canceled",
    active: "active",
    inprogress: "inProgress",
    in_progress: "inProgress",
    somedaymaybe: "somedayMaybe",
  };
  return statusMap[normalized] || "active";
}

function parseTasksFromJson(payload: unknown): Task[] {
  const result = tasksPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new Error("Invalid task JSON payload from Pinwork");
  }

  const rawTasks = Array.isArray(result.data) ? result.data : result.data.tasks;

  return rawTasks.map((raw) => {
    const scheduledDate = parseISODate(raw.scheduledDate);
    const deadline = parseISODate(raw.deadline);
    const createdAt = parseISODate(raw.createdAt) ?? new Date();
    const modifiedAt = parseISODate(raw.modifiedAt) ?? new Date();
    const completedAt = parseISODate(raw.completedAt);

    const scheduledDateHasTime =
      typeof raw.scheduledDateHasTime === "boolean"
        ? raw.scheduledDateHasTime
        : typeof raw.scheduledDateHasTime === "string"
          ? raw.scheduledDateHasTime.toLowerCase() === "true"
          : Boolean(raw.scheduledDate && raw.scheduledDate.includes("T"));

    const status = mapTaskStatus(raw.status);
    const isCompleted =
      typeof raw.isCompleted === "boolean"
        ? raw.isCompleted
        : typeof raw.isCompleted === "string"
          ? raw.isCompleted.toLowerCase() === "true"
          : status === "done";

    const estimate =
      typeof raw.estimate === "number"
        ? raw.estimate
        : typeof raw.estimate === "string"
          ? parseInt(raw.estimate, 10)
          : undefined;

    return {
      id: raw.id,
      title: raw.title,
      notes: raw.notes ?? undefined,
      status,
      scheduledDate,
      scheduledDateHasTime,
      deadline,
      estimate: Number.isFinite(estimate) ? estimate : undefined,
      projectId: raw.projectId ?? undefined,
      projectName: raw.projectName ?? undefined,
      tags: raw.tags ?? [],
      isCompleted,
      isRecurring:
        typeof raw.isRecurring === "boolean"
          ? raw.isRecurring
          : typeof raw.isRecurring === "string"
            ? raw.isRecurring.toLowerCase() === "true"
            : false,
      createdAt,
      modifiedAt,
      completedAt,
    };
  });
}

function parseProjectsFromJson(payload: unknown): Project[] {
  const result = projectsPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new Error("Invalid project JSON payload from Pinwork");
  }

  const rawProjects = Array.isArray(result.data)
    ? result.data
    : result.data.projects;

  return rawProjects.map((raw) => {
    const taskCount =
      typeof raw.taskCount === "number"
        ? raw.taskCount
        : typeof raw.taskCount === "string"
          ? parseInt(raw.taskCount, 10)
          : 0;
    const isArchived =
      typeof raw.isArchived === "boolean"
        ? raw.isArchived
        : typeof raw.isArchived === "string"
          ? raw.isArchived.toLowerCase() === "true"
          : false;
    return {
      id: raw.id,
      name: raw.name,
      color: raw.color ?? undefined,
      note: raw.note ?? undefined,
      taskCount: Number.isFinite(taskCount) ? taskCount : 0,
      isArchived,
    };
  });
}

function parseTagsFromJson(payload: unknown): Tag[] {
  const result = tagsPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new Error("Invalid tag JSON payload from Pinwork");
  }

  const rawTags = Array.isArray(result.data) ? result.data : result.data.tags;

  return rawTags.map((raw) => {
    const taskCount =
      typeof raw.taskCount === "number"
        ? raw.taskCount
        : typeof raw.taskCount === "string"
          ? parseInt(raw.taskCount, 10)
          : 0;
    return {
      name: raw.name,
      taskCount: Number.isFinite(taskCount) ? taskCount : 0,
    };
  });
}

function tryParseJson(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return undefined;
  }
}

function isLegacyPayload(output: string): boolean {
  return output.includes("|||") || output.includes("###");
}

function parseAppleScriptDate(dateStr: string | null): Date | undefined {
  if (!dateStr || dateStr === "missing value") return undefined;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseAppleScriptList(listStr: string | null): string[] {
  if (!listStr || listStr === "{}" || listStr === "missing value") return [];

  const match = listStr.match(/^\{(.+)\}$/);
  if (match) {
    return match[1]
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter((s) => s.length > 0);
  }

  return [];
}

function parseTasksFromLegacy(result: string): Task[] {
  if (!result || result.trim() === "") return [];

  const tasks: Task[] = [];
  const taskStrings = result.split("###").filter((s) => s.trim() !== "");

  for (const [index, taskStr] of taskStrings.entries()) {
    const parts = taskStr.split("|||");
    if (parts.length < 13) {
      throw new Error(
        `Invalid legacy task payload from Pinwork (record ${index + 1})`,
      );
    }

    const [
      id,
      title,
      notes,
      status,
      scheduledDate,
      deadline,
      estimate,
      projectName,
      tags,
      isCompleted,
      isRecurring,
      createdAt,
      modifiedAt,
    ] = parts;

    const mappedStatus = mapTaskStatus(status.trim());

    tasks.push({
      id: id.trim(),
      title: title.trim(),
      notes: notes === "missing value" ? undefined : notes.trim(),
      status: mappedStatus,
      scheduledDate: parseAppleScriptDate(scheduledDate),
      scheduledDateHasTime: false,
      deadline: parseAppleScriptDate(deadline),
      estimate:
        estimate === "missing value" ? undefined : parseInt(estimate, 10),
      projectId: undefined,
      projectName:
        projectName === "missing value" ? undefined : projectName.trim(),
      tags: parseAppleScriptList(tags),
      isCompleted: isCompleted.trim().toLowerCase() === "true",
      isRecurring: isRecurring.trim().toLowerCase() === "true",
      createdAt: parseAppleScriptDate(createdAt) ?? new Date(),
      modifiedAt: parseAppleScriptDate(modifiedAt) ?? new Date(),
      completedAt: undefined,
    });
  }

  return tasks;
}

function parseProjectsFromLegacy(result: string): Project[] {
  if (!result || result.trim() === "") return [];

  const projects: Project[] = [];
  const projectStrings = result.split("###").filter((s) => s.trim() !== "");

  for (const [index, projStr] of projectStrings.entries()) {
    const parts = projStr.split("|||");
    if (parts.length < 6) {
      throw new Error(
        `Invalid legacy project payload from Pinwork (record ${index + 1})`,
      );
    }

    const [id, name, color, note, taskCount, isArchived] = parts;

    projects.push({
      id: id.trim(),
      name: name.trim(),
      color: color === "missing value" ? undefined : color.trim(),
      note: note === "missing value" ? undefined : note.trim(),
      taskCount: parseInt(taskCount, 10) || 0,
      isArchived: isArchived.trim().toLowerCase() === "true",
    });
  }

  return projects;
}

function parseTagsFromLegacy(result: string): Tag[] {
  if (!result || result.trim() === "") return [];

  const tags: Tag[] = [];
  const tagStrings = result.split("###").filter((s) => s.trim() !== "");

  for (const [index, tagStr] of tagStrings.entries()) {
    const parts = tagStr.split("|||");
    if (parts.length < 2) {
      throw new Error(
        `Invalid legacy tag payload from Pinwork (record ${index + 1})`,
      );
    }

    const [name, taskCount] = parts;

    tags.push({
      name: name.trim(),
      taskCount: parseInt(taskCount, 10) || 0,
    });
  }

  return tags;
}

export function parseTasksOutput(output: string): Task[] {
  if (!output || output.trim() === "") return [];
  const trimmed = output.trim();
  const parsedJson = tryParseJson(trimmed);
  if (parsedJson !== undefined) {
    return parseTasksFromJson(parsedJson);
  }
  if (isLegacyPayload(trimmed)) {
    return parseTasksFromLegacy(trimmed);
  }
  throw new Error("Unrecognized task payload from Pinwork");
}

export function parseProjectsOutput(output: string): Project[] {
  if (!output || output.trim() === "") return [];
  const trimmed = output.trim();
  const parsedJson = tryParseJson(trimmed);
  if (parsedJson !== undefined) {
    return parseProjectsFromJson(parsedJson);
  }
  if (isLegacyPayload(trimmed)) {
    return parseProjectsFromLegacy(trimmed);
  }
  throw new Error("Unrecognized project payload from Pinwork");
}

export function parseTagsOutput(output: string): Tag[] {
  if (!output || output.trim() === "") return [];
  const trimmed = output.trim();
  const parsedJson = tryParseJson(trimmed);
  if (parsedJson !== undefined) {
    return parseTagsFromJson(parsedJson);
  }
  if (isLegacyPayload(trimmed)) {
    return parseTagsFromLegacy(trimmed);
  }
  throw new Error("Unrecognized tag payload from Pinwork");
}
