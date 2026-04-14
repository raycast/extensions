import { RAYLOG_SCHEMA_VERSION } from "./constants";
import { isTaskViewFilter } from "./tasks";
import { RaylogParseError, RaylogSchemaError } from "./storage-errors";
import type {
  RaylogDocument,
  TaskListViewMode,
  TaskRecord,
  TaskStatus,
  TaskWorkLogRecord,
} from "./types";

export function createEmptyDocument(): RaylogDocument {
  return {
    schemaVersion: RAYLOG_SCHEMA_VERSION,
    tasks: [],
    viewState: {
      hasSelectedListTasksFilter: false,
      listTasksFilter: "open",
      hasSelectedListViewMode: false,
      listViewMode: "summary",
    },
  };
}

export function parseRaylogMarkdown(markdown: string): {
  document: RaylogDocument;
  hasManagedBlock: boolean;
} {
  const match = markdown.match(RAYLOG_BLOCK_PATTERN);
  if (!match) {
    return {
      document: createEmptyDocument(),
      hasManagedBlock: false,
    };
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<RaylogDocument>;
    if (typeof parsed !== "object" || parsed === null) {
      throw new RaylogSchemaError(
        "The Raylog database is corrupted.",
        "The managed JSON block must contain an object.",
      );
    }

    if (parsed.schemaVersion !== RAYLOG_SCHEMA_VERSION) {
      throw new RaylogSchemaError(
        "The Raylog database uses an unsupported schema version.",
        `Expected schema v${RAYLOG_SCHEMA_VERSION}, found ${formatSchemaVersion(parsed.schemaVersion)}.`,
      );
    }

    if (!Array.isArray(parsed.tasks)) {
      throw new RaylogSchemaError(
        "The Raylog database is corrupted.",
        'The managed JSON block is missing the required "tasks" array.',
      );
    }

    return {
      document: {
        schemaVersion: parsed.schemaVersion,
        tasks: parsed.tasks.map(normalizeTaskRecord),
        viewState: normalizeViewState(parsed.viewState),
      },
      hasManagedBlock: true,
    };
  } catch (error) {
    if (error instanceof RaylogSchemaError) {
      throw error;
    }

    throw new RaylogParseError(
      "The Raylog database is corrupted.",
      describeParseFailure(match[1], error),
    );
  }
}

export function isRaylogDocument(value: unknown): value is RaylogDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    "tasks" in value &&
    "viewState" in value
  );
}

export const RAYLOG_BLOCK_PATTERN = new RegExp(
  `${escapeForRegExp("<!-- raylog:start -->")}\\s*${escapeForRegExp("```json")}\\s*([\\s\\S]*?)\\s*${escapeForRegExp("```")}\\s*${escapeForRegExp("<!-- raylog:end -->")}`,
  "m",
);

function normalizeTaskRecord(task: unknown): TaskRecord {
  if (typeof task !== "object" || task === null) {
    throw new Error("Invalid task record.");
  }

  const candidate = task as Partial<TaskRecord>;
  if ("blockedByTaskIds" in candidate || "blocksTaskIds" in candidate) {
    throw new Error("Task dependencies are no longer supported.");
  }

  return {
    id: requireString(candidate.id, "Task id"),
    header: requireString(candidate.header, "Task header"),
    body: typeof candidate.body === "string" ? candidate.body : "",
    workLogs: normalizeWorkLogs(candidate.workLogs),
    status: normalizeTaskStatus(candidate.status),
    dueDate: normalizeNullableString(candidate.dueDate),
    startDate: normalizeNullableString(candidate.startDate),
    completedAt: normalizeNullableString(candidate.completedAt),
    createdAt: requireString(candidate.createdAt, "Task createdAt"),
    updatedAt: requireString(candidate.updatedAt, "Task updatedAt"),
  };
}

