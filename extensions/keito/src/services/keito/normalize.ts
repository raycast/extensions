import { KeitoError } from "./errors";
import {
  ApprovalStatus,
  ExternalReference,
  ExternalReferenceInput,
  KeitoIdentity,
  Project,
  RawCurrentUser,
  RawExternalReference,
  RawProject,
  RawTask,
  RawTimeEntry,
  Task,
  TimeEntry,
} from "./types";

export function toId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/** Keito documents HH:mm but returns HH:mm:ss; keep HH:mm so edits compare and send the documented form. */
function toClock(value: unknown): string | undefined {
  const match = typeof value === "string" ? value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/) : null;
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : optionalText(value);
}

const APPROVAL_STATUSES: ApprovalStatus[] = ["unsubmitted", "submitted", "approved", "rejected"];

/**
 * Normalize GET /users/me. A personal read-only sync key returns `capabilities` and no `company`;
 * a full-access integration key returns the resolved company.
 */
export function normalizeIdentity(
  raw: RawCurrentUser,
  /** Company ID from preferences; undefined for OAuth, where Keito resolves the company from the token. */
  configuredAccountId: string | undefined,
  features: string[] = [],
  credentialType: "full_access" | "oauth" = "full_access",
): KeitoIdentity {
  const userId = toId(raw?.id);
  if (!userId) throw new KeitoError("unexpected_response", "Keito's /users/me response did not include a user ID.");

  const name =
    [raw.first_name, raw.last_name].filter((s) => typeof s === "string" && s.trim()).join(" ") || "Keito user";
  const companyId = toId(raw.company?.id);
  const isReadOnly = !companyId && raw.capabilities !== undefined;

  if (isReadOnly) {
    throw new KeitoError(
      "read_only_key",
      "This is a personal read-only sync key. It cannot list tasks or start, stop, create, edit, or delete time. Ask a Keito Administrator to create a full-access integration key bound to you (Settings → API & Developers → Integration keys → All permitted operations).",
    );
  }
  if (!companyId) {
    throw new KeitoError(
      "unexpected_response",
      "Keito's /users/me response did not include a company. The key may not be a full-access integration key.",
    );
  }
  if (configuredAccountId !== undefined && companyId !== configuredAccountId) {
    throw new KeitoError(
      "company_mismatch",
      "The key resolved to a different Keito company than the Company ID in preferences. Check both values in Settings → API & Developers.",
    );
  }

  if (raw.capabilities?.can_track_time === false) {
    throw new KeitoError(
      "tracking_not_allowed",
      "Your Keito identity is not allowed to track time in this company. Ask a Keito Administrator to check your role, or to bind the key to the person whose time you track.",
    );
  }

  const company = raw.company ?? {};
  return {
    userId,
    name,
    email: optionalText(raw.email),
    roles: Array.isArray(raw.roles) ? raw.roles.filter((r) => typeof r === "string") : [],
    userType: optionalText(raw.user_type),
    companyId,
    companyName: optionalText(raw.company?.name),
    credentialType,
    features,
    settings: {
      timezone: optionalText(company.timezone),
      manualEntryFormat: optionalText(company.manual_entry_format),
      requireNotes: company.require_notes === true,
      allowPastTimerStarts:
        typeof company.allow_past_timer_starts === "boolean" ? company.allow_past_timer_starts : undefined,
      timeRoundingDescription: optionalText(company.time_rounding_description),
    },
  };
}

/** Projects the identity cannot track time on (can_track_time: false) are dropped. */
export function normalizeProject(raw: RawProject): Project | undefined {
  const id = toId(raw?.id);
  if (!id || raw.can_track_time === false) return undefined;
  return {
    id,
    name: optionalText(raw.name) ?? "Untitled project",
    code: optionalText(raw.code),
    clientId: toId(raw.client?.id) ?? toId(raw.client_id),
    clientName: optionalText(raw.client?.name),
  };
}

export function normalizeTask(raw: RawTask): Task | undefined {
  const id = toId(raw?.id);
  if (!id) return undefined;
  return { id, name: optionalText(raw.name) ?? "Untitled task" };
}

function normalizeExternalReference(raw: RawExternalReference | null | undefined): ExternalReference | undefined {
  const id = toId(raw?.id);
  if (!raw || !id) return undefined;
  return {
    id,
    permalink: optionalText(raw.permalink),
    service: optionalText(raw.service),
    serviceName: optionalText(raw.service_name),
    serviceIconUrl: optionalText(raw.service_icon_url),
    groupId: optionalText(raw.group_id),
    accountId: optionalText(raw.account_id),
    displayName: optionalText(raw.display_name),
    groupName: optionalText(raw.group_name),
    parentId: optionalText(raw.parent_id),
  };
}

