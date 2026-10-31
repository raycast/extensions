import { KeitoApi } from "./api";
import { isKeitoError, KeitoError } from "./errors";
import { entryEditability, externalReferenceInput, NameLookup } from "./normalize";
import { ExternalReference, TimeEntry, TimeEntryCreateBody, TimeEntryUpdateBody } from "./types";
import { parseClockTime, parseDuration } from "../parseDuration";

export interface WorkflowContext {
  api: KeitoApi;
  userId: string;
  lookup?: NameLookup;
  /**
   * Asked when Keito reports another running timer. Return true to switch timers
   * (replace_running: true). Without it, the conflict error is rethrown.
   */
  confirmReplace?: (running: TimeEntry | undefined) => Promise<boolean>;
}

export type StartResult =
  { status: "started"; entry: TimeEntry; replaced?: TimeEntry } | { status: "cancelled"; running?: TimeEntry };

async function findRunning(ctx: WorkflowContext, runningEntryId?: string): Promise<TimeEntry | undefined> {
  try {
    const running = await ctx.api.listRunningEntries(ctx.userId, ctx.lookup);
    return running.find((e) => e.id === runningEntryId) ?? running[0];
  } catch {
    return undefined;
  }
}

async function withConflictResolution(
  ctx: WorkflowContext,
  attempt: (replaceRunning: boolean) => Promise<TimeEntry | undefined>,
): Promise<StartResult> {
  try {
    const entry = await attempt(false);
    if (!entry) throw new KeitoError("unexpected_response", "Keito did not return the started timer.");
    return { status: "started", entry };
  } catch (error) {
    if (!isKeitoError(error) || error.kind !== "running_timer_conflict" || !ctx.confirmReplace) throw error;
    const running = await findRunning(ctx, error.runningEntryId);
    if (!(await ctx.confirmReplace(running))) return { status: "cancelled", running };
    const entry = await attempt(true);
    if (!entry) throw new KeitoError("unexpected_response", "Keito did not return the started timer.");
    return { status: "started", entry, replaced: running };
  }
}

/**
 * Keito accepts a task that is not assigned to the project (observed live), so check before reusing
 * a saved project/task pair, e.g. from a favorite or a past entry, whose task may since have been
 * removed from the project.
 */
export async function assertTaskOnProject(
  api: KeitoApi,
  pair: { projectId: string; projectName: string; taskId: string; taskName: string },
  fix: string,
): Promise<void> {
  const tasks = await api.listProjectTasks(pair.projectId);
  if (!tasks.some((t) => t.id === pair.taskId)) {
    throw new KeitoError("validation", `“${pair.taskName}” is no longer assigned to ${pair.projectName}. ${fix}`);
  }
}

export interface StartTimerInput {
  projectId: string;
  taskId: string;
  spentDate: string;
  notes?: string;
  startedTime?: string;
  externalReference?: ExternalReference;
}

/** Start a new running timer. A conflicting timer is only replaced after confirmation. */
export function startTimer(ctx: WorkflowContext, input: StartTimerInput): Promise<StartResult> {
  return withConflictResolution(ctx, (replaceRunning) => {
    const body: TimeEntryCreateBody = {
      project_id: input.projectId,
      task_id: input.taskId,
      spent_date: input.spentDate,
      is_running: true,
      source: "api",
    };
    if (replaceRunning) body.replace_running = true;
    if (input.notes) body.notes = input.notes;
    if (input.startedTime) body.started_time = input.startedTime;
    const reference = externalReferenceInput(input.externalReference);
    if (reference) body.external_reference = reference;
    return ctx.api.createTimeEntry(body, ctx.lookup);
  });
}

/** Restart a stopped entry as the active timer. */
export function restartEntry(ctx: WorkflowContext, entry: TimeEntry): Promise<StartResult> {
  const { canRestart, reason } = entryEditability(entry);
  if (!canRestart) return Promise.reject(new KeitoError("locked", reason ?? "This entry cannot be restarted."));
  if (entry.isRunning) return Promise.resolve({ status: "started", entry });
  return withConflictResolution(ctx, (replaceRunning) =>
    ctx.api.restartTimeEntry(entry.id, { replaceRunning }, ctx.lookup),
  );
}

/** Stop every running timer for the user (Keito allows one). Returns the stopped entries. */
export async function stopRunningTimers(ctx: WorkflowContext): Promise<TimeEntry[]> {
  const running = await ctx.api.listRunningEntries(ctx.userId, ctx.lookup);
  const stopped: TimeEntry[] = [];
  for (const entry of running) {
    stopped.push((await ctx.api.stopTimeEntry(entry.id, ctx.lookup)) ?? { ...entry, isRunning: false });
  }
  return stopped;
}

export type ToggleResult =
  | { action: "stopped"; entry: TimeEntry }
  | { action: "restarted"; entry: TimeEntry }
  | { action: "none"; reason: string };

function byMostRecentUpdate(a: TimeEntry, b: TimeEntry): number {
  return Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? "") || 0;
}

/**
 * Stop the running timer, or restart the most recently updated editable entry from `today`.
 * Never replaces a timer: if one started elsewhere meanwhile, the conflict error is returned.
 */
