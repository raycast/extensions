import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { TimeEntry } from "./types";

export const STATUS_FILE_NAME = "currentTimer.json";
export const STATUS_FILE_SCHEMA = "keito-raycast/current-timer@1";

/**
 * Stable, documented payload for automation tools. It is built from the normalized entry rather
 * than the raw API response, and contains no credentials.
 */
export function statusPayload(entry: TimeEntry, companyId: string) {
  return {
    schema: STATUS_FILE_SCHEMA,
    company_id: companyId,
    id: entry.id,
    is_running: entry.isRunning,
    spent_date: entry.spentDate,
    hours: entry.hours,
    timer_started_at: entry.timerStartedAt ?? null,
    started_time: entry.startedTime ?? null,
    notes: entry.notes,
    project: { id: entry.projectId, name: entry.projectName, code: entry.projectCode ?? null },
    task: { id: entry.taskId, name: entry.taskName },
    client: entry.clientId || entry.clientName ? { id: entry.clientId ?? null, name: entry.clientName ?? null } : null,
    approval_status: entry.approvalStatus ?? null,
    updated_at: entry.updatedAt ?? null,
  };
}

/** Write currentTimer.json when a timer runs, remove it otherwise. Writes are atomic. */
export function syncStatusFile(folder: string | undefined, entry: TimeEntry | null, companyId: string): void {
  if (!folder) return;
  const file = join(folder, STATUS_FILE_NAME);
  if (!entry) {
    if (existsSync(file)) rmSync(file);
    return;
  }
  mkdirSync(folder, { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(statusPayload(entry, companyId), null, 2));
  renameSync(temp, file);
}