/** Request form of an external reference, limited to the fields Keito documents for writes. */
export function externalReferenceInput(ref: ExternalReference | undefined): ExternalReferenceInput | undefined {
  if (!ref) return undefined;
  const input: ExternalReferenceInput = { id: ref.id };
  if (ref.permalink) input.permalink = ref.permalink;
  if (ref.service) input.service = ref.service;
  if (ref.serviceName) input.service_name = ref.serviceName;
  if (ref.groupId) input.group_id = ref.groupId;
  if (ref.accountId) input.account_id = ref.accountId;
  if (ref.displayName) input.display_name = ref.displayName;
  if (ref.groupName) input.group_name = ref.groupName;
  if (ref.parentId) input.parent_id = ref.parentId;
  return input;
}

export interface NameLookup {
  projects?: Map<string, Project>;
  tasks?: Map<string, Task>;
}

/**
 * Normalize a time entry. Full-access responses nest `project`/`task`/`client` objects; other
 * credential types return flat `*_id` fields. Missing names are filled from discovered projects.
 */
export function normalizeTimeEntry(raw: RawTimeEntry, lookup: NameLookup = {}): TimeEntry {
  const id = toId(raw?.id);
  const projectId = toId(raw?.project?.id) ?? toId(raw?.project_id);
  const taskId = toId(raw?.task?.id) ?? toId(raw?.task_id);
  if (!id || !projectId || !taskId) {
    throw new KeitoError("unexpected_response", "Keito returned a time entry without an ID, project, or task.");
  }
  const project = lookup.projects?.get(projectId);
  const task = lookup.tasks?.get(taskId);
  const durationSeconds = toNumber(raw.duration_seconds);
  const hours = toNumber(raw.hours) ?? (durationSeconds !== undefined ? durationSeconds / 3600 : 0);
  const approval = APPROVAL_STATUSES.find((s) => s === raw.approval_status);

  return {
    id,
    userId: toId(raw.user?.id) ?? toId(raw.user_id),
    projectId,
    projectName: optionalText(raw.project?.name) ?? project?.name ?? "Unknown project",
    projectCode: optionalText(raw.project?.code) ?? project?.code,
    taskId,
    taskName: optionalText(raw.task?.name) ?? task?.name ?? "Unknown task",
    clientId: toId(raw.client?.id) ?? toId(raw.client_id) ?? project?.clientId,
    clientName: optionalText(raw.client?.name) ?? project?.clientName,
    spentDate: optionalText(raw.spent_date) ?? "",
    hours,
    durationSeconds,
    notes: typeof raw.notes === "string" ? raw.notes : "",
    isRunning: raw.is_running === true,
    timerStartedAt: optionalText(raw.timer_started_at),
    startedTime: toClock(raw.started_time),
    endedTime: toClock(raw.ended_time),
    isLocked: raw.is_locked === true,
    lockedReason: optionalText(raw.locked_reason),
    isClosed: raw.is_closed === true,
    isBilled: raw.is_billed === true,
    billable: typeof raw.billable === "boolean" ? raw.billable : undefined,
    approvalStatus: approval,
    source: optionalText(raw.source),
    externalReference: normalizeExternalReference(raw.external_reference),
    createdAt: optionalText(raw.created_at),
    updatedAt: optionalText(raw.updated_at),
  };
}

/** Fill names that a response omitted, using projects discovered later. */
export function enrichEntry(entry: TimeEntry, projects: Map<string, Project> | undefined): TimeEntry {
  const project = projects?.get(entry.projectId);
  if (!project) return entry;
  return {
    ...entry,
    projectName: entry.projectName === "Unknown project" ? project.name : entry.projectName,
    projectCode: entry.projectCode ?? project.code,
    clientId: entry.clientId ?? project.clientId,
    clientName: entry.clientName ?? project.clientName,
  };
}

export interface Editability {
  canEdit: boolean;
  canDelete: boolean;
  canRestart: boolean;
  reason?: string;
}

/**
 * Keito reports approval through approval_status; approved time also has is_locked: true while
 * is_closed can stay false. Harvest-imported closed time is treated as read-only as well.
 * Submitted and billed time is left to the server, which reports is_locked or returns an error.
 */
export function entryEditability(entry: TimeEntry): Editability {
  let reason: string | undefined;
  if (entry.approvalStatus === "approved") reason = "Approved time cannot be changed.";
  else if (entry.isLocked) reason = entry.lockedReason ?? "This entry is locked.";
  else if (entry.isClosed) reason = "This entry is closed.";
  const editable = !reason;
  return { canEdit: editable, canDelete: editable, canRestart: editable, reason };
}

export function approvalLabel(status: ApprovalStatus | undefined): string | undefined {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return undefined;
  }
}

export type TimeFormat = "hours_minutes" | "decimal";

export function formatHours(hours: number | undefined, format: TimeFormat | string = "hours_minutes"): string {
  if (hours === undefined || !Number.isFinite(hours)) return "";
  if (format === "decimal") return hours.toFixed(2);
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m < 10 ? "0" : ""}${m}`;
}
