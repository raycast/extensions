import { environment, LocalStorage } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { lock } from "proper-lockfile";
import { validateId } from "./client";

const PREFIX = "flowspeech.recovery.";
export const MAX_RECOVERY_RECORDS = 200;
export const MAX_COMPLETED_RECORDS = 50;
export interface RecoveryRecord {
  requestId: string;
  jobId?: string;
  createdAt: string;
  state: "pending" | "completed" | "interrupted";
}

export async function saveRecovery(record: RecoveryRecord): Promise<void> {
  return writeRecovery(record, false);
}

export async function updateRecovery(record: RecoveryRecord): Promise<void> {
  return writeRecovery(record, true);
}

async function writeRecovery(record: RecoveryRecord, existingOnly: boolean): Promise<void> {
  const requestId = validateId(record.requestId);
  if (!Number.isFinite(Date.parse(record.createdAt)) || !["pending", "completed", "interrupted"].includes(record.state))
    throw new Error("Invalid recovery record");
  await withStoreLock(async (check) => {
    const records = await recoveryRecords();
    check();
    const existing = records.some((value) => value.requestId === requestId);
    // Forgetting wins over later status updates, including their retention cleanup.
    if (existingOnly && !existing) return;
    // Completed means playback finished. Pending and interrupted IDs are never pruned.
    const completed = records.filter((value) => value.state === "completed" && value.requestId !== requestId);
    const keep = Math.min(
      MAX_COMPLETED_RECORDS - (record.state === "completed" ? 1 : 0),
      Math.max(
        0,
        MAX_RECOVERY_RECORDS - records.filter((value) => value.state !== "completed").length - (existing ? 0 : 1),
      ),
    );
    for (const old of completed.slice(keep)) {
      check();
      await LocalStorage.removeItem(PREFIX + old.requestId);
    }
    check();
    if (!existing && records.length - completed.slice(keep).length >= MAX_RECOVERY_RECORDS)
      throw new Error(
        "Recovery storage is full. Review saved IDs in Show Speech Recovery before starting another request.",
      );
    await LocalStorage.setItem(
      PREFIX + requestId,
      JSON.stringify({
        requestId,
        createdAt: record.createdAt,
        state: record.state,
        ...(record.jobId ? { jobId: validateId(record.jobId) } : {}),
      }),
    );
    check();
  });
}

async function withStoreLock<T>(operation: (check: () => void) => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  let compromised: Error | undefined;
  const release = await lock(path.join(environment.supportPath, "recovery-store"), {
    realpath: false,
    stale: 30_000,
    update: 1000,
    retries: { retries: 20, minTimeout: 25, maxTimeout: 100, factor: 1 },
    onCompromised: (error) => {
      compromised = error;
    },
  });
  const check = () => {
    if (compromised) throw new Error("Recovery storage lock was interrupted; retry later");
  };
  try {
    return await operation(check);
  } finally {
    await release();
  }
}

export async function clearCompletedRecovery(): Promise<void> {
  await withStoreLock(async (check) => {
    for (const record of await recoveryRecords()) {
      if (record.state !== "completed") continue;
      check();
      await LocalStorage.removeItem(PREFIX + record.requestId);
    }
  });
}

// Only called after per-record confirmation. Bulk cleanup cannot remove unresolved IDs.
export async function forgetRecovery(requestId: string): Promise<void> {
  const id = validateId(requestId);
  await withStoreLock(async (check) => {
    check();
    await LocalStorage.removeItem(PREFIX + id);
  });
}

export async function recoveryRecords(): Promise<RecoveryRecord[]> {
  const items = await LocalStorage.allItems();
  const records: RecoveryRecord[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(PREFIX) || typeof value !== "string") continue;
    try {
      const record = JSON.parse(value);
      const requestId = validateId(record.requestId);
      if (
        key !== PREFIX + requestId ||
        typeof record.createdAt !== "string" ||
        !Number.isFinite(Date.parse(record.createdAt)) ||
        !["pending", "completed", "interrupted"].includes(record.state)
      )
        continue;
      records.push({
        requestId,
        createdAt: record.createdAt,
        state: record.state,
        ...(record.jobId ? { jobId: validateId(record.jobId) } : {}),
      });
    } catch {
      /* Ignore malformed unrelated or older local records. */
    }
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recoveryText(record: RecoveryRecord): string {
  return `requestId=${record.requestId}${record.jobId ? `; jobId=${record.jobId}` : ""}`;
}

export function errorJobId(error: unknown): string | undefined {
  if (!(error instanceof Error)) return;
  const match = /(?:^|;\s*)jobId=([a-f0-9-]+)(?:;|$)/i.exec(error.message);
  if (!match) return;
  try {
    return validateId(match[1]);
  } catch {
    return;
  }
}

export function recoveryExport(records: RecoveryRecord[]): string {
  return records.map((record) => `${record.createdAt} ${record.state}: ${recoveryText(record)}`).join("\n");
}
