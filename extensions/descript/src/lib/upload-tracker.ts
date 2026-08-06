import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { LocalStorage, environment } from "@raycast/api";

import { descript } from "./client";

const STORAGE_KEY = "descript:uploads:v1";
// Earlier versions appended dismissed jobIds to this key but never read it
// back, so it only grew. Removed; cleaned up lazily in `dismissUpload`.
const LEGACY_DISMISSED_KEY = "descript:uploads:dismissed:v1";

// Status files live in the extension's support directory (durable across
// reboots and scoped per-extension by Raycast). Previously this was `tmpdir`,
// which macOS may purge while a long upload is still in flight.
export const UPLOAD_ROOT = join(environment.supportPath, "uploads");

// Terminal records (completed or failed uploads) are auto-pruned 7 days
// after they finished. The LocalStorage entry and the on-disk job dir
// (status files + any siblings) are both removed in one pass during
// `listUploads()`. The user can still dismiss earlier via the menu-bar
// action; this is just the safety net for records they never got around
// to dismissing.
const TERMINAL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// A file still "pending"/"uploading" after this long is a ghost: the curl
// process died without writing a terminal status (reboot, kill -9, purged
// support dir). curl itself gives up after --max-time 7200 (2h), so 3h
// leaves ample margin. Stale files are coerced to "failed" and the fixed
// status is written back to disk so the record becomes dismissible and
// eligible for the 7-day prune.
const STALE_UPLOAD_TIMEOUT_MS = 3 * 60 * 60 * 1000;

export type UploadFileStatus = "pending" | "uploading" | "done" | "failed";

export type UploadFileEntry = {
  fileName: string;
  filePath: string;
  fileSize: number;
  statusFilePath: string;
  /** Process-group id of the detached uploader (bash + curl). */
  pid?: number;
};

export type UploadRecord = {
  id: string;
  jobId: string;
  projectId?: string;
  projectUrl?: string;
  projectName?: string;
  isExistingProject: boolean;
  startedAt: string;
  files: UploadFileEntry[];
};

export type UploadStatusPayload = {
  status: UploadFileStatus;
  httpCode?: number;
  curlExit?: number;
  fileSize?: number;
  startedAt?: number;
  finishedAt?: number;
};

export type EnrichedUploadFile = UploadFileEntry & {
  status: UploadFileStatus;
  httpCode?: number;
  curlExit?: number;
  finishedAt?: number;
};

export type UploadAggregateState = "pending" | "uploading" | "completed" | "failed";

export type EnrichedUploadRecord = Omit<UploadRecord, "files"> & {
  files: EnrichedUploadFile[];
  aggregate: UploadAggregateState;
  finishedAt?: number;
};

export function statusFilePathFor(jobId: string, fileName: string): string {
  const safe = sanitizeFileName(fileName);
  // Sanitizing can collide (e.g. "a b.mp4" and "a_b.mp4" both become
  // "a_b.mp4"), which would make two uploads share one status file. A short
  // hash of the *original* name keeps the path unique while staying a
  // deterministic function of (jobId, fileName), which callers rely on.
  const hash = createHash("sha1").update(fileName).digest("hex").slice(0, 8);
  return join(UPLOAD_ROOT, jobId, `${safe}.${hash}.status.json`);
}

export function uploadJobDir(jobId: string): string {
  return join(UPLOAD_ROOT, jobId);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_");
}

export async function loadUploadRecords(): Promise<UploadRecord[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UploadRecord[]) : [];
  } catch {
    return [];
  }
}