function normalizeViewState(value: unknown): RaylogDocument["viewState"] {
  if (typeof value !== "object" || value === null) {
    return createEmptyDocument().viewState;
  }

  const candidate = value as Partial<RaylogDocument["viewState"]>;
  return {
    hasSelectedListTasksFilter:
      typeof candidate.hasSelectedListTasksFilter === "boolean"
        ? candidate.hasSelectedListTasksFilter
        : false,
    listTasksFilter: isTaskViewFilter(candidate.listTasksFilter)
      ? candidate.listTasksFilter
      : "all",
    hasSelectedListViewMode:
      typeof candidate.hasSelectedListViewMode === "boolean"
        ? candidate.hasSelectedListViewMode
        : false,
    listViewMode: isTaskListViewMode(candidate.listViewMode)
      ? candidate.listViewMode
      : "summary",
  };
}

function isTaskListViewMode(value: unknown): value is TaskListViewMode {
  return value === "summary" || value === "list";
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is invalid.`);
  }

  return value;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeWorkLogs(value: unknown): TaskWorkLogRecord[] {
  if (!Array.isArray(value)) {
    throw new Error("Task workLogs are invalid.");
  }

  return value.map((workLog) => normalizeWorkLogRecord(workLog));
}

function normalizeWorkLogRecord(value: unknown): TaskWorkLogRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid work log record.");
  }

  const candidate = value as Partial<TaskWorkLogRecord>;
  return {
    id: requireString(candidate.id, "Work log id"),
    body: requireString(candidate.body, "Work log body"),
    createdAt: requireString(candidate.createdAt, "Work log createdAt"),
    updatedAt: normalizeNullableString(candidate.updatedAt),
  };
}

function normalizeTaskStatus(value: unknown): TaskStatus {
  if (
    value === "todo" ||
    value === "in_progress" ||
    value === "done" ||
    value === "archived"
  ) {
    return value;
  }

  throw new Error("Task status is invalid.");
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatSchemaVersion(value: unknown): string {
  return typeof value === "number" ? `schema v${value}` : "an unknown schema";
}

function describeParseFailure(payload: string, error: unknown): string {
  if (!(error instanceof Error)) {
    return "The managed JSON block could not be parsed.";
  }

  const jsonSyntaxDetail = describeJsonSyntaxError(payload, error.message);
  if (jsonSyntaxDetail) {
    return jsonSyntaxDetail;
  }

  return describeValidationFailure(error.message);
}

function describeJsonSyntaxError(
  payload: string,
  message: string,
): string | undefined {
  const match = message.match(
    /^(.*?) at position (\d+)(?: \(line (\d+) column (\d+)\))?$/i,
  );

  if (!match) {
    return undefined;
  }

  const [, reason, positionText, lineText, columnText] = match;
  const position = Number.parseInt(positionText, 10);
  const { line, column } =
    lineText && columnText
      ? {
          line: Number.parseInt(lineText, 10),
          column: Number.parseInt(columnText, 10),
        }
      : getLineAndColumnFromPosition(payload, position);

  return `Malformed JSON near line ${line}, column ${column}: ${lowercaseFirst(trimTrailingPeriod(reason))}.`;
}

function describeValidationFailure(message: string): string {
  if (message.startsWith("Task ")) {
    return `Malformed task data: ${lowercaseFirst(trimTrailingPeriod(message))}.`;
  }

  if (message.startsWith("Work log ")) {
    return `Malformed work log data: ${lowercaseFirst(trimTrailingPeriod(message))}.`;
  }

  if (
    message === "Invalid task record." ||
    message === "Task workLogs are invalid." ||
    message === "Invalid work log record." ||
    message === "Task status is invalid."
  ) {
    return `${trimTrailingPeriod(message)}.`;
  }

  return `Malformed Raylog data: ${lowercaseFirst(trimTrailingPeriod(message))}.`;
}

function trimTrailingPeriod(value: string): string {
  return value.replace(/\.+$/, "");
}

function lowercaseFirst(value: string): string {
  return value.length > 0
    ? `${value.charAt(0).toLowerCase()}${value.slice(1)}`
    : value;
}

function getLineAndColumnFromPosition(
  payload: string,
  position: number,
): { line: number; column: number } {
  const clampedPosition = Number.isNaN(position)
    ? payload.length
    : Math.min(Math.max(position, 0), payload.length);
  const preceding = payload.slice(0, clampedPosition);
  const lines = preceding.split("\n");

  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}
