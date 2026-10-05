/** The task UI wire. Importless so the Edge Function and both clients share it. */
export const TASK_CONTROL_TTL_MS = 30_000;
const MAX_TEXT_LENGTH = 2000;
export const TASK_CONTROL_MAX_MINUTES = 365 * 24 * 60;

export type TaskAction =
  | { kind: "snapshot" }
  | { kind: "start"; description: string; durationMinutes: number; customDuration?: true }
  | { kind: "edit"; description: string }
  | { kind: "pause" | "resume" | "stop" | "complete" }
  | { kind: "lock"; durationMinutes?: number }
  | { kind: "bookmark"; description: string; bookmarked: boolean }
  | { kind: "delete-recent"; description: string }
  | { kind: "review-message"; message: string }
  | { kind: "review-edit"; message: string; durationMinutes?: number; customDuration?: true }
  | { kind: "review-cancel" };

export interface TaskControlRequest {
  action: TaskAction;
  expectedTaskId: string | null;
  expectedReviewId: string | null;
}

export interface TaskView {
  id: string;
  description: string;
  context: string;
  source: "todoist" | "obsidian" | null;
  sourceUrl: string | null;
  startedAt: number;
  elapsedMs: number;
  remainingMs: number | null;
  paused: boolean;
  openEnded: boolean;
  locked: boolean;
  lockEndsAt: number | null;
  canLock: boolean;
}

export interface TaskReview {
  id: string;
  kind: "start" | "edit";
  description: string;
  durationMinutes: number;
  status: "checking" | "unproductive" | "error";
  chat: { role: string; content: string }[];
  /** When the backend drops this review unless something happens in it first.
   *  Absent from the legacy device queue and from snapshots cached before it. */
  expiresAt?: number;
}

export interface TaskSnapshot {
  deviceId: string;
  capturedAt: number;
  task: TaskView | null;
  review: TaskReview | null;
  recentTasks: { description: string; durationMinutes: number; bookmarked?: boolean; workedMs: number }[];
  durationChoices: number[];
  defaultDurationMinutes: number;
  customDurationAllowed: boolean;
  maxDurationMinutes: number;
  descriptionLimit: number;
  canStart: boolean;
  weekSpent: boolean;
}

export type TaskControlResponse =
  { ok: true; snapshot: TaskSnapshot } | { ok: false; error: string; snapshot?: TaskSnapshot };

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEXT_LENGTH;
}

function duration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= TASK_CONTROL_MAX_MINUTES;
}

function identifier(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0 && value.length <= 128);
}

/** Rebuild the allowed shape: arbitrary events and client-supplied origins never cross this wire. */
export function parseTaskControlRequest(value: unknown): TaskControlRequest | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!identifier(input.expectedTaskId) || !identifier(input.expectedReviewId)) return null;
  if (!input.action || typeof input.action !== "object") return null;
  const candidate = input.action as Record<string, unknown>;
  let action: TaskAction;
  switch (candidate.kind) {
    case "snapshot":
    case "pause":
    case "resume":
    case "stop":
    case "complete":
    case "review-cancel":
      action = { kind: candidate.kind };
      break;
    case "start":
      if (!text(candidate.description) || !duration(candidate.durationMinutes)) return null;
      action = {
        kind: "start",
        description: candidate.description.trim(),
        durationMinutes: candidate.durationMinutes,
        ...(candidate.customDuration === true ? { customDuration: true } : {}),
      };
      break;
    case "edit":
    case "delete-recent":
      if (!text(candidate.description)) return null;
      action = { kind: candidate.kind, description: candidate.description.trim() };
      break;
    case "bookmark":
      if (!text(candidate.description) || typeof candidate.bookmarked !== "boolean") return null;
      action = { kind: "bookmark", description: candidate.description.trim(), bookmarked: candidate.bookmarked };
      break;
    case "lock":
      if (candidate.durationMinutes !== undefined && !duration(candidate.durationMinutes)) return null;
      action = {
        kind: "lock",
        ...(candidate.durationMinutes !== undefined ? { durationMinutes: candidate.durationMinutes as number } : {}),
      };
      break;
    case "review-edit":
      if (!text(candidate.message)) return null;
      if (candidate.durationMinutes !== undefined && !duration(candidate.durationMinutes)) return null;
      action = {
        kind: candidate.kind,
        message: candidate.message.trim(),
        ...(candidate.durationMinutes !== undefined ? { durationMinutes: candidate.durationMinutes as number } : {}),
        ...(candidate.customDuration === true ? { customDuration: true } : {}),
      };
      break;
    case "review-message":
      if (!text(candidate.message)) return null;
      action = { kind: candidate.kind, message: candidate.message.trim() };
      break;
    default:
      return null;
  }
  return { action, expectedTaskId: input.expectedTaskId, expectedReviewId: input.expectedReviewId };
}