async function saveUploadRecords(records: UploadRecord[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function addUploadRecord(record: UploadRecord): Promise<void> {
  const records = await loadUploadRecords();
  const filtered = records.filter((r) => r.jobId !== record.jobId);
  filtered.unshift(record);
  await saveUploadRecords(filtered);
}

export async function removeUploadRecord(jobId: string): Promise<void> {
  const records = await loadUploadRecords();
  await saveUploadRecords(records.filter((r) => r.jobId !== jobId));
}

async function readStatusFile(path: string): Promise<UploadStatusPayload | null> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    // File doesn't exist (bash hasn't written it yet, or it was cleaned
    // up) — caller will treat the file as `"pending"`.
    return null;
  }

  try {
    return JSON.parse(text) as UploadStatusPayload;
  } catch {
    // Legacy status files written before the bash `10#$HTTP_CODE` fix
    // could contain `"httpCode":000`, which isn't valid JSON. Without
    // this recovery they'd be misread as "pending" forever.
    return recoverTerminalStatus(text);
  }
}

/**
 * Best-effort recovery from a malformed status payload. We only need to
 * know whether the upload reached a terminal state — the exact
 * `httpCode` / `curlExit` are nice-to-haves for the detail view.
 */
function recoverTerminalStatus(rawText: string): UploadStatusPayload | null {
  if (rawText.includes('"status":"failed"')) {
    return {
      status: "failed",
      httpCode: extractIntField(rawText, "httpCode"),
      curlExit: extractIntField(rawText, "curlExit"),
      finishedAt: extractIntField(rawText, "finishedAt"),
    };
  }
  if (rawText.includes('"status":"done"')) {
    return {
      status: "done",
      httpCode: extractIntField(rawText, "httpCode"),
      finishedAt: extractIntField(rawText, "finishedAt"),
    };
  }
  return null;
}

function extractIntField(rawText: string, name: string): number | undefined {
  const match = rawText.match(new RegExp(`"${name}"\\s*:\\s*(\\d+)`));
  return match ? Number(match[1]) : undefined;
}

export function aggregateState(files: EnrichedUploadFile[]): UploadAggregateState {
  if (files.length === 0) return "pending";
  if (files.some((f) => f.status === "failed")) return "failed";
  if (files.every((f) => f.status === "done")) return "completed";
  if (files.some((f) => f.status === "uploading")) return "uploading";
  return "pending";
}

/**
 * Writes a terminal "failed" status file for an upload entry. Used when the
 * failure is detected from the extension side (stale ghost upload, spawn
 * failure) rather than by the detached bash script itself.
 */
export async function writeFailedStatus(statusFilePath: string, opts?: { curlExit?: number }): Promise<void> {
  const payload: UploadStatusPayload = {
    status: "failed",
    curlExit: opts?.curlExit,
    finishedAt: Math.floor(Date.now() / 1000),
  };
  try {
    await writeFile(statusFilePath, JSON.stringify(payload), "utf8");
  } catch {
    // Non-fatal — the in-memory coercion still applies for this listing,
    // and a later pass will retry the write.
  }
}

function fileStartMs(record: UploadRecord, status: UploadStatusPayload | null): number | undefined {
  if (status?.startedAt) return status.startedAt * 1000;
  const started = Date.parse(record.startedAt);
  return Number.isFinite(started) ? started : undefined;
}

export async function enrichRecord(record: UploadRecord): Promise<EnrichedUploadRecord> {
  const enrichedFiles: EnrichedUploadFile[] = await Promise.all(
    record.files.map(async (entry) => {
      const status = await readStatusFile(entry.statusFilePath);
      const state = status?.status ?? "pending";

      if (state === "pending" || state === "uploading") {
        const startMs = fileStartMs(record, status);
        if (startMs !== undefined && Date.now() - startMs > STALE_UPLOAD_TIMEOUT_MS) {
          const finishedAt = Math.floor(Date.now() / 1000);
          await writeFailedStatus(entry.statusFilePath);
          return { ...entry, status: "failed" as const, finishedAt };
        }
      }

      return {
        ...entry,
        status: state,
        httpCode: status?.httpCode,
        curlExit: status?.curlExit,
        finishedAt: status?.finishedAt,
      };
    }),
  );
  const aggregate = aggregateState(enrichedFiles);
  const finishedAt =
    aggregate === "completed" || aggregate === "failed"
      ? Math.max(...enrichedFiles.map((f) => f.finishedAt ?? 0))
      : undefined;
  return { ...record, files: enrichedFiles, aggregate, finishedAt: finishedAt || undefined };
}