export async function toggleTimer(ctx: WorkflowContext, today: string): Promise<ToggleResult> {
  const stopped = await stopRunningTimers({ ...ctx, confirmReplace: undefined });
  if (stopped.length > 0) return { action: "stopped", entry: stopped[0] };

  const entries = await ctx.api.listTimeEntries({ userId: ctx.userId, from: today, to: today }, ctx.lookup);
  const candidate = entries.filter((e) => entryEditability(e).canRestart).sort(byMostRecentUpdate)[0];
  if (!candidate) {
    return {
      action: "none",
      reason: entries.length ? "Today's entries are locked or approved." : "No time entries today.",
    };
  }
  const result = await restartEntry({ ...ctx, confirmReplace: undefined }, candidate);
  if (result.status !== "started") return { action: "none", reason: "Timer was not restarted." };
  return { action: "restarted", entry: result.entry };
}

export type EntryMode = "duration" | "start_end";

export interface EntryFormValues {
  projectId?: string | null;
  taskId?: string | null;
  spentDate: string;
  notes?: string;
  duration?: string;
  startTime?: string;
  endTime?: string;
}

export type EntryPlan =
  | { kind: "timer"; input: StartTimerInput }
  | { kind: "create"; body: TimeEntryCreateBody }
  | { kind: "update"; id: string; body: TimeEntryUpdateBody }
  | { kind: "error"; field: EntryField; message: string };

export type EntryField = "project" | "task" | "notes" | "duration" | "startTime" | "endTime" | "form";

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10000) / 10000;
}

/**
 * Turn form input into one Keito request. A blank duration (or blank end time) starts a timer;
 * edits only send fields that changed, and never send duration fields for a running timer.
 */
export function planEntry(
  values: EntryFormValues,
  options: {
    mode: EntryMode;
    existing?: TimeEntry;
    externalReference?: ExternalReference;
    /** Workspace settings reported by GET /users/me. */
    requireNotes?: boolean;
    allowPastTimerStarts?: boolean;
  },
): EntryPlan {
  const { mode, existing } = options;
  if (!values.projectId) return { kind: "error", field: "project", message: "Choose a project." };
  if (!values.taskId) return { kind: "error", field: "task", message: "Choose a task for the selected project." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.spentDate)) return { kind: "error", field: "form", message: "Choose a date." };

  if (existing) {
    const editability = entryEditability(existing);
    if (!editability.canEdit)
      return { kind: "error", field: "form", message: editability.reason ?? "Entry is locked." };
  }

  let hours: number | undefined;
  let startedTime: string | undefined;
  let endedTime: string | undefined;

  if (mode === "duration") {
    const raw = values.duration?.trim();
    if (raw) {
      const parsed = parseDuration(raw, undefined);
      if (!parsed)
        return { kind: "error", field: "duration", message: "Enter a duration such as 1:30, 1.5, or 1h30m." };
      hours = minutesToHours(Math.round(parsed.asMinutes()));
    }
  } else {
    if (values.startTime?.trim()) {
      startedTime = parseClockTime(values.startTime) ?? undefined;
      if (!startedTime)
        return { kind: "error", field: "startTime", message: "Enter a start time such as 09:30 or 9:30am." };
    }
    if (values.endTime?.trim()) {
      endedTime = parseClockTime(values.endTime) ?? undefined;
      if (!endedTime) return { kind: "error", field: "endTime", message: "Enter an end time such as 17:00 or 5pm." };
      if (!startedTime)
        return { kind: "error", field: "startTime", message: "Enter a start time to log a completed entry." };
      if (endedTime <= startedTime)
        return { kind: "error", field: "endTime", message: "End time must be after the start time." };
    }
  }

  const notes = values.notes ?? "";
  if (options.requireNotes && !notes.trim()) {
    return { kind: "error", field: "notes", message: "Your Keito workspace requires notes on time entries." };
  }

  if (existing) {
    const body: TimeEntryUpdateBody = {};
    if (values.projectId !== existing.projectId) body.project_id = values.projectId;
    if (values.taskId !== existing.taskId) body.task_id = values.taskId;
    if (values.spentDate !== existing.spentDate) body.spent_date = values.spentDate;
    if (notes !== existing.notes) body.notes = notes;
    if (!existing.isRunning) {
      if (hours !== undefined && Math.abs(hours - existing.hours) >= 1 / 120) body.hours = hours;
      if (startedTime && startedTime !== existing.startedTime) body.started_time = startedTime;
      if (endedTime && endedTime !== existing.endedTime) body.ended_time = endedTime;
    }
    if (Object.keys(body).length === 0) return { kind: "error", field: "form", message: "No changes to save." };
    return { kind: "update", id: existing.id, body };
  }

  const reference = externalReferenceInput(options.externalReference);
  const isTimer = mode === "duration" ? hours === undefined : endedTime === undefined;
  if (isTimer && startedTime && options.allowPastTimerStarts === false) {
    return {
      kind: "error",
      field: "startTime",
      message: "Your Keito workspace does not allow past timer starts. Leave Start Time blank to start now.",
    };
  }
  if (isTimer) {
    return {
      kind: "timer",
      input: {
        projectId: values.projectId,
        taskId: values.taskId,
        spentDate: values.spentDate,
        notes: notes || undefined,
        startedTime,
        externalReference: options.externalReference,
      },
    };
  }
  const body: TimeEntryCreateBody = {
    project_id: values.projectId,
    task_id: values.taskId,
    spent_date: values.spentDate,
    source: "api",
  };
  if (hours !== undefined) body.hours = hours;
  if (startedTime) body.started_time = startedTime;
  if (endedTime) body.ended_time = endedTime;
  if (notes) body.notes = notes;
  if (reference) body.external_reference = reference;
  return { kind: "create", body };
}
