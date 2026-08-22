import type { GroundcrewCanonicalStatus, GroundcrewTask, GroundcrewTaskBlocker } from "../types/groundcrew";
import { GroundcrewClientError } from "./errors";

const CANONICAL_STATUSES = new Set<GroundcrewCanonicalStatus>(["todo", "in-progress", "in-review", "done", "other"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isCanonicalStatus(value: unknown): value is GroundcrewCanonicalStatus {
  return typeof value === "string" && CANONICAL_STATUSES.has(value as GroundcrewCanonicalStatus);
}

function isTaskBlocker(value: unknown): value is GroundcrewTaskBlocker {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isCanonicalStatus(value.status) &&
    (value.statusReason === undefined || value.statusReason === "missing" || value.statusReason === "unmapped") &&
    isOptionalString(value.nativeStatus)
  );
}

function isTask(value: unknown): value is GroundcrewTask {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    isCanonicalStatus(value.status) &&
    isOptionalString(value.repository) &&
    isOptionalString(value.agent) &&
    typeof value.assignee === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.blockers) &&
    value.blockers.every(isTaskBlocker) &&
    typeof value.hasMoreBlockers === "boolean" &&
    isOptionalString(value.url) &&
    (value.priority === undefined || (typeof value.priority === "number" && Number.isFinite(value.priority)))
  );
}

function parseJson(output: string, commandDescription: string): unknown {
  try {
    return JSON.parse(output) as unknown;
  } catch (error) {
    throw new GroundcrewClientError("MALFORMED_JSON", `Groundcrew returned malformed JSON for ${commandDescription}.`, {
      cause: error,
      diagnostics: { stdout: output },
    });
  }
}

export function parseTaskListJson(output: string): GroundcrewTask[] {
  const parsed = parseJson(output, "crew task list --json");
  if (!Array.isArray(parsed) || !parsed.every(isTask)) {
    throw new GroundcrewClientError(
      "INVALID_JSON_SHAPE",
      "Groundcrew returned JSON that does not match the task-list contract. Upgrade Groundcrew or check the selected executable.",
      { diagnostics: { stdout: output } },
    );
  }
  return parsed;
}

export function parseTaskJson(output: string): GroundcrewTask {
  const parsed = parseJson(output, "crew task get --json");
  if (!isTask(parsed)) {
    throw new GroundcrewClientError(
      "INVALID_JSON_SHAPE",
      "Groundcrew returned JSON that does not match the task contract. Upgrade Groundcrew or check the selected executable.",
      { diagnostics: { stdout: output } },
    );
  }
  return parsed;
}