export async function listUploads(): Promise<EnrichedUploadRecord[]> {
  const records = await loadUploadRecords();
  const enriched = await Promise.all(records.map(enrichRecord));
  return pruneOldTerminalRecords(enriched);
}

/**
 * Remove records that finished more than {@link TERMINAL_RETENTION_MS}
 * ago. Updates LocalStorage and best-effort cleans up the on-disk job
 * dir. In-flight records are never touched.
 */
async function pruneOldTerminalRecords(enriched: EnrichedUploadRecord[]): Promise<EnrichedUploadRecord[]> {
  const now = Date.now();
  const kept: EnrichedUploadRecord[] = [];
  const prunedIds: string[] = [];

  for (const record of enriched) {
    const isTerminal = record.aggregate === "completed" || record.aggregate === "failed";
    if (isTerminal && recordAgeMs(record, now) > TERMINAL_RETENTION_MS) {
      prunedIds.push(record.jobId);
    } else {
      kept.push(record);
    }
  }

  if (prunedIds.length === 0) return enriched;

  const remaining = (await loadUploadRecords()).filter((r) => !prunedIds.includes(r.jobId));
  await saveUploadRecords(remaining);

  await Promise.all(
    prunedIds.map(async (jobId) => {
      try {
        await rm(uploadJobDir(jobId), { recursive: true, force: true });
      } catch {
        // Non-fatal — the LocalStorage record is already gone; orphan
        // status files on disk will be re-attempted on a future prune
        // or are harmless.
      }
    }),
  );

  return kept;
}

function recordAgeMs(record: EnrichedUploadRecord, nowMs: number): number {
  // `finishedAt` is unix seconds (written by `date +%s` in the bash
  // script). Fall back to the record's ISO `startedAt` for any record
  // where the status payload didn't carry a `finishedAt` — that way an
  // ancient record without proper finish time still ages out.
  if (record.finishedAt) return nowMs - record.finishedAt * 1000;
  if (record.startedAt) {
    const started = Date.parse(record.startedAt);
    if (Number.isFinite(started)) return nowMs - started;
  }
  return 0;
}

/**
 * Stops an in-flight upload: kills the detached uploader processes and
 * writes terminal "failed" statuses (curlExit -1 marks a user stop) so the
 * record immediately reads as finished everywhere. For new-project imports
 * the server-side import job is also cancelled best-effort — an existing
 * project may have sibling files still uploading, so its job is left alone.
 */
export async function stopUpload(record: EnrichedUploadRecord): Promise<void> {
  const active = record.files.filter((f) => f.status === "pending" || f.status === "uploading");

  for (const file of active) {
    if (file.pid) {
      try {
        // Negative pid targets the whole process group (bash and its curl
        // child — `detached: true` made the bash pid the group leader).
        process.kill(-file.pid, "SIGTERM");
      } catch {
        try {
          process.kill(file.pid, "SIGTERM");
        } catch {
          // Process already gone — nothing to stop.
        }
      }
    }
  }

  await Promise.all(active.map((file) => writeFailedStatus(file.statusFilePath, { curlExit: -1 })));

  if (!record.isExistingProject) {
    try {
      await descript.cancelJob(record.jobId);
    } catch {
      // Best-effort — the import job will fail on its own once the
      // signed URLs expire without receiving bytes.
    }
  }
}

/**
 * Dismisses a completed/failed record the user has acknowledged: drops the
 * LocalStorage entry and cleans up the on-disk status files right away
 * instead of leaving them for the 7-day prune.
 */
export async function dismissUpload(jobId: string): Promise<void> {
  await removeUploadRecord(jobId);
  try {
    await rm(uploadJobDir(jobId), { recursive: true, force: true });
  } catch {
    // Non-fatal — orphan status files are swept by a later prune.
  }
  // One-time cleanup of the legacy write-only dismissed-ids store.
  await LocalStorage.removeItem(LEGACY_DISMISSED_KEY);
}

export async function clearAllUploads(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
